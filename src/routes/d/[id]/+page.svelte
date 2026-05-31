<script lang="ts">
  import { page } from "$app/stores";
  import { api, type TransferMetadata } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import CircularProgress from "$lib/components/CircularProgress.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { decryptFilename, decryptString, downloadAndDecrypt } from "$lib/crypto/decrypt";
  import { importKey, isWrappedKey, unwrapKey } from "$lib/crypto/key";
  import { formatEta, formatSize, formatSpeed } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import IconWarningRegular from "phosphor-icons-svelte/IconWarningRegular.svelte";
  import { onMount } from "svelte";

  type PageStatus = "loading" | "password_required" | "ready" | "error";
  type FileDownloadStatus = "idle" | "downloading" | "complete" | "error";

  interface DecryptedFileInfo {
    id: string;
    name: string;
    size: number;
    mimeType: string | null;
    fileIv: string;
    status: FileDownloadStatus;
    progress: number;
    error?: string;
  }

  let pageStatus = $state<PageStatus>("loading");
  let errorMessage = $state<string | null>(null);
  let errorTitle = $state<string>("This link is no longer valid");
  let transfer = $state<TransferMetadata | null>(null);
  let files = $state<DecryptedFileInfo[]>([]);
  let key = $state<CryptoKey | null>(null);
  let accessToken = $state<string | null>(null);
  let downloadAllInProgress = $state(false);
  let decryptedTitle = $state<string | null>(null);

  let password = $state("");
  let passwordError = $state<string | null>(null);
  let isVerifyingPassword = $state(false);
  let transferId = $state<string | null>(null);
  let rawFragment = $state<string | null>(null);

  type FeaturedItem = {
    slug: string;
    src: string;
    title: string;
    artist: string;
    artistUrl: string | null;
    tone?: "light" | "dark";
  };
  let featured = $state<FeaturedItem | null>(null);
  let imageRevealed = $state(false);

  let downloadSpeed = $state<number | null>(null);
  let downloadEta = $state<number | null>(null);
  let lastSpeedTs = 0;

  onMount(async () => {
    try {
      const id = $page.params.id;
      if (!id) {
        errorTitle = "This link is no longer valid";
        errorMessage = "Invalid link: missing transfer ID.";
        pageStatus = "error";
        return;
      }
      transferId = id;

      const hash = window.location.hash.slice(1);
      if (!hash) {
        errorTitle = "This link is no longer valid";
        errorMessage = "Invalid link: missing decryption key.";
        pageStatus = "error";
        return;
      }
      rawFragment = hash;

      const meta = await api.getTransferMetadata(id);
      transfer = meta;

      if (isWrappedKey(hash)) {
        pageStatus = "password_required";
        return;
      }

      const cryptoKey = await importKey(hash);
      key = cryptoKey;

      if (meta.passwordRequired) {
        pageStatus = "password_required";
        return;
      }

      await decryptAndShowFiles(meta, cryptoKey);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load files";
      const lower = message.toLowerCase();
      if (lower.includes("expired")) {
        errorTitle = "This transfer has expired";
        errorMessage =
          "The sender set an expiry that has passed. Ask them for a fresh link.";
      } else if (lower.includes("not found") || lower.includes("404")) {
        errorTitle = "This link is no longer valid";
        errorMessage =
          "The transfer expired, was deleted, or the link is incorrect.";
      } else {
        errorTitle = "Unable to access files";
        errorMessage = message;
      }
      pageStatus = "error";
    }
  });

  onMount(async () => {
    try {
      const res = await fetch("/featured/manifest.json", { cache: "no-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: FeaturedItem[] };
      if (Array.isArray(data.items) && data.items.length > 0) {
        featured = data.items[Math.floor(Math.random() * data.items.length)];
      }
    } catch {
      // Best-effort; the page renders fine without art.
    }
  });

  async function decryptAndShowFiles(
    meta: TransferMetadata,
    cryptoKey: CryptoKey
  ) {
    if (!meta.files) {
      errorTitle = "Unable to access files";
      errorMessage = "No files found in transfer.";
      pageStatus = "error";
      return;
    }

    const decryptedFiles: DecryptedFileInfo[] = [];
    for (const file of meta.files) {
      const name = await decryptFilename(
        file.encryptedName,
        file.encryptedNameIv,
        cryptoKey
      );
      decryptedFiles.push({
        id: file.id,
        name,
        size: file.size,
        mimeType: file.mimeType,
        fileIv: file.fileIv,
        status: "idle",
        progress: 0,
      });
    }
    files = decryptedFiles;

    if (meta.encryptedTitle && meta.encryptedTitleIv) {
      try {
        const t = await decryptString(
          meta.encryptedTitle,
          meta.encryptedTitleIv,
          cryptoKey,
        );
        if (t.length > 0) decryptedTitle = t;
      } catch {
        decryptedTitle = null;
      }
    }

    pageStatus = "ready";
  }

  async function handlePasswordSubmit() {
    if (!transferId || isVerifyingPassword) return;

    passwordError = null;
    isVerifyingPassword = true;

    try {
      const meta = await api.verifyTransferPassword(transferId, password);
      transfer = meta;
      accessToken = meta.accessToken ?? null;

      let cryptoKey: CryptoKey;
      if (rawFragment && isWrappedKey(rawFragment)) {
        try {
          cryptoKey = await unwrapKey(rawFragment, password);
        } catch {
          passwordError = "Incorrect password";
          return;
        }
      } else if (key) {
        cryptoKey = key;
      } else {
        passwordError = "Missing decryption key";
        return;
      }

      key = cryptoKey;
      await decryptAndShowFiles(meta, cryptoKey);
    } catch (err) {
      passwordError =
        err instanceof Error ? err.message : "Incorrect password";
    } finally {
      isVerifyingPassword = false;
    }
  }

  function friendlyDownloadError(error: unknown): string {
    const raw = error instanceof Error ? error.message.toLowerCase() : "";
    if (/network|connection|lost|fetch|load failed/.test(raw)) {
      return "The connection dropped. Try again.";
    }
    return "Couldn't download this file. Try again.";
  }

  async function downloadFile(index: number) {
    const file = files[index];
    if (!key || file.status === "downloading") return;

    downloadSpeed = null;
    downloadEta = null;
    lastSpeedTs = 0;

    try {
      files[index].status = "downloading";
      files[index].progress = 0;

      const { downloadUrl } = await api.getDownloadUrl(
        file.id,
        accessToken ?? undefined,
      );

      const decryptedBlob = await downloadAndDecrypt(
        downloadUrl,
        file.fileIv,
        key,
        (p) => {
          files[index].progress = p.percent;
          // Throttle the displayed speed/ETA to ~1s so it reads steadily.
          const now = performance.now();
          if (p.percent >= 100 || now - lastSpeedTs > 1000) {
            downloadSpeed = p.bytesPerSecond;
            downloadEta = p.etaSeconds;
            lastSpeedTs = now;
          }
        },
      );

      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      files[index].status = "complete";
      files[index].progress = 100;
    } catch (err) {
      files[index].status = "error";
      files[index].error = friendlyDownloadError(err);
    }
  }

  async function downloadAllFiles() {
    if (!key || downloadAllInProgress) return;
    downloadAllInProgress = true;
    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].status !== "complete") {
          await downloadFile(i);
        }
      }
    } finally {
      downloadAllInProgress = false;
    }
  }

  const allComplete = $derived(
    files.length > 0 && files.every((f) => f.status === "complete")
  );
  const anyDownloading = $derived(
    files.some((f) => f.status === "downloading")
  );
  const downloadingIndex = $derived(
    files.findIndex((f) => f.status === "downloading"),
  );
  const overallDownloadProgress = $derived.by(() => {
    if (files.length === 0) return 0;
    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    if (totalBytes === 0) {
      return files.reduce((s, f) => s + f.progress, 0) / files.length;
    }
    return files.reduce((s, f) => s + f.progress * f.size, 0) / totalBytes;
  });
  const isSingleFile = $derived(files.length === 1);
  const fileCountTitle = $derived(
    `${files.length} file${files.length !== 1 ? "s" : ""} received`
  );
  const downloadAllLabel = $derived(
    isSingleFile && files[0]
      ? `Download ${files[0].name}`
      : `Download all (${files.length})`
  );

  const pageH1 = $derived(
    pageStatus === "ready" && decryptedTitle
      ? decryptedTitle
      : "An encrypted transfer."
  );
  const pageTagline = $derived(
    pageStatus === "ready" && decryptedTitle
      ? "Decrypted in your browser. We never saw the contents."
      : "Decrypted in your browser. We never see the contents."
  );
</script>

<svelte:head>
  <title>Secure download — Tessil</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<!-- -mt-14 pulls the image behind the sticky nav so the glass effect sees through to artwork. -->
<section class="relative min-h-screen -mt-14 overflow-hidden">
  {#if featured}
    <div
      aria-hidden="true"
      class="featured-reveal absolute inset-0 bg-cover bg-center pointer-events-none"
      style="
        background-image: url('{featured.src}');
        clip-path: {imageRevealed ? 'inset(0 round 0)' : 'inset(var(--reveal-top) 0 0 var(--reveal-left) round var(--reveal-round))'};
        transition: clip-path 1200ms cubic-bezier(0.83, 0, 0.17, 1);
      "
    ></div>
  {/if}

  <div class="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 lg:pt-32 pb-[16rem] sm:pb-24">
    <div class="grid grid-cols-1 sm:grid-cols-[320px_1fr] gap-6 sm:gap-10 lg:gap-12 items-stretch">

      <aside class="glass-panel sm:sticky sm:top-6 sm:min-h-[420px] sm:flex sm:flex-col">
        <div class="px-5 py-4 border-b border-border">
          <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconLockRegular class="size-4 text-primary shrink-0" />
            {#if pageStatus === "ready"}
              {fileCountTitle}
            {:else if pageStatus === "password_required"}
              Password required
            {:else if pageStatus === "error"}
              Unable to access
            {:else}
              Encrypted transfer
            {/if}
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            Decrypted in your browser.
          </p>
        </div>

        <!-- Content -->
        <div class="px-5 py-4 sm:flex-1 sm:flex sm:flex-col overflow-y-auto">
          {#if pageStatus === "loading"}
            <div
              class="flex items-center justify-center py-8 text-muted-foreground"
            >
              <Spinner aria-label="Loading transfer" />
            </div>
          {:else if pageStatus === "password_required"}
            <form
              onsubmit={(e) => {
                e.preventDefault();
                handlePasswordSubmit();
              }}
              class="space-y-4"
            >
              <p class="text-sm text-muted-foreground">
                The sender added a password. Ask them for it if you don't have it.
              </p>
              <PasswordInput
                id="transfer-password"
                label="Password"
                placeholder="Enter the password"
                bind:value={password}
                disabled={isVerifyingPassword}
                error={passwordError ?? undefined}
              />
            </form>
          {:else if pageStatus === "error"}
            <div role="alert" class="flex flex-1 flex-col items-center justify-center text-center gap-3 py-8">
              <span class="inline-flex items-center justify-center size-12 rounded-full bg-destructive/10 text-destructive-foreground">
                <IconWarningRegular class="size-6" />
              </span>
              <div class="space-y-1">
                <p class="text-sm font-semibold text-foreground">{errorTitle}</p>
                <p class="text-xs text-muted-foreground leading-relaxed max-w-[18rem]">
                  {errorMessage}
                </p>
              </div>
            </div>
          {:else if pageStatus === "ready"}
            {#if downloadAllInProgress || anyDownloading}
              <div class="flex flex-1 flex-col items-center justify-center text-center gap-3 py-4">
                <CircularProgress
                  percent={overallDownloadProgress}
                  sublabel="Downloading…"
                />
                <div class="space-y-0.5 text-xs text-muted-foreground" aria-live="polite">
                  {#if downloadSpeed}
                    <p class="tabular-nums">
                      {formatSpeed(downloadSpeed)}{#if downloadEta} · {formatEta(downloadEta)} left{/if}
                    </p>
                  {/if}
                  {#if files.length > 1 && downloadingIndex >= 0}
                    <p>File {downloadingIndex + 1} of {files.length}</p>
                  {/if}
                </div>
              </div>
            {:else}
              <div>
                {#each files as file, index (file.id)}
                  <FileRow
                    name={file.name}
                    size={formatSize(file.size)}
                    kind="download"
                    status={file.status}
                    percent={file.progress}
                    trailingHidden={isSingleFile}
                    errorSub={file.status === "error" ? file.error : undefined}
                    onDownload={() => downloadFile(index)}
                    onRetry={() => downloadFile(index)}
                  />
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        {#if pageStatus === "password_required"}
          <div class="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/30">
            <Button
              variant="primary"
              fullWidth={false}
              class="flex-1"
              onclick={handlePasswordSubmit}
              disabled={!password || isVerifyingPassword}
            >
              {#if isVerifyingPassword}
                <Spinner class="size-4" />
                Verifying…
              {:else}
                Unlock
              {/if}
            </Button>
          </div>
        {:else if pageStatus === "ready"}
          <div class="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/30">
            {#if allComplete}
              <Button variant="primary" fullWidth={false} class="flex-1" disabled>
                <IconCheckRegular class="size-4" />
                Downloaded
              </Button>
            {:else if downloadAllInProgress || anyDownloading}
              <Button variant="primary" fullWidth={false} class="flex-1" disabled>
                <Spinner class="size-4" />
                Downloading…
              </Button>
            {:else}
              <Button variant="primary" fullWidth={false} class="flex-1" onclick={downloadAllFiles}>
                <IconDownloadRegular class="size-4" />
                {downloadAllLabel}
              </Button>
            {/if}
          </div>
        {/if}
      </aside>

      <div class="space-y-4 sm:text-right sm:max-w-md sm:ml-auto sm:pt-4">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.05] break-words" style="letter-spacing: -0.03em">
          {pageH1}
        </h1>
        <p class="text-base text-muted-foreground leading-relaxed">
          {pageTagline}
        </p>
        <p class="text-sm">
          <a
            href="/"
            class="text-primary underline underline-offset-4"
          >
            Want to send something back? →
          </a>
        </p>
      </div>
    </div>
  </div>

  {#if featured}
    <div class="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-[25rem] sm:translate-x-1/2 bottom-4 z-20 flex flex-col items-center gap-1.5 max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onclick={() => (imageRevealed = !imageRevealed)}
        aria-pressed={imageRevealed}
        aria-label={imageRevealed
          ? `Hide ${featured.title}`
          : `Reveal ${featured.title} by ${featured.artist}`}
        class="group inline-flex items-center gap-2 rounded-full bg-background/85 backdrop-blur-md border border-border/70 px-3.5 py-2 text-xs text-foreground hover:bg-background hover:cursor-pointer transition-colors duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span class="size-1.5 rounded-full bg-primary"></span>
        <span class="font-medium">{featured.title}</span>
        <span class="text-muted-foreground">by {featured.artist}</span>
        <span class="text-muted-foreground/60 mx-1" aria-hidden="true">·</span>
        <span class="min-w-[2.75rem] text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200 ease-out font-medium">
          {imageRevealed ? "Hide" : "Reveal"}
        </span>
      </button>
      {#if featured.artistUrl}
        <a
          href={featured.artistUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur-md border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Artist →
        </a>
      {/if}
    </div>
  {/if}
</section>

<style>
  /* Featured reveal band — shorter & full-width on mobile, corner crop on desktop. */
  .featured-reveal {
    --reveal-top: calc(100% - 13rem);
    --reveal-left: 0px;
    --reveal-round: 1.5rem 1.5rem 0 0;
  }
  @media (min-width: 640px) {
    .featured-reveal {
      --reveal-top: calc(100% - 22rem);
      --reveal-left: calc(100% - 50rem);
      --reveal-round: 1.5rem 0 0 0;
    }
  }
</style>
