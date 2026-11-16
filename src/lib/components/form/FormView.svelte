<script lang="ts">
  // What a visitor sees once a form link has opened: the owner's name and
  // message, the questions, and the confirmation. Answers and files are
  // encrypted here before anything is sent. The editor shows the same
  // component as a preview.

  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import * as Frame from "$lib/components/frame";
  import {
    ANSWER_LONG_MAX,
    ANSWER_SHORT_MAX,
    answerText,
    collectAnswers,
    missingAnswers,
    type AnswerDraft,
    type FormAnswer,
  } from "$lib/form/answers";
  import type { Question } from "$lib/form/questions";
  import { HTML_LANG, type Locale } from "$lib/i18n/locale";
  import { depositStrings, formStrings } from "$lib/i18n/messages";
  import { DepositError, sendDeposit, type OpenedPortal } from "$lib/portal/deposit";
  import { hasClosed, logoSrc } from "$lib/portal/keys";
  import { buildReceiptText, depositReference } from "$lib/portal/receipt";
  import { saveTextFile } from "$lib/download/saveTextFile";
  import { holdWhileUploading } from "$lib/upload/keepAwake";
  import { cn, formatSize } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import IconPaperclipRegular from "phosphor-icons-svelte/IconPaperclipRegular.svelte";

  type Phase = "ready" | "sending" | "done";
  type RowStatus = "idle" | "uploading" | "complete" | "error";

  interface Row {
    file: File;
    questionId: string;
    status: RowStatus;
    percent: number;
  }

  interface Props {
    form: OpenedPortal;
    locale: Locale;
    /** Shows one state with nothing to send; the parent makes it inert. */
    preview?: "form" | "sent";
  }

  let { form, locale, preview }: Props = $props();

  const t = $derived(formStrings[locale]);
  const d = $derived(depositStrings[locale]);

  const closingDay = $derived(
    form.closesAt
      ? new Intl.DateTimeFormat(HTML_LANG[locale], { dateStyle: "long" }).format(new Date(form.closesAt))
      : null,
  );
  const closedByDate = $derived(hasClosed(form.closesAt));

  let live = $state<Phase>("ready");
  const phase = $derived<Phase>(preview === "sent" ? "done" : preview === "form" ? "ready" : live);

  let draft = $state<AnswerDraft>({});
  let rows = $state<Row[]>([]);
  let showMissing = $state(false);
  let stalled = $state(false);
  let failure = $state<DepositError | "failed" | null>(null);
  let sent = $state<{ reference: string; at: Date; answers: FormAnswer[]; files: { name: string; size: string }[] } | null>(
    null,
  );
  let controller: AbortController | null = null;

  $effect(() => {
    if (live !== "sending") return;
    return holdWhileUploading();
  });

  /** What has been filled in, with each file question answered by the names of its files. */
  const answered = $derived.by<AnswerDraft>(() => {
    const out: AnswerDraft = { ...draft };
    for (const q of form.questions) {
      if (q.type === "file") out[q.id] = rows.filter((r) => r.questionId === q.id).map((r) => r.file.name);
    }
    return out;
  });
  const missing = $derived(missingAnswers(form.questions, answered));
  const missingIds = $derived(new Set(missing.map((q) => q.id)));

  const errorMessage = $derived.by(() => {
    if (!failure) return null;
    if (failure === "failed") return t.failed;
    const name = failure.fileName ?? "";
    switch (failure.code) {
      case "blocked_script":
        return d.errors.blockedScript(name);
      case "blocked_executable":
        return d.errors.blockedExecutable(name);
      case "not_accepting":
        return t.notAccepting;
      case "closed":
        return t.closed;
      case "portal_full":
        return d.errors.portalFull;
      case "file_too_large":
        return name ? d.errors.fileTooLarge(name) : d.errors.transferTooLarge;
      case "transfer_too_large":
        return d.errors.transferTooLarge;
      case "rate_limited":
        return d.errors.rateLimited;
      case "gone":
        return t.gone;
      default:
        return t.failed;
    }
  });

  // One hidden picker serves every file question; this remembers which.
  let fileInput = $state<HTMLInputElement | null>(null);
  let pickingFor: string | null = null;

  function pickFor(questionId: string) {
    pickingFor = questionId;
    fileInput?.click();
  }

  function addPicked(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files && input.files.length > 0 && pickingFor) {
      const questionId = pickingFor;
      failure = null;
      rows = [
        ...rows,
        ...Array.from(input.files, (file) => ({ file, questionId, status: "idle" as RowStatus, percent: 0 })),
      ];
    }
    input.value = "";
    pickingFor = null;
  }

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
  }

  function toggleChoice(q: Question, option: string, on: boolean) {
    const current = Array.isArray(draft[q.id]) ? (draft[q.id] as string[]) : [];
    const next = on ? [...current, option] : current.filter((o) => o !== option);
    // Kept in the order the owner listed them.
    draft[q.id] = (q.options ?? []).filter((o) => next.includes(o));
  }

  async function send() {
    if (preview || live !== "ready") return;
    if (missing.length > 0) {
      showMissing = true;
      document.getElementById(`q-${missing[0].id}`)?.focus();
      return;
    }
    failure = null;
    rows = rows.map((r) => ({ ...r, status: "idle", percent: 0 }));
    live = "sending";
    controller = new AbortController();
    stalled = false;
    const answers = collectAnswers(form.questions, answered);
    try {
      const result = await sendDeposit(
        form,
        rows.map((r) => ({ file: r.file, itemId: r.questionId })),
        "",
        {
          answers,
          signal: controller.signal,
          onProgress: (index, status, percent, isStalled) => {
            rows[index].status = status;
            rows[index].percent = percent;
            stalled = isStalled === true;
          },
        },
      );
      sent = {
        reference: await depositReference(result.transferId),
        at: result.sentAt,
        answers,
        files: rows.map((r) => ({ name: r.file.name, size: formatSize(r.file.size) })),
      };
      live = "done";
    } catch (err) {
      live = "ready";
      if ((err as DOMException)?.name === "AbortError") return;
      failure = err instanceof DepositError ? err : "failed";
    } finally {
      controller = null;
    }
  }

  function saveConfirmation() {
    if (!sent) return;
    saveTextFile(
      d.confirmationFilename(sent.reference),
      buildReceiptText({
        kind: "sent",
        locale,
        portalTitle: form.title,
        reference: sent.reference,
        at: sent.at,
        note: null,
        answers: sent.answers.map((a) => ({ label: a.label, value: answerText(a, { yes: t.yes, no: t.no }) })),
        files: sent.files,
      }),
    );
  }

  function again() {
    sent = null;
    draft = {};
    rows = [];
    showMissing = false;
    failure = null;
    live = "ready";
  }

  const shownReference = $derived(preview === "sent" ? "7F3A-91C2" : (sent?.reference ?? null));
  const disabled = $derived(phase === "sending");
  const choiceClass =
    "size-4 shrink-0 accent-primary cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
</script>

<header class="mb-8 space-y-2">
  {#if form.logo}
    <img src={logoSrc(form.logo)} alt="" class="mb-5 max-h-14 max-w-[220px] object-contain object-left" />
  {/if}
  <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">{form.title}</h1>
  {#if form.message && phase !== "done"}
    <p class="pt-1 text-foreground whitespace-pre-line break-words">{form.message}</p>
  {/if}
  {#if closingDay && !closedByDate && form.accepting && phase !== "done"}
    <p class="text-sm text-muted-foreground">{t.openUntil(closingDay)}</p>
  {/if}
</header>

{#snippet heading(q: Question, n: number, asLegend: boolean)}
  {@const content = `${q.label}`}
  {#if asLegend}
    <legend id="q-{q.id}-label" class="text-sm font-medium text-foreground break-words">
      <span class="text-muted-foreground tabular-nums">{n}.</span>
      {content}
      {#if q.required}<span class="text-destructive-foreground" aria-label={t.required}>*</span>{/if}
    </legend>
  {:else}
    <label id="q-{q.id}-label" for="q-{q.id}" class="block text-sm font-medium text-foreground break-words">
      <span class="text-muted-foreground tabular-nums">{n}.</span>
      {content}
      {#if q.required}<span class="text-destructive-foreground" aria-label={t.required}>*</span>{/if}
    </label>
  {/if}
  {#if q.hint}
    <p id="q-{q.id}-hint" class="text-sm text-muted-foreground whitespace-pre-line break-words">{q.hint}</p>
  {/if}
{/snippet}

{#snippet problem(q: Question)}
  {#if showMissing && missingIds.has(q.id)}
    <p id="q-{q.id}-error" role="alert" class="text-xs text-destructive-foreground">{t.missingOne}</p>
  {/if}
{/snippet}

{#if phase === "done"}
  <EmptyState title={t.sentTitle} announce>
    {#snippet icon()}
      <div class="flex size-10 items-center justify-center rounded-full bg-success/15 text-success-foreground">
        <IconCheckRegular class="size-5" />
      </div>
    {/snippet}
    <p>{t.sentBody(form.title)}</p>
    {#if form.thanks}
      <p class="text-foreground whitespace-pre-line break-words">{form.thanks}</p>
    {/if}
    {#if shownReference}
      <p>{d.reference}: <span class="font-mono text-foreground">{shownReference}</span></p>
    {/if}
    {#snippet actions()}
      {#if shownReference}
        <Button fullWidth={false} onclick={saveConfirmation}>{d.saveConfirmation}</Button>
      {/if}
      <Button variant="secondary" fullWidth={false} onclick={again}>{t.again}</Button>
    {/snippet}
  </EmptyState>
{:else if closedByDate && closingDay}
  <EmptyState title={t.closedOnTitle}>
    <p>{t.closedOnBody(form.title, closingDay)}</p>
  </EmptyState>
{:else if !form.accepting}
  <EmptyState title={t.closedTitle}>
    <p>{t.closedBody(form.title)}</p>
  </EmptyState>
{:else}
  <input bind:this={fileInput} type="file" multiple class="hidden" onchange={addPicked} {disabled} />
  <Frame.Root>
    <Frame.Panel>
      <form
        class="space-y-7"
        novalidate
        onsubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {#each form.questions as q, i (q.id)}
          {@const invalid = showMissing && missingIds.has(q.id)}
          {@const describedBy = [q.hint ? `q-${q.id}-hint` : "", invalid ? `q-${q.id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined}
          {#if q.type === "short" || q.type === "long" || q.type === "date"}
            <div class="space-y-1.5">
              {@render heading(q, i + 1, false)}
              {#if q.type === "long"}
                <Textarea
                  id="q-{q.id}"
                  rows={4}
                  maxlength={ANSWER_LONG_MAX}
                  value={(draft[q.id] as string | undefined) ?? ""}
                  oninput={(e) => (draft[q.id] = (e.currentTarget as HTMLTextAreaElement).value)}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  {disabled}
                />
              {:else}
                <TextInput
                  id="q-{q.id}"
                  type={q.type === "date" ? "date" : "text"}
                  maxlength={q.type === "short" ? ANSWER_SHORT_MAX : undefined}
                  value={(draft[q.id] as string | undefined) ?? ""}
                  oninput={(e) => (draft[q.id] = (e.currentTarget as HTMLInputElement).value)}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  class={q.type === "date" ? "max-w-[14rem]" : undefined}
                  {disabled}
                />
              {/if}
              {@render problem(q)}
            </div>
          {:else if q.type === "choice" || q.type === "choices" || q.type === "yesno"}
            {@const options =
              q.type === "yesno"
                ? [
                    { value: true, label: t.yes },
                    { value: false, label: t.no },
                  ]
                : (q.options ?? []).map((o) => ({ value: o, label: o }))}
            <fieldset class="space-y-1.5" aria-describedby={describedBy}>
              {@render heading(q, i + 1, true)}
              <div class={cn("pt-1", q.type === "yesno" ? "flex gap-6" : "space-y-2")}>
                {#each options as option, j (String(option.value))}
                  {@const checked =
                    q.type === "choices"
                      ? Array.isArray(draft[q.id]) && (draft[q.id] as string[]).includes(option.value as string)
                      : draft[q.id] === option.value}
                  <label class="flex items-start gap-3 text-sm text-foreground cursor-pointer">
                    <input
                      id={j === 0 ? `q-${q.id}` : undefined}
                      type={q.type === "choices" ? "checkbox" : "radio"}
                      name="q-{q.id}"
                      {checked}
                      onchange={(e) => {
                        const on = (e.currentTarget as HTMLInputElement).checked;
                        if (q.type === "choices") toggleChoice(q, option.value as string, on);
                        else if (on) draft[q.id] = option.value;
                      }}
                      class={cn(choiceClass, "mt-0.5")}
                      {disabled}
                    />
                    <span class="break-words">{option.label}</span>
                  </label>
                {/each}
              </div>
              {@render problem(q)}
            </fieldset>
          {:else if q.type === "file"}
            {@const own = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.questionId === q.id)}
            <fieldset class="space-y-2" aria-describedby={describedBy}>
              {@render heading(q, i + 1, true)}
              {#if own.length > 0}
                <ul class="space-y-2">
                  {#each own as { row, index } (row.file)}
                    <li>
                      <FileRow
                        name={row.file.name}
                        size={formatSize(row.file.size)}
                        status={phase === "sending" && row.status === "idle" ? "uploading" : row.status}
                        kind="upload"
                        percent={row.percent}
                        onRemove={phase === "sending" ? undefined : () => removeRow(index)}
                        removeLabel={d.remove(row.file.name)}
                      />
                    </li>
                  {/each}
                </ul>
              {/if}
              <Button
                id="q-{q.id}"
                type="button"
                variant="secondary"
                fullWidth={false}
                onclick={() => pickFor(q.id)}
                {disabled}
              >
                <IconPaperclipRegular class="size-4" />
                {own.length > 0 ? t.addFiles : t.chooseFiles}
              </Button>
              {@render problem(q)}
            </fieldset>
          {/if}
        {/each}

        {#if showMissing && missing.length > 0}
          <Alert tone="warning">{t.missing(missing.length)}</Alert>
        {/if}
        {#if errorMessage}
          <Alert tone="destructive">{errorMessage}</Alert>
        {/if}
        {#if phase === "sending" && stalled}
          <Alert tone="warning">{d.reconnecting}</Alert>
        {/if}

        {#if phase === "sending"}
          <div class="flex flex-wrap items-center gap-3">
            <Button type="button" fullWidth={false} disabled>{t.sending}</Button>
            {#if rows.length > 0}
              <Button type="button" variant="ghost" fullWidth={false} onclick={() => controller?.abort()}>
                {d.cancel}
              </Button>
            {/if}
          </div>
        {:else}
          <Button type="submit" fullWidth={false}>{t.send}</Button>
        {/if}
      </form>
    </Frame.Panel>
  </Frame.Root>

  <p class="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
    <IconLockRegular class="size-4 shrink-0" />
    <span>
      {t.footnote(form.title)}
      <TextLink href="/security">{d.howItWorks}</TextLink>
    </span>
  </p>
{/if}
