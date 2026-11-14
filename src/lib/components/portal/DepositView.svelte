<script lang="ts">
  // What a visitor sees once a portal link has opened: the owner's name
  // and message, what is asked for, the upload box, and the confirmation.
  // The settings page shows the same component as a preview.

  import TextLink from "$lib/components/TextLink.svelte";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import ReturnsBlock from "$lib/components/portal/ReturnsBlock.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import * as Frame from "$lib/components/frame";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import {
    DEPOSIT_NOTE_MAX,
    DEPOSIT_ANSWER_MAX,
    DepositError,
    sendDeposit,
    type DepositAnswer,
    type OpenedPortal,
  } from "$lib/portal/deposit";
  import { HTML_LANG, type Locale } from "$lib/i18n/locale";
  import { hasClosed, logoSrc } from "$lib/portal/keys";
  import { depositStrings } from "$lib/i18n/messages";
  import { buildReceiptText, depositReference } from "$lib/portal/receipt";
  import { saveTextFile } from "$lib/download/saveTextFile";
  import { holdWhileUploading } from "$lib/upload/keepAwake";
  import { formatSize } from "$lib/utils";
  import IconCameraRegular from "phosphor-icons-svelte/IconCameraRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";

  type Phase = "ready" | "sending" | "done";
  type RowStatus = "idle" | "uploading" | "complete" | "error";

  interface Row {
    file: File;
    /** The requested item this file answers, when the portal asks for specific things. */
    itemId: string | null;
    status: RowStatus;
    percent: number;
  }

  interface Props {
    portal: OpenedPortal;
    locale: Locale;
    /** Shows one state with nothing to send; the parent makes it inert. */
    preview?: "form" | "sent";
  }

  let { portal, locale, preview }: Props = $props();

  const t = $derived(depositStrings[locale]);

  const closingDay = $derived(
    portal.closesAt
      ? new Intl.DateTimeFormat(HTML_LANG[locale], { dateStyle: "long" }).format(new Date(portal.closesAt))
      : null,
  );
  const closedByDate = $derived(hasClosed(portal.closesAt));

  let live = $state<Phase>("ready");
  const phase = $derived<Phase>(preview === "sent" ? "done" : preview === "form" ? "ready" : live);

  let rows = $state<Row[]>([]);
  let note = $state("");
  let answer = $state("");
  let answerMissing = $state(false);
  let stalled = $state(false);

  // A locked phone or a closed tab ends the upload; prevent the first, ask before the second.
  $effect(() => {
    if (live !== "sending") return;
    return holdWhileUploading();
  });
  let failure = $state<DepositError | "failed" | null>(null);
  // What the confirmation needs, kept after the files themselves are cleared.
  let sent = $state<{
    reference: string;
    at: Date;
    note: string | null;
    answer: DepositAnswer | null;
    files: { name: string; size: string }[];
  } | null>(null);
  let cameraInput = $state<HTMLInputElement | null>(null);
  let controller: AbortController | null = null;

  const totalBytes = $derived(rows.reduce((sum, r) => sum + r.file.size, 0));
  const sentCount = $derived(preview === "sent" ? 1 : rows.length);
  const shownReference = $derived(preview === "sent" ? "7F3A-91C2" : (sent?.reference ?? null));

  const errorMessage = $derived.by(() => {
    if (!failure) return null;
    if (failure === "failed") return t.errors.failed;
    const name = failure.fileName ?? "";
    switch (failure.code) {
      case "blocked_script":
        return t.errors.blockedScript(name);
      case "blocked_executable":
        return t.errors.blockedExecutable(name);
      case "not_accepting":
        return t.errors.notAccepting;
      case "closed":
        return t.errors.closed;
      case "portal_full":
        return t.errors.portalFull;
      case "file_too_large":
        return name ? t.errors.fileTooLarge(name) : t.errors.transferTooLarge;
      case "transfer_too_large":
        return t.errors.transferTooLarge;
      case "rate_limited":
        return t.errors.rateLimited;
      case "gone":
        return t.errors.gone;
      default:
        return t.errors.failed;
    }
  });

  function addFiles(files: File[], itemId: string | null = null) {
    failure = null;
    rows = [
      ...rows,
      ...files.map((file) => ({ file, itemId, status: "idle" as RowStatus, percent: 0 })),
    ];
  }

  // One hidden picker serves every checklist item; this remembers which.
  let itemInput = $state<HTMLInputElement | null>(null);
  let pickingFor: string | null = null;

  function pickFor(itemId: string) {
    pickingFor = itemId;
    itemInput?.click();
  }

  function addItemFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files && input.files.length > 0) addFiles(Array.from(input.files), pickingFor);
    input.value = "";
    pickingFor = null;
  }

  const checklist = $derived(portal.checklist);
  const providedIds = $derived(new Set(rows.map((r) => r.itemId).filter((id) => id !== null)));
  const missingItems = $derived(checklist.filter((item) => !providedIds.has(item.id)));
  const otherRows = $derived(
    rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.itemId === null || !checklist.some((i) => i.id === row.itemId)),
  );

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
  }

  async function send() {
    if (preview || rows.length === 0 || live !== "ready") return;
    if (portal.fieldLabel && answer.trim().length === 0) {
      answerMissing = true;
      document.getElementById("deposit-answer")?.focus();
      return;
    }
    failure = null;
    rows = rows.map((r) => ({ ...r, status: "idle", percent: 0 }));
    live = "sending";
    controller = new AbortController();
    stalled = false;
    const given =
      portal.fieldLabel && answer.trim() ? { label: portal.fieldLabel, value: answer.trim() } : null;
    try {
      const result = await sendDeposit(
        portal,
        rows.map((r) => ({ file: r.file, itemId: r.itemId })),
        note,
        {
          answer: given,
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
        note: note.trim() || null,
        answer: given,
        files: rows.map((row) => ({ name: row.file.name, size: formatSize(row.file.size) })),
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

  function addPhoto(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files && input.files.length > 0) addFiles(Array.from(input.files));
    input.value = "";
  }

  function saveConfirmation() {
    if (!sent) return;
    saveTextFile(
      t.confirmationFilename(sent.reference),
      buildReceiptText({
        kind: "sent",
        locale,
        portalTitle: portal.title,
        reference: sent.reference,
        at: sent.at,
        note: sent.note,
        answer: sent.answer,
        files: sent.files,
      }),
    );
  }

  // The answer stays: someone sending twice is still the same person.
  function sendMore() {
    sent = null;
    rows = [];
    note = "";
    failure = null;
    live = "ready";
  }
</script>

<header class="mb-8 space-y-2">
  {#if portal.logo}
    <img
      src={logoSrc(portal.logo)}
      alt=""
      class="mb-5 max-h-14 max-w-[220px] object-contain object-left"
    />
  {/if}
  <p class="text-sm text-muted-foreground">{t.sendTo}</p>
  <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
    {portal.title}
  </h1>
  {#if portal.message && phase !== "done"}
    <p class="pt-1 text-foreground whitespace-pre-line break-words">{portal.message}</p>
  {/if}
  {#if closingDay && !closedByDate && portal.accepting && phase !== "done"}
    <p class="text-sm text-muted-foreground">{t.openUntil(closingDay)}</p>
  {/if}
</header>

{#if portal.twoWay && phase !== "done"}
  <ReturnsBlock title={portal.title} returns={portal.returns} {locale} preview={preview !== undefined} />
{/if}

{#if phase === "done"}
  <EmptyState title={sentCount === 1 ? t.sentOne : t.sentMany(sentCount)} announce>
    {#snippet icon()}
      <div
        class="flex size-10 items-center justify-center rounded-full bg-success/15 text-success-foreground"
      >
        <IconCheckRegular class="size-5" />
      </div>
    {/snippet}
    <p>
      {sentCount === 1 ? t.onlyRecipientOne(portal.title) : t.onlyRecipientMany(portal.title)}
    </p>
    {#if portal.thanks}
      <p class="text-foreground whitespace-pre-line break-words">{portal.thanks}</p>
    {/if}
    {#if shownReference}
      <p>
        {t.reference}: <span class="font-mono text-foreground">{shownReference}</span>
      </p>
    {/if}
    {#snippet actions()}
      {#if shownReference}
        <Button fullWidth={false} onclick={saveConfirmation}>{t.saveConfirmation}</Button>
      {/if}
      <Button variant="secondary" fullWidth={false} onclick={sendMore}>{t.sendMore}</Button>
    {/snippet}
  </EmptyState>
{:else if closedByDate && closingDay}
  <EmptyState title={t.closedOnTitle}>
    <p>{t.closedOnBody(portal.title, closingDay)}</p>
  </EmptyState>
{:else if !portal.accepting}
  <EmptyState title={t.closedTitle}>
    <p>{t.closedBody(portal.title)}</p>
  </EmptyState>
{:else}
  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-5">
        {#snippet fileRow(row: Row, index: number)}
          <FileRow
            name={row.file.name}
            size={formatSize(row.file.size)}
            status={phase === "sending" && row.status === "idle" ? "uploading" : row.status}
            kind="upload"
            percent={row.percent}
            onRemove={phase === "sending" ? undefined : () => removeRow(index)}
            removeLabel={t.remove(row.file.name)}
          />
        {/snippet}

        {#if portal.fieldLabel}
          <TextInput
            id="deposit-answer"
            label={portal.fieldLabel}
            maxlength={DEPOSIT_ANSWER_MAX}
            required
            bind:value={answer}
            oninput={() => (answerMissing = false)}
            error={answerMissing ? t.fieldMissing(portal.fieldLabel) : undefined}
            disabled={phase === "sending"}
          />
        {/if}

        {#if checklist.length > 0}
          <!-- The owner asked for specific things: one row each, so the
               sender can see what is still missing before sending. -->
          <input
            bind:this={itemInput}
            type="file"
            multiple
            class="hidden"
            onchange={addItemFiles}
            disabled={phase === "sending"}
          />
          <section class="space-y-3" aria-labelledby="checklist-heading">
            <div class="flex items-baseline justify-between gap-3">
              <h2 id="checklist-heading" class="text-sm font-medium text-foreground">
                {t.checklistHeading}
              </h2>
              <span class="text-xs text-muted-foreground">
                {t.checklistProgress(checklist.length - missingItems.length, checklist.length)}
              </span>
            </div>
            <ul class="space-y-2">
              {#each checklist as item (item.id)}
                {@const itemRows = rows
                  .map((row, index) => ({ row, index }))
                  .filter(({ row }) => row.itemId === item.id)}
                <li class="rounded-md border border-border p-3 space-y-2">
                  <!-- Stacked on a phone: a long label and a button do not fit side by side. -->
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span class="flex min-w-0 items-center gap-2 text-sm text-foreground">
                      <span
                        class="inline-flex size-5 shrink-0 items-center justify-center rounded-full {itemRows.length >
                        0
                          ? 'bg-success/15 text-success-foreground'
                          : 'border border-border'}"
                        aria-hidden="true"
                      >
                        {#if itemRows.length > 0}<IconCheckRegular class="size-3.5" />{/if}
                      </span>
                      <span class="break-words">{item.label}</span>
                    </span>
                    <Button
                      variant="secondary"
                      fullWidth={false}
                      class="w-full shrink-0 whitespace-nowrap sm:w-auto"
                      onclick={() => pickFor(item.id)}
                      disabled={phase === "sending"}
                    >
                      {itemRows.length > 0 ? t.addAnother : t.chooseFile}
                    </Button>
                  </div>
                  {#each itemRows as { row, index } (row.file)}
                    {@render fileRow(row, index)}
                  {/each}
                </li>
              {/each}
            </ul>
          </section>
          <h2 class="text-sm font-medium text-foreground">{t.otherFiles}</h2>
        {/if}

        <DropZone
          onFilesSelect={addFiles}
          disabled={phase === "sending"}
          compact={rows.length > 0 || checklist.length > 0}
          maxTotalSize={portal.maxTotalSize}
          labels={{ prompt: t.dropPrompt, addMore: t.addMore, maxTotal: t.maxTotal }}
        />

        <!-- On a phone the quickest way to send a document is to photograph
             it. Shown only where the main input is touch. -->
        <input
          bind:this={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          onchange={addPhoto}
          disabled={phase === "sending"}
        />
        <div class="hidden [@media(pointer:coarse)]:block">
          <Button
            variant="secondary"
            onclick={() => cameraInput?.click()}
            disabled={phase === "sending"}
          >
            <IconCameraRegular class="size-4" />
            {t.takePhoto}
          </Button>
        </div>

        {#if otherRows.length > 0}
          <ul class="space-y-2">
            {#each otherRows as { row, index } (row.file)}
              <li>{@render fileRow(row, index)}</li>
            {/each}
          </ul>
        {/if}

        {#if rows.length > 0}
          <p class="text-xs text-muted-foreground">
            {t.filesCount(rows.length, formatSize(totalBytes))}
          </p>

          <Textarea
            id="deposit-note"
            label={t.noteLabel}
            placeholder={portal.fieldLabel ? t.notePlaceholderNamed : t.notePlaceholder}
            rows={2}
            maxlength={DEPOSIT_NOTE_MAX}
            bind:value={note}
            disabled={phase === "sending"}
          />

          {#if missingItems.length > 0}
            <p class="text-sm text-muted-foreground">
              {t.checklistMissing(missingItems.map((i) => i.label))}
            </p>
          {/if}
        {/if}

        {#if errorMessage}
          <Alert tone="destructive">{errorMessage}</Alert>
        {/if}

        {#if phase === "sending" && stalled}
          <Alert tone="warning">{t.reconnecting}</Alert>
        {/if}

        {#if phase === "sending"}
          <Button variant="secondary" onclick={() => controller?.abort()}>{t.cancel}</Button>
        {:else}
          <Button onclick={send} disabled={rows.length === 0}>
            {rows.length > 1 ? t.sendMany(rows.length) : t.send}
          </Button>
        {/if}
      </div>
    </Frame.Panel>
  </Frame.Root>

  <p class="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
    <IconLockRegular class="size-4 shrink-0" />
    <span>
      {t.footnote(portal.title)}
      <TextLink href="/security">{t.howItWorks}</TextLink>
    </span>
  </p>
{/if}
