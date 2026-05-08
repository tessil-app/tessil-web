<script lang="ts">
  import { page } from "$app/stores";
  import { api, type TransferMetadata } from "$lib/api/client";
  import * as Frame from "$lib/components/frame";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import { decryptFile, decryptFilename } from "$lib/crypto/decrypt";
  import { importKey, unwrapKey, isWrappedKey } from "$lib/crypto/key";
  import { formatSize } from "$lib/utils";
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
  let error = $state<string | null>(null);
  let transfer = $state<TransferMetadata | null>(null);
  let files = $state<DecryptedFileInfo[]>([]);
  let key = $state<CryptoKey | null>(null);
  let downloadAllStatus = $state<"idle" | "downloading" | "complete">("idle");
  let downloadAllProgress = $state(0);

  // Password protection state
  let password = $state("");
  let passwordError = $state<string | null>(null);
  let isVerifyingPassword = $state(false);
  let showPassword = $state(false);
  let transferId = $state<string | null>(null);
  let rawFragment = $state<string | null>(null); // kept for wrapped key unwrapping

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onMount(async () => {
    try {
      const id = $page.params.id;
      if (!id) {
        error = "Invalid link: missing transfer ID";
        pageStatus = "error";
        return;
      }
      transferId = id;

      const hash = window.location.hash.slice(1);
      if (!hash) {
        error = "Invalid link: missing decryption key";
        pageStatus = "error";
        return;
      }

      rawFragment = hash;

      // Fetch transfer metadata first
      const meta = await api.getTransferMetadata(id);
      transfer = meta;

      // If key is wrapped, a password is required to unwrap it
      if (isWrappedKey(hash)) {
        // Password prompt will handle both server verify and key unwrapping
        pageStatus = "password_required";
        return;
      }

      // Plain key — import directly
      const cryptoKey = await importKey(hash);
      key = cryptoKey;

      // Check if password is required (server-side gate only)
      if (meta.passwordRequired) {
        pageStatus = "password_required";
        return;
      }

      // No password required - decrypt filenames
      await decryptAndShowFiles(meta, cryptoKey);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load files";
      pageStatus = "error";
    }
  });

  async function decryptAndShowFiles(
    meta: TransferMetadata,
    cryptoKey: CryptoKey
  ) {
    if (!meta.files) {
      error = "No files found in transfer";
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
    pageStatus = "ready";
  }

  async function handlePasswordSubmit() {
    if (!transferId || isVerifyingPassword) return;

    passwordError = null;
    isVerifyingPassword = true;

    try {
      // Verify password server-side (gates access to file metadata)
      const meta = await api.verifyTransferPassword(transferId, password);
      transfer = meta;

      // Unwrap key if it is wrapped with the password; otherwise use already-imported key
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
      passwordError = err instanceof Error ? err.message : "Incorrect password";
    } finally {
      isVerifyingPassword = false;
    }
  }

  async function downloadFile(index: number) {
    const file = files[index];
    if (!key || file.status === "downloading") return;

    try {
      files[index].status = "downloading";
      files[index].progress = 0;

      // Download encrypted file
      files[index].progress = 10;
      const encryptedData = await api.downloadFile(file.id);
      files[index].progress = 70;

      // Decrypt
      const decryptedBlob = await decryptFile(
        encryptedData,
        file.fileIv,
        key,
        (p) => {
          files[index].progress = 70 + p * 0.3;
        }
      );

      // Trigger download
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      files[index].status = "complete";
    } catch (err) {
      files[index].status = "error";
      files[index].error =
        err instanceof Error ? err.message : "Download failed";
    }
  }

  async function downloadAllFiles() {
    if (!key || downloadAllStatus === "downloading") return;

    downloadAllStatus = "downloading";
    downloadAllProgress = 0;

    const totalFiles = files.length;
    let completedFiles = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "complete") {
        await downloadFile(i);
      }
      completedFiles++;
      downloadAllProgress = (completedFiles / totalFiles) * 100;
    }

    downloadAllStatus = "complete";
  }

  const totalSize = $derived(files.reduce((sum, f) => sum + f.size, 0));
  const allComplete = $derived(files.every((f) => f.status === "complete"));
  const anyDownloading = $derived(
    files.some((f) => f.status === "downloading")
  );
</script>

<svelte:head>
  <title>Secure Download - JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
  <div class="max-w-2xl mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2">JTransfer</h1>
      <p class="text-muted-foreground">
        Secure, open source, end-to-end encrypted file sharing hosted in the EU
      </p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        {#if pageStatus === "loading"}
          <div class="flex flex-col items-center gap-4 py-8">
            <div
              class="w-8 h-8 border-2 border-info border-t-transparent rounded-full animate-spin"
            ></div>
            <p class="text-muted-foreground">Loading files...</p>
          </div>
        {:else if pageStatus === "password_required"}
          <div class="text-center py-8">
            <!-- Lock icon -->
            <div class="w-16 h-16 mx-auto mb-4 text-primary">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 class="text-xl font-semibold mb-2">Password Protected</h2>
            <p class="text-muted-foreground mb-6">
              {#if transfer?.fileCount}
                {transfer.fileCount} file{transfer.fileCount !== 1 ? "s" : ""} available
              {:else}
                This transfer requires a password to access
              {/if}
            </p>

            <form
              onsubmit={(e) => {
                e.preventDefault();
                handlePasswordSubmit();
              }}
              class="max-w-xs mx-auto space-y-4"
            >
              <div class="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  bind:value={password}
                  disabled={isVerifyingPassword}
                  class="w-full py-3 px-4 pr-12 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onclick={() => (showPassword = !showPassword)}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:cursor-pointer"
                >
                  {#if showPassword}
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  {:else}
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  {/if}
                </button>
              </div>

              {#if passwordError}
                <p class="text-sm text-destructive-foreground">
                  {passwordError}
                </p>
              {/if}

              <button
                type="submit"
                disabled={!password || isVerifyingPassword}
                class="hover:cursor-pointer w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-medium rounded-[calc(var(--radius-2xl)-1px)] transition-colors flex items-center justify-center gap-2"
              >
                {#if isVerifyingPassword}
                  <div
                    class="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                  ></div>
                  Verifying...
                {:else}
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                  Unlock Files
                {/if}
              </button>
            </form>

            {#if transfer}
              <p class="text-xs text-muted-foreground mt-4">
                Expires {formatDate(transfer.expiresAt)}
              </p>
            {/if}
          </div>
        {:else if pageStatus === "error"}
          <div class="text-center py-8">
            <div class="w-16 h-16 mx-auto mb-4 text-destructive-foreground">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 class="text-xl font-semibold mb-2">Unable to access files</h2>
            <p class="text-muted-foreground">{error}</p>
            <a
              href="/"
              class="inline-block mt-4 text-info-foreground hover:text-info"
            >
              Upload your own files
            </a>
          </div>
        {:else if pageStatus === "ready"}
          <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </h2>
                <p class="text-sm text-muted-foreground">
                  {formatSize(totalSize)} total
                </p>
              </div>
              {#if transfer}
                <p class="text-sm text-muted-foreground">
                  Expires {formatDate(transfer.expiresAt)}
                </p>
              {/if}
            </div>

            <!-- Download All button -->
            {#if files.length > 1}
              <button
                type="button"
                onclick={downloadAllFiles}
                disabled={anyDownloading || allComplete}
                class="hover:cursor-pointer w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-medium rounded-[calc(var(--radius-2xl)-1px)] transition-colors flex items-center justify-center gap-2"
              >
                {#if downloadAllStatus === "downloading"}
                  <div
                    class="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                  ></div>
                  Downloading...
                {:else if allComplete}
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  All Downloaded
                {:else}
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download All
                {/if}
              </button>
            {/if}

            <!-- File list -->
            <div class="space-y-2">
              {#each files as file, index}
                <div
                  class="flex items-center gap-3 p-3 bg-card/50 rounded-[calc(var(--radius-2xl)-1px)] border border-border"
                >
                  <!-- File icon -->
                  <div
                    class="shrink-0 w-10 h-10 flex items-center justify-center bg-muted rounded-[calc(var(--radius-2xl)-1px)]"
                  >
                    <svg
                      class="w-5 h-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  <!-- File info -->
                  <div class="flex-1 min-w-0">
                    <p class="text-foreground text-sm font-medium truncate">
                      {file.name}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                    </p>
                    {#if file.status === "downloading"}
                      <div class="mt-1 w-full bg-muted rounded-full h-1">
                        <div
                          class="bg-info h-1 rounded-full transition-[width] duration-200 ease-out"
                          style="width: {file.progress}%"
                        ></div>
                      </div>
                    {/if}
                  </div>

                  <!-- Download button -->
                  <button
                    type="button"
                    onclick={() => downloadFile(index)}
                    disabled={file.status === "downloading"}
                    class="hover:cursor-pointer shrink-0 p-2 rounded-[calc(var(--radius-2xl)-1px)] transition-colors
											{file.status === 'complete'
                      ? 'bg-success/20 text-success-foreground'
                      : file.status === 'error'
                        ? 'bg-destructive/20 text-destructive-foreground hover:bg-destructive/30'
                        : file.status === 'downloading'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted hover:bg-accent text-foreground'}"
                  >
                    {#if file.status === "complete"}
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    {:else if file.status === "downloading"}
                      <div
                        class="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"
                      ></div>
                    {:else if file.status === "error"}
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    {:else}
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    {/if}
                  </button>
                </div>
              {/each}
            </div>

            <!-- Security notice -->
            <div
              class="p-3 bg-success/10 border border-success/30 rounded-[calc(var(--radius-2xl)-1px)]"
            >
              <p class="text-sm text-success-foreground">
                <strong>End-to-end encrypted:</strong> Files are decrypted in your
                browser. The server never sees your content.
              </p>
            </div>
          </div>
        {/if}
      </Frame.Panel>
    </Frame.Root>

    <div class="mt-8 text-center text-sm text-muted-foreground space-y-2">
      <a href="/" class="hover:text-foreground transition-colors">
        Share your own files securely
      </a>
      <div class="flex items-center justify-center gap-3 pt-2">
        <a href="/privacy" class="hover:text-foreground transition-colors">Privacy</a>
        <span>·</span>
        <a href="/terms" class="hover:text-foreground transition-colors">Terms</a>
        <span>·</span>
        <a href="/abuse" class="hover:text-foreground transition-colors">Report Abuse</a>
      </div>
    </div>
  </div>
</div>
