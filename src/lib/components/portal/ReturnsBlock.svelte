<script lang="ts">
  // "Files from <owner>" on a portal's page: what the owner sent back,
  // downloaded and decrypted here.

  import { api } from "$lib/api/client";
  import FileRow from "$lib/components/FileRow.svelte";
  import { saveDecryptedFile } from "$lib/download/saveFile";
  import { HTML_LANG, type Locale } from "$lib/i18n/locale";
  import { depositStrings } from "$lib/i18n/messages";
  import type { PortalReturn } from "$lib/portal/keys";
  import { loadReturns, type OpenedReturn } from "$lib/portal/returns";
  import { formatSize } from "$lib/utils";

  interface Props {
    title: string;
    returns: PortalReturn[];
    locale: Locale;
    /** Shows one made-up file instead of asking the server. */
    preview?: boolean;
  }

  let { title, returns, locale, preview = false }: Props = $props();

  const t = $derived(depositStrings[locale]);
  const day = $derived(new Intl.DateTimeFormat(HTML_LANG[locale], { dateStyle: "long" }));

  let opened = $state<OpenedReturn[]>([]);
  let states = $state<Record<string, { status: "idle" | "downloading" | "complete" | "error"; percent: number }>>({});

  // Reloads when the list in the bundle changes, never on a keystroke.
  const listKey = $derived(returns.map((r) => r.id).join(","));
  $effect(() => {
    void listKey;
    if (preview) return;
    let stale = false;
    void loadReturns(returns).then((res) => {
      if (!stale) opened = res.returns;
    });
    return () => {
      stale = true;
    };
  });

  async function download(batch: OpenedReturn, fileId: string) {
    const file = batch.files.find((f) => f.id === fileId);
    if (!file || states[fileId]?.status === "downloading") return;
    states[fileId] = { status: "downloading", percent: 0 };
    try {
      const { downloadUrl } = await api.getDownloadUrl(fileId);
      await saveDecryptedFile({
        downloadUrl,
        key: batch.key,
        fileIv: file.fileIv,
        size: file.size,
        name: file.name,
        mimeType: file.mimeType,
        onProgress: (percent) => (states[fileId] = { status: "downloading", percent }),
      });
      states[fileId] = { status: "complete", percent: 100 };
    } catch {
      states[fileId] = { status: "error", percent: 0 };
    }
  }
</script>

{#if preview || opened.length > 0}
  <section class="mb-8 space-y-3" aria-labelledby="for-you-heading">
    <h2 id="for-you-heading" class="text-sm font-medium text-foreground">{t.forYouHeading(title)}</h2>
    {#if preview}
      <div class="space-y-2 rounded-lg border border-border bg-card p-3">
        <FileRow name="Example.pdf" size="240 KB" status="idle" kind="download" percent={0} onDownload={() => {}} />
      </div>
    {/if}
    {#each opened as batch (batch.id)}
      <div class="space-y-2 rounded-lg border border-border bg-card p-3">
        {#each batch.files as file (file.id)}
          {@const state = states[file.id]}
          <FileRow
            name={file.name}
            size={formatSize(file.plainSize)}
            status={state?.status ?? "idle"}
            kind="download"
            percent={state?.percent ?? 0}
            onDownload={() => download(batch, file.id)}
            onRetry={() => download(batch, file.id)}
            errorSub={state?.status === "error" ? t.downloadFailed : undefined}
          />
        {/each}
        <p class="text-xs text-muted-foreground">{t.forYouUntil(day.format(new Date(batch.expiresAt)))}</p>
      </div>
    {/each}
  </section>
{/if}
