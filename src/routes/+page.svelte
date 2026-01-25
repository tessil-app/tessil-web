<script lang="ts">
  import { api } from "$lib/api/client";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileList from "$lib/components/FileList.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import ShareLink from "$lib/components/ShareLink.svelte";
  import { encryptFile, encryptFilename } from "$lib/crypto/encrypt";
  import { exportKey, generateKey } from "$lib/crypto/key";
  import { uploadStore } from "$lib/stores/upload.svelte";

  import * as Frame from "$lib/components/frame";

  const MAX_TOTAL_SIZE = 1024 * 1024 * 1024; // 1GB total
  const MIN_PASSWORD_LENGTH = 8;

  let showPassword = $state(false);

  function handleFilesSelect(files: File[]) {
    const currentTotal = uploadStore.files.reduce(
      (sum, f) => sum + f.file.size,
      0
    );
    const newFilesSize = files.reduce((sum, f) => sum + f.size, 0);
    const projectedTotal = currentTotal + newFilesSize;

    if (projectedTotal > MAX_TOTAL_SIZE) {
      const remaining = MAX_TOTAL_SIZE - currentTotal;
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
      const keyString = await exportKey(key);

      // Step 3: Create transfer (with optional password)
      const password =
        uploadStore.passwordEnabled &&
        uploadStore.password.length >= MIN_PASSWORD_LENGTH
          ? uploadStore.password
          : undefined;
      const transfer = await api.createTransfer(
        uploadStore.expiresInDays,
        password
      );

      // Step 4: Process each file
      uploadStore.setStatus("encrypting");

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

          // Upload file
          uploadStore.setFileStatus(i, "uploading", 50);

          await api.addFile(
            {
              transferId: transfer.transferId,
              contentType: file.type || "application/octet-stream",
              encryptedName,
              encryptedNameIv: nameIv,
              fileIv,
            },
            encryptedBlob,
            (p) => {
              uploadStore.setFileStatus(i, "uploading", 50 + p * 0.5);
            }
          );

          uploadStore.setFileStatus(i, "complete", 100);
        } catch (err) {
          uploadStore.setFileStatus(
            i,
            "error",
            0,
            err instanceof Error ? err.message : "Upload failed"
          );
          throw err;
        }
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

  const remainingSize = $derived(MAX_TOTAL_SIZE - totalSize);
  const usagePercent = $derived((totalSize / MAX_TOTAL_SIZE) * 100);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
</script>

<div class="min-h-screen bg-background text-foreground">
  <div class="max-w-2xl mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2">JTransfer</h1>
      <p class="text-muted-foreground">
        Secure, open source, end-to-end encrypted file sharing hosted in the EU
      </p>
    </div>

    <Frame.Root>
      {#if uploadStore.status === "complete" && uploadStore.shareUrl}
        <ShareLink url={uploadStore.shareUrl} onReset={resetUpload} />
      {:else}
        <div class="space-y-6">
          <Frame.Header>
            <!-- Storage indicator -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Storage</span>
                <span class="text-foreground">
                  {formatSize(totalSize)} / 1 GB
                  <span class="text-muted-foreground"
                    >({formatSize(remainingSize)} left)</span
                  >
                </span>
              </div>
              <div class="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  class="h-2 rounded-full transition-all duration-300 {usagePercent >
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
                        class="flex gap-2"
                        role="group"
                        aria-label="Expiration options"
                      >
                        <button
                          type="button"
                          onclick={() => uploadStore.setExpiresInDays(1)}
                          class="hover:cursor-pointer flex-1 py-2 px-4 rounded-[calc(var(--radius-2xl)-1px)] transition-colors
													{uploadStore.expiresInDays === 1
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-accent'}"
                        >
                          1 day
                        </button>
                        <button
                          type="button"
                          onclick={() => uploadStore.setExpiresInDays(3)}
                          class="flex-1 hover:cursor-pointer py-2 px-4 rounded-[calc(var(--radius-2xl)-1px)] transition-colors
													{uploadStore.expiresInDays === 3
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-accent'}"
                        >
                          3 days
                        </button>
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
                        <div class="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password (min 8 characters)"
                            value={uploadStore.password}
                            oninput={(e) =>
                              uploadStore.setPassword(e.currentTarget.value)}
                            class="w-full py-2 px-3 pr-10 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:border-ring/25 focus:outline-none"
                          />
                          <button
                            type="button"
                            onclick={() => (showPassword = !showPassword)}
                            class=" hover:cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        {#if uploadStore.password.length > 0 && uploadStore.password.length < MIN_PASSWORD_LENGTH}
                          <p class="text-xs text-warning-foreground">
                            Password must be at least {MIN_PASSWORD_LENGTH} characters
                          </p>
                        {/if}
                      {/if}
                    </div>

                    <button
                      type="button"
                      onclick={handleUpload}
                      disabled={uploadStore.passwordEnabled &&
                        uploadStore.password.length > 0 &&
                        uploadStore.password.length < MIN_PASSWORD_LENGTH}
                      class="hover:cursor-pointer w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-medium rounded-[calc(var(--radius-2xl)-1px)] transition-colors"
                    >
                      Create Link
                    </button>
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

    <div class="mt-8 text-center text-sm text-muted-foreground">
      <p>Files are encrypted in your browser before upload.</p>
      <p>We never see your files or encryption keys.</p>
    </div>
  </div>
</div>
