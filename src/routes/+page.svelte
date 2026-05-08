<script lang="ts">
  import { api } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileList from "$lib/components/FileList.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import ShareLink from "$lib/components/ShareLink.svelte";
  import { encryptFile, encryptFilename } from "$lib/crypto/encrypt";
  import { exportKey, generateKey, wrapKey } from "$lib/crypto/key";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import { MAX_TOTAL_UPLOAD_SIZE } from "$lib/config/limits";
  import { formatSize } from "$lib/utils";

  import * as Frame from "$lib/components/frame";

  const SITE_URL = "https://jtransfer.jimmyverburgt.com";
  const PAGE_TITLE = "JTransfer - End-to-end encrypted file transfer";
  const PAGE_DESCRIPTION =
    "JTransfer sends files with end-to-end encryption in your browser. We never see your files or encryption keys.";
  const homeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "JTransfer",
        url: SITE_URL,
        description: PAGE_DESCRIPTION,
      },
      {
        "@type": "WebApplication",
        name: "JTransfer",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and modern browser APIs",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        featureList: [
          "End-to-end encrypted file transfer",
          "Client-side encryption in browser",
          "Temporary links with expiration",
          "Optional password protection",
        ],
        url: SITE_URL,
      },
    ],
  };

  const MIN_PASSWORD_LENGTH = 8;

  const MAX_FILENAME_BYTES = 255;

  function handleFilesSelect(files: File[]) {
    const tooLong = files.find(
      (f) => new TextEncoder().encode(f.name).length > MAX_FILENAME_BYTES
    );
    if (tooLong) {
      uploadStore.setError(
        `"${tooLong.name}" has a filename that is too long (max ${MAX_FILENAME_BYTES} bytes).`
      );
      return;
    }

    const currentTotal = uploadStore.files.reduce(
      (sum, f) => sum + f.file.size,
      0
    );
    const newFilesSize = files.reduce((sum, f) => sum + f.size, 0);
    const projectedTotal = currentTotal + newFilesSize;

    if (projectedTotal > MAX_TOTAL_UPLOAD_SIZE) {
      const remaining = MAX_TOTAL_UPLOAD_SIZE - currentTotal;
      uploadStore.setError(
        `Not enough space. You have ${formatSize(remaining)} remaining.`
      );
      return;
    }

    uploadStore.addFiles(files);
  }

  function removeFile(index: number) {
    uploadStore.removeFile(index);
  }

  function resetUpload() {
    uploadStore.reset();
  }

  async function handleUpload() {
    const files = uploadStore.files;
    if (files.length === 0) return;

    try {
      // Step 1: Validate all files
      uploadStore.setStatus("validating");

      for (let i = 0; i < files.length; i++) {
        const file = files[i].file;
        const firstBytes = await file.slice(0, 16).arrayBuffer();
        const magicBytes = btoa(
          String.fromCharCode(...new Uint8Array(firstBytes))
        );

        const validation = await api.validateMagicBytes(magicBytes);
        if (!validation.valid) {
          uploadStore.setError(
            `"${file.name}": ${validation.reason ?? "File type not allowed"}`
          );
          return;
        }
      }

      // Step 2: Generate a single encryption key for all files
      const key = await generateKey();

      // Step 3: Create transfer (with optional password)
      const password =
        uploadStore.passwordEnabled &&
        uploadStore.password.length >= MIN_PASSWORD_LENGTH
          ? uploadStore.password
          : undefined;
      const transfer = await api.createTransfer(
        uploadStore.expiresInHours,
        password,
        uploadStore.maxDownloads
      );

      // If password set, wrap the key with it so link alone is not enough
      const keyString = password
        ? await wrapKey(key, password)
        : await exportKey(key);

      // Step 4: Process each file
      uploadStore.setStatus("encrypting");

      let uploadFailed = false;
      for (let i = 0; i < files.length; i++) {
        uploadStore.setCurrentFileIndex(i);
        const fileState = files[i];
        const file = fileState.file;

        try {
          // Encrypt filename
          uploadStore.setFileStatus(i, "encrypting", 0);
          const { encryptedName, iv: nameIv } = await encryptFilename(
            file.name,
            key
          );

          // Encrypt file
          const { encryptedBlob, iv: fileIv } = await encryptFile(
            file,
            key,
            (p) => {
              uploadStore.setFileStatus(i, "encrypting", p * 0.5);
            }
          );

          uploadStore.setFileStatus(i, "encrypting", 50);

          // Request presigned upload URL
          uploadStore.setFileStatus(i, "uploading", 50);

          const { uploadUrl } = await api.requestUploadUrl({
            transferId: transfer.transferId,
            contentType: file.type || "application/octet-stream",
            encryptedName,
            encryptedNameIv: nameIv,
            fileIv,
            size: encryptedBlob.size,
          });

          // Upload directly to R2 with up to 3 attempts
          const MAX_ATTEMPTS = 3;
          let lastUploadError: unknown;
          for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
              // Reset progress to start of upload phase on each attempt
              uploadStore.setFileStatus(i, "uploading", 50);
              await api.uploadToR2(uploadUrl, encryptedBlob, (p) => {
                uploadStore.setFileStatus(i, "uploading", 50 + p * 0.5);
              });
              lastUploadError = undefined;
              break;
            } catch (err) {
              lastUploadError = err;
              if (attempt < MAX_ATTEMPTS - 1) {
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
              }
            }
          }
          if (lastUploadError) throw lastUploadError;

          uploadStore.setFileStatus(i, "complete", 100);
        } catch (err) {
          uploadStore.setFileStatus(
            i,
            "error",
            0,
            err instanceof Error ? err.message : "Upload failed"
          );
          uploadFailed = true;
          break;
        }
      }

      // If any file failed, abort the transfer to clean up already-uploaded files
      if (uploadFailed) {
        api.abortTransfer(transfer.transferId).catch(() => {});
        throw new Error(
          uploadStore.files.find(f => f.status === "error")?.error ?? "Upload failed"
        );
      }

      // Step 5: Complete transfer
      uploadStore.setStatus("uploading");
      const completeResponse = await api.completeTransfer(transfer.transferId);

      // Step 6: Build share URL with key in fragment
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}${completeResponse.shareUrl}#${keyString}`;

      uploadStore.setShareUrl(shareUrl);
    } catch (error) {
      if (uploadStore.status !== "error") {
        uploadStore.setError(
          error instanceof Error ? error.message : "Upload failed"
        );
      }
    }
  }

  const isProcessing = $derived(
    uploadStore.status === "validating" ||
      uploadStore.status === "encrypting" ||
      uploadStore.status === "uploading"
  );

  const totalSize = $derived(
    uploadStore.files.reduce((sum, f) => sum + f.file.size, 0)
  );

  const remainingSize = $derived(MAX_TOTAL_UPLOAD_SIZE - totalSize);
  const usagePercent = $derived((totalSize / MAX_TOTAL_UPLOAD_SIZE) * 100);
</script>

<svelte:head>
  <title>{PAGE_TITLE}</title>
  <meta name="description" content={PAGE_DESCRIPTION} />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta property="og:title" content={PAGE_TITLE} />
  <meta property="og:description" content={PAGE_DESCRIPTION} />
  <meta property="og:url" content={SITE_URL} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={PAGE_TITLE} />
  <meta name="twitter:description" content={PAGE_DESCRIPTION} />
  <script type="application/ld+json">
    {JSON.stringify(homeSchema)}
  </script>
</svelte:head>

<div class="bg-background text-foreground">
  <PageLayout>
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2">Send files securely</h1>
      <p class="text-muted-foreground">
        Secure, open source, end-to-end encrypted file transfer hosted in the EU
      </p>
    </div>

    <Frame.Root>
      {#if uploadStore.status === "complete" && uploadStore.shareUrl}
        <ShareLink
          url={uploadStore.shareUrl}
          onReset={resetUpload}
          expiresInHours={uploadStore.expiresInHours}
          maxDownloads={uploadStore.maxDownloads}
        />
      {:else}
        <div class="space-y-6">
          <Frame.Header>
            <!-- Storage indicator -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Storage</span>
                <span class="text-foreground">
                  {formatSize(totalSize)} / {formatSize(MAX_TOTAL_UPLOAD_SIZE)}
                  <span class="text-muted-foreground"
                    >({formatSize(remainingSize)} left)</span
                  >
                </span>
              </div>
              <div class="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  class="h-2 rounded-full transition-[width,background-color] duration-200 ease-out {usagePercent >
                  90
                    ? 'bg-destructive'
                    : usagePercent > 70
                      ? 'bg-warning'
                      : 'bg-info'}"
                  style="width: {Math.min(usagePercent, 100)}%"
                ></div>
              </div>
            </div>
          </Frame.Header>
          <Frame.Panel>
            <DropZone
              onFilesSelect={handleFilesSelect}
              disabled={isProcessing || remainingSize <= 0}
              maxTotalSize={MAX_TOTAL_UPLOAD_SIZE}
            />

            {#if uploadStore.files.length > 0}
              <div class="space-y-4">
                <div
                  class="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <span
                    >{uploadStore.files.length} file{uploadStore.files
                      .length !== 1
                      ? "s"
                      : ""}</span
                  >
                  <span>{formatSize(totalSize)}</span>
                </div>

                <FileList
                  files={uploadStore.files}
                  onRemove={removeFile}
                  disabled={isProcessing}
                />

                {#if !isProcessing && uploadStore.status !== "error"}
                  <div class="space-y-4 pt-2">
                    <div>
                      <span class="block text-sm text-muted-foreground mb-2"
                        >Expires in</span
                      >
                      <div
                        class="flex gap-2 flex-wrap"
                        role="group"
                        aria-label="Expiration options"
                      >
                        {#each [
                          { hours: 1, label: '1h' },
                          { hours: 6, label: '6h' },
                          { hours: 12, label: '12h' },
                          { hours: 24, label: '1 day' },
                          { hours: 72, label: '3 days' },
                        ] as opt}
                          <button
                            type="button"
                            onclick={() => uploadStore.setExpiresInHours(opt.hours)}
                            class="hover:cursor-pointer flex-1 py-2 px-3 rounded-[calc(var(--radius-2xl)-1px)] transition-colors text-sm
                            {uploadStore.expiresInHours === opt.hours
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-accent'}"
                          >
                            {opt.label}
                          </button>
                        {/each}
                      </div>
                    </div>

                    <!-- Max downloads -->
                    <div>
                      <span class="block text-sm text-muted-foreground mb-2"
                        >Max downloads</span
                      >
                      <div
                        class="flex gap-2 flex-wrap"
                        role="group"
                        aria-label="Max download options"
                      >
                        {#each [
                          { value: null, label: 'Unlimited' },
                          { value: 1, label: '1' },
                          { value: 5, label: '5' },
                          { value: 10, label: '10' },
                          { value: 25, label: '25' },
                        ] as opt}
                          <button
                            type="button"
                            onclick={() => uploadStore.setMaxDownloads(opt.value)}
                            class="hover:cursor-pointer flex-1 py-2 px-3 rounded-[calc(var(--radius-2xl)-1px)] transition-colors text-sm
                            {uploadStore.maxDownloads === opt.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-accent'}"
                          >
                            {opt.label}
                          </button>
                        {/each}
                      </div>
                    </div>

                    <!-- Password protection -->
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uploadStore.passwordEnabled}
                          onchange={(e) =>
                            uploadStore.setPasswordEnabled(
                              e.currentTarget.checked
                            )}
                          class="w-4 h-4 rounded border-border bg-card text-primary focus:ring-ring focus:ring-offset-background"
                        />
                        <span class="text-sm text-foreground"
                          >Password protect</span
                        >
                      </label>

                      {#if uploadStore.passwordEnabled}
                        <PasswordInput
                          id="upload-password"
                          aria-label="Transfer password"
                          placeholder="Enter password (min 8 characters)"
                          value={uploadStore.password}
                          oninput={(e) =>
                            uploadStore.setPassword(
                              (e.currentTarget as HTMLInputElement).value
                            )}
                        />
                        {#if uploadStore.password.length > 0 && uploadStore.password.length < MIN_PASSWORD_LENGTH}
                          <p class="text-xs text-warning-foreground">
                            Password must be at least {MIN_PASSWORD_LENGTH} characters
                          </p>
                        {/if}
                      {/if}
                    </div>

                    <Button
                      onclick={handleUpload}
                      disabled={uploadStore.passwordEnabled &&
                        uploadStore.password.length > 0 &&
                        uploadStore.password.length < MIN_PASSWORD_LENGTH}
                    >
                      Create Link
                    </Button>
                  </div>
                {/if}
              </div>
            {/if}

            {#if isProcessing}
              <div class="space-y-2 pt-2">
                <ProgressBar
                  progress={uploadStore.overallProgress}
                  label={uploadStore.status === "validating"
                    ? "Validating files..."
                    : uploadStore.status === "encrypting"
                      ? "Encrypting..."
                      : "Uploading..."}
                />
                <p class="text-xs text-muted-foreground">
                  {#if uploadStore.status === "encrypting"}
                    Encrypting file {uploadStore.currentFileIndex + 1} of {uploadStore
                      .files.length}
                  {:else if uploadStore.status === "uploading"}
                    Uploading encrypted files securely
                  {/if}
                </p>
              </div>
            {/if}

            {#if uploadStore.error}
              <div
                class="p-4 bg-destructive/10 border border-destructive/30 rounded-[calc(var(--radius-2xl)-1px)]"
              >
                <p class="text-destructive-foreground">{uploadStore.error}</p>
                <button
                  type="button"
                  onclick={resetUpload}
                  class="mt-2 text-sm text-destructive-foreground hover:text-destructive underline hover:cursor-pointer"
                >
                  Try again
                </button>
              </div>
            {/if}
          </Frame.Panel>
        </div>
      {/if}
    </Frame.Root>

    <div class="mt-8 text-center text-sm text-muted-foreground space-y-2">
      <p>Files are encrypted in your browser before upload.</p>
      <p>We never see your files or encryption keys.</p>
      <p class="flex items-center justify-center gap-1">
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span
          >Fair usage limits apply to keep the service free for everyone.</span
        >
      </p>
      <div class="flex items-center justify-center gap-3 pt-2">
        <a href="/privacy" class="hover:text-foreground transition-colors"
          >Privacy Policy</a
        >
        <span>·</span>
        <a href="/security" class="hover:text-foreground transition-colors"
          >Security</a
        >
        <span>·</span>
        <a href="/terms" class="hover:text-foreground transition-colors"
          >Terms of Service</a
        >
        <span>·</span>
        <a href="/abuse" class="hover:text-foreground transition-colors"
          >Report Abuse</a
        >
        <span>·</span>
        <a
          href="https://github.com/VerburgtJimmy"
          class="hover:text-foreground transition-colors">Github</a
        >
      </div>
    </div>
  </PageLayout>

  <section
    class="max-w-2xl mx-auto px-4 pb-12 pt-10 border-t border-border/60 text-sm text-muted-foreground leading-relaxed space-y-3"
  >
    <h2 class="text-base font-semibold text-foreground">
      JTransfer, explained
    </h2>
    <p>
      JTransfer is a secure file transfer service built for fast, private
      sharing. Files are encrypted in your browser before upload, so only people
      with your link and key can open them.
    </p>
    <p>
      Share large files with confidence using end-to-end encryption, optional
      password protection, and expiring links. Your content stays private
      because encryption happens client-side and keys never touch our servers.
    </p>
    <p>
      From project assets to sensitive documents, JTransfer keeps delivery
      simple: drag, drop, and share a secure link in seconds.
    </p>
  </section>
</div>
