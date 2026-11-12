<script lang="ts">
  // A portal's deposit page: what someone sees when they open a portal
  // link. No account. Files are encrypted here, to the portal's public
  // key, before anything is uploaded.

  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
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
  import { formatSize } from "$lib/utils";
  import IconCameraRegular from "phosphor-icons-svelte/IconCameraRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import { onDestroy, onMount } from "svelte";

  type Phase = "loading" | "invalid" | "ready" | "sending" | "done";
  type RowStatus = "idle" | "uploading" | "complete" | "error";

  interface Row {
    file: File;
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
  let failure = $state<DepositError | "failed" | null>(null);
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

  function addFiles(files: File[]) {
    failure = null;
    rows = [...rows, ...files.map((file) => ({ file, status: "idle" as RowStatus, percent: 0 }))];
  }

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
  }

  async function send() {
    if (!portal || rows.length === 0 || phase !== "ready") return;
    failure = null;
    rows = rows.map((r) => ({ ...r, status: "idle", percent: 0 }));
    phase = "sending";
    controller = new AbortController();
    try {
      await sendDeposit(
        portal,
        rows.map((r) => r.file),
        note,
        {
          signal: controller.signal,
          onProgress: (index, status, percent) => {
            rows[index].status = status;
            rows[index].percent = percent;
          },
        },
      );
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

  function sendMore() {
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
    <Frame.Root>
      <Frame.Panel>
        <div class="text-center space-y-3">
          <h1 class="text-xl font-semibold text-foreground">{t.invalid[invalidReason].title}</h1>
          <p class="text-sm text-muted-foreground">{t.invalid[invalidReason].body}</p>
        </div>
      </Frame.Panel>
    </Frame.Root>
  {:else if portal}
    <header class="mb-8 space-y-2">
      <p class="text-sm text-muted-foreground">{t.sendTo}</p>
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
        {portal.title}
      </h1>
    </header>

    {#if phase === "done"}
      <Frame.Root>
        <Frame.Panel>
          <div class="text-center space-y-3" role="status" aria-live="polite">
            <div
              class="mx-auto flex size-10 items-center justify-center rounded-full bg-success/15 text-success-foreground"
            >
              <IconCheckRegular class="size-5" />
            </div>
            <h2 class="text-lg font-medium text-foreground">
              {sentCount === 1 ? t.sentOne : t.sentMany(sentCount)}
            </h2>
            <p class="text-sm text-muted-foreground">
              {sentCount === 1 ? t.onlyRecipientOne(portal.title) : t.onlyRecipientMany(portal.title)}
            </p>
            <div class="flex justify-center pt-2">
              <Button variant="secondary" fullWidth={false} onclick={sendMore}>{t.sendMore}</Button>
            </div>
          </div>
        </Frame.Panel>
      </Frame.Root>
    {:else if !portal.accepting}
      <Frame.Root>
        <Frame.Panel>
          <div class="text-center space-y-3">
            <h2 class="text-lg font-medium text-foreground">{t.closedTitle}</h2>
            <p class="text-sm text-muted-foreground">{t.closedBody(portal.title)}</p>
          </div>
        </Frame.Panel>
      </Frame.Root>
    {:else}
      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-5">
            <DropZone
              onFilesSelect={addFiles}
              disabled={phase === "sending"}
              compact={rows.length > 0}
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

            {#if rows.length > 0}
              <ul class="space-y-2">
                {#each rows as row, index (row.file)}
                  <li>
                    <FileRow
                      name={row.file.name}
                      size={formatSize(row.file.size)}
                      status={phase === "sending" && row.status === "idle" ? "uploading" : row.status}
                      kind="upload"
                      percent={row.percent}
                      onRemove={phase === "sending" ? undefined : () => removeRow(index)}
                      removeLabel={t.remove(row.file.name)}
                    />
                  </li>
                {/each}
              </ul>
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
            {/if}

            {#if errorMessage}
              <Alert tone="destructive">{errorMessage}</Alert>
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
          <a href="/security" class="underline underline-offset-2 hover:text-foreground">{t.howItWorks}</a>
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
          <button
            type="button"
            lang={HTML_LANG[option]}
            onclick={() => (chosenLocale = option)}
            class="underline underline-offset-2 hover:text-foreground hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
          >
            {depositStrings[option].languageName}
          </button>
        {/if}
      {/each}
    </p>
  {/if}
</PageLayout>
