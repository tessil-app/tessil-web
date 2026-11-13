<script lang="ts">
  // A portal's deposit page: what someone sees when they open a portal
  // link. No account. Files are encrypted here, to the portal's public
  // key, before anything is uploaded.

  import TextLink from "$lib/components/TextLink.svelte";
  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import * as Frame from "$lib/components/frame";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import {
    DEPOSIT_NOTE_MAX,
    DepositError,
    openPortalFromLink,
    sendDeposit,
    type OpenedPortal,
  } from "$lib/portal/deposit";
  import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "$lib/i18n/locale";
  import { depositStrings } from "$lib/i18n/messages";
  import { buildReceiptText, depositReference, saveTextFile } from "$lib/portal/receipt";
  import { formatSize } from "$lib/utils";
  import IconCameraRegular from "phosphor-icons-svelte/IconCameraRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import { onDestroy, onMount } from "svelte";

  type Phase = "loading" | "invalid" | "ready" | "sending" | "done";
  type RowStatus = "idle" | "uploading" | "complete" | "error";

  interface Row {
    file: File;
    /** The requested item this file answers, when the portal asks for specific things. */
    itemId: string | null;
    status: RowStatus;
    percent: number;
  }

  let phase = $state<Phase>("loading");
  let portal = $state<OpenedPortal | null>(null);
  let invalidReason = $state<"bad_link" | "not_found" | "untrusted" | "offline">("bad_link");

  // The visitor did not choose this site, so its language follows, in
  // order: what they pick here, what the portal's owner chose, and what
  // their browser asks for.
  let chosenLocale = $state<Locale | null>(null);
  let browserLocale = $state<Locale>(DEFAULT_LOCALE);
  const locale = $derived<Locale>(chosenLocale ?? portal?.lang ?? browserLocale);
  const t = $derived(depositStrings[locale]);

  let previousLang: string | null = null;
  $effect(() => {
    if (typeof document === "undefined") return;
    previousLang ??= document.documentElement.lang;
    document.documentElement.lang = HTML_LANG[locale];
  });
  onDestroy(() => {
    if (typeof document !== "undefined" && previousLang !== null) {
      document.documentElement.lang = previousLang;
    }
  });


  let rows = $state<Row[]>([]);
  let note = $state("");
  let stalled = $state(false);
  let failure = $state<DepositError | "failed" | null>(null);
  // What the confirmation needs, kept after the files themselves are cleared.
  let sent = $state<{
    reference: string;
    at: Date;
    note: string | null;
    files: { name: string; size: string }[];
  } | null>(null);
  let cameraInput = $state<HTMLInputElement | null>(null);
  let controller: AbortController | null = null;

  const totalBytes = $derived(rows.reduce((sum, r) => sum + r.file.size, 0));
  const sentCount = $derived(rows.length);

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

  onMount(async () => {
    const wanted = (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase().slice(0, 2));
    browserLocale = LOCALES.find((l) => wanted.includes(l)) ?? DEFAULT_LOCALE;
    try {
      const result = await openPortalFromLink($page.params.id ?? "", window.location.hash);
      if (result.ok) {
        portal = result.portal;
        phase = "ready";
        return;
      }
      // "untrusted": do not offer an upload. The key we were given cannot be trusted.
      invalidReason = result.reason;
      phase = "invalid";
    } catch {
      invalidReason = "offline";
      phase = "invalid";
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

  const checklist = $derived(portal?.checklist ?? []);
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
    if (!portal || rows.length === 0 || phase !== "ready") return;
    failure = null;
    rows = rows.map((r) => ({ ...r, status: "idle", percent: 0 }));
    phase = "sending";
    controller = new AbortController();
    stalled = false;
    try {
      const result = await sendDeposit(
        portal,
        rows.map((r) => ({ file: r.file, itemId: r.itemId })),
        note,
        {
          signal: controller.signal,
          onProgress: (index, status, percent, isStalled) => {
            rows[index].status = status;
            rows[index].percent = percent;
            stalled = status === "uploading" && isStalled === true;
          },
        },
      );
      sent = {
        reference: await depositReference(result.transferId),
        at: result.sentAt,
        note: note.trim() || null,
        files: rows.map((row) => ({ name: row.file.name, size: formatSize(row.file.size) })),
      };
      phase = "done";
    } catch (err) {
      phase = "ready";
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
    if (!portal || !sent) return;
    saveTextFile(
      t.confirmationFilename(sent.reference),
      buildReceiptText({
        kind: "sent",
        locale,
        portalTitle: portal.title,
        reference: sent.reference,
        at: sent.at,
        note: sent.note,
        files: sent.files,
      }),
    );
  }

  function sendMore() {
    sent = null;
    rows = [];
    note = "";
    failure = null;
    phase = "ready";
  }
</script>

<Seo title={t.pageTitle} robots="noindex" />

<PageLayout width="2xl">
  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{t.opening}</p>
    </div>
  {:else if phase === "invalid"}
    <EmptyState title={t.invalid[invalidReason].title} level={1}>
      <p>{t.invalid[invalidReason].body}</p>
    </EmptyState>
  {:else if portal}
    <header class="mb-8 space-y-2">
      <p class="text-sm text-muted-foreground">{t.sendTo}</p>
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
        {portal.title}
      </h1>
    </header>

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
        {#if sent}
          <p>
            {t.reference}: <span class="font-mono text-foreground">{sent.reference}</span>
          </p>
        {/if}
        {#snippet actions()}
          {#if sent}
            <Button fullWidth={false} onclick={saveConfirmation}>{t.saveConfirmation}</Button>
          {/if}
          <Button variant="secondary" fullWidth={false} onclick={sendMore}>{t.sendMore}</Button>
        {/snippet}
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
                placeholder={t.notePlaceholder}
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
  {/if}

  {#if phase !== "loading"}
    <p class="mt-8 text-center text-xs text-muted-foreground">
      {#each LOCALES as option, i (option)}
        {#if i > 0}<span aria-hidden="true"> · </span>{/if}
        {#if option === locale}
          <span class="text-foreground" aria-current="true">{depositStrings[option].languageName}</span>
        {:else}
          <TextLink
            lang={HTML_LANG[option]}
            onclick={() => (chosenLocale = option)}
          >
            {depositStrings[option].languageName}
          </TextLink>
        {/if}
      {/each}
    </p>
  {/if}
</PageLayout>
