<script lang="ts">
  import { goto } from "$app/navigation";
  import { api, ApiError } from "$lib/api/client";
  import { uploadEncryptedBlobMultipart } from "$lib/upload/multipart";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import CircularProgress from "$lib/components/CircularProgress.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import HowItWorks from "$lib/components/HowItWorks.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { MAX_TOTAL_UPLOAD_SIZE } from "$lib/config/limits";
  import {
    encryptFile,
    encryptFilename,
    encryptString,
  } from "$lib/crypto/encrypt";
  import { exportKey, generateKey, wrapKey } from "$lib/crypto/key";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import type { FileUploadState } from "$lib/stores/upload.types";
  import { cn, formatEta, formatSize, formatSpeed } from "$lib/utils";
  import {
    isUnlocked,
    unlockWithPassword,
    unlockWithPhrase,
    wrapTransferKey,
  } from "$lib/vault/client";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconCopyRegular from "phosphor-icons-svelte/IconCopyRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import IconPlusRegular from "phosphor-icons-svelte/IconPlusRegular.svelte";
  import IconUploadRegular from "phosphor-icons-svelte/IconUploadRegular.svelte";
  import IconWarningRegular from "phosphor-icons-svelte/IconWarningRegular.svelte";
  import { onMount } from "svelte";

  const SITE_URL = "https://tessil.app";
  const PAGE_TITLE = "Tessil — Send anything. We see nothing.";
  const PAGE_DESCRIPTION =
    "End-to-end encrypted file transfer. Your browser encrypts before upload — we never see your files or the key.";

  const homeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Tessil",
        url: SITE_URL,
        description: PAGE_DESCRIPTION,
      },
      {
        "@type": "WebApplication",
        name: "Tessil",
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
  const TITLE_MAX = 200;

  const EXPIRES_OPTIONS = $derived.by(() => {
    const base = [
      { value: 1, label: "1h" },
      { value: 6, label: "6h" },
      { value: 12, label: "12h" },
      { value: 24, label: "1d" },
    ];
    if (!auth.user) return base;
    const free = [...base, { value: 72, label: "3d" }];
    if (auth.user.tier !== "pro") return free;
    return [
      ...free,
      { value: 168, label: "7d" },
      { value: 336, label: "14d" },
      { value: 720, label: "30d" },
    ];
  });

  $effect(() => {
    if (!EXPIRES_OPTIONS.some((o) => o.value === uploadStore.expiresInHours)) {
      const legal = EXPIRES_OPTIONS[EXPIRES_OPTIONS.length - 1]!.value;
      uploadStore.setExpiresInHours(legal);
    }
  });

  const DOWNLOADS_OPTIONS: { value: number | null; label: string }[] = [
    { value: null, label: "Unlimited" },
    { value: 1, label: "1" },
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 25, label: "25" },
  ];

  type FeaturedItem = {
    slug: string;
    src: string;
    title: string;
    artist: string;
    artistUrl: string | null;
    tone?: "light" | "dark";
  };

  let copied = $state(false);
  let uploadSpeed = $state<number | null>(null);
  let uploadEta = $state<number | null>(null);
  let lastSpeedTs = 0;
  let uploadController: AbortController | null = null;
  let lastUploadVaulted = $state(false);
  let isDraggingOver = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let featured = $state<FeaturedItem | null>(null);
  let imageRevealed = $state(false);

  let unlockOpen = $state(false);
  let unlockMode = $state<"password" | "phrase">("password");
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let unlockError = $state<string | null>(null);
  let isUnlockingVault = $state(false);
  let pendingResume: ((unlocked: boolean) => void) | null = null;

  onMount(async () => {
    try {
      const res = await fetch("/featured/manifest.json", { cache: "no-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: FeaturedItem[] };
      if (Array.isArray(data.items) && data.items.length > 0) {
        const idx = Math.floor(Math.random() * data.items.length);
        featured = data.items[idx];
      }
    } catch {
      // Manifest fetch is best-effort; page renders fine without art.
    }
  });

  function fileRowStatus(
    s: FileUploadState["status"],
  ): "idle" | "uploading" | "complete" | "error" {
    if (s === "pending") return "idle";
    if (s === "complete") return "complete";
    if (s === "error") return "error";
    return "uploading";
  }

  function handleFilesSelect(files: File[]) {
    const tooLong = files.find(
      (f) => new TextEncoder().encode(f.name).length > MAX_FILENAME_BYTES,
    );
    if (tooLong) {
      uploadStore.setError(
        `"${tooLong.name}" has a filename that is too long (max ${MAX_FILENAME_BYTES} bytes).`,
      );
      return;
    }

    const currentTotal = uploadStore.files.reduce(
      (sum, f) => sum + f.file.size,
      0,
    );
    const newFilesSize = files.reduce((sum, f) => sum + f.size, 0);
    const projectedTotal = currentTotal + newFilesSize;

    if (projectedTotal > MAX_TOTAL_UPLOAD_SIZE) {
      const remaining = MAX_TOTAL_UPLOAD_SIZE - currentTotal;
      uploadStore.setError(
        `Not enough space. You have ${formatSize(remaining)} remaining.`,
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

  function stopUpload() {
    uploadController?.abort();
  }

  // Return to the settings view with the same files still queued (statuses
  // cleared back to pending, any error dropped). Used after a user cancel and
  // from the error state's "Back".
  function returnToSettings() {
    uploadStore.files.forEach((_, idx) =>
      uploadStore.setFileStatus(idx, "pending", 0),
    );
    uploadStore.setOverallProgress(0);
    uploadStore.setStatus("idle");
    uploadStore.clearError();
    uploadSpeed = null;
    uploadEta = null;
  }

  // Re-run the upload with the same files (from the error state's "Try again").
  async function retryUpload() {
    returnToSettings();
    await handleUpload();
  }

  async function copyShareLink() {
    if (!uploadStore.shareUrl) return;
    try {
      await navigator.clipboard.writeText(uploadStore.shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = uploadStore.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function formatExpiry(hours: number): string {
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  function formatDownloads(max: number | null): string {
    if (max === null) return "Unlimited downloads";
    return `Max ${max} download${max !== 1 ? "s" : ""}`;
  }

  // Turn raw upload failures into something a user should read. The API's 4xx
  // responses (tier limits, validation, auth) are already written for users, so
  // keep those; server (5xx) and direct-to-R2 transport errors get a generic line
  // instead of leaking "API error: 502 …" / "part upload failed (network)".
  function friendlyUploadError(error: unknown): {
    message: string;
    upgradeUrl?: string;
  } {
    if (error instanceof ApiError) {
      if (error.status === 0 || error.status >= 500) {
        return {
          message:
            "Something went wrong on our end during the upload. Please try again in a moment.",
        };
      }
      return { message: error.message, upgradeUrl: error.upgradeUrl };
    }
    const raw = error instanceof Error ? error.message.toLowerCase() : "";
    if (/network|connection|lost|fetch|load failed/.test(raw)) {
      return {
        message:
          "The connection dropped during the upload. Check your network and try again.",
      };
    }
    return { message: "The upload didn't finish. Please try again." };
  }

  async function ensureVaultUnlocked(): Promise<boolean> {
    if (!auth.user) return false;
    if (await isUnlocked(auth.user.id)) return true;
    unlockMode = "password";
    unlockPassword = "";
    unlockPhrase = "";
    unlockError = null;
    unlockOpen = true;
    return await new Promise<boolean>((resolve) => {
      pendingResume = resolve;
    });
  }

  function closeUnlockModal() {
    unlockOpen = false;
    unlockError = null;
    unlockPassword = "";
    unlockPhrase = "";
    const resume = pendingResume;
    pendingResume = null;
    resume?.(false);
  }

  async function submitUnlock(e: SubmitEvent) {
    e.preventDefault();
    if (isUnlockingVault || !auth.user) return;
    unlockError = null;
    isUnlockingVault = true;
    try {
      const result =
        unlockMode === "password"
          ? await unlockWithPassword(auth.user.id, unlockPassword)
          : await unlockWithPhrase(auth.user.id, unlockPhrase);
      if (!result.ok) {
        unlockError =
          result.reason === "wrong_password"
            ? "That password didn't unlock the vault."
            : result.reason === "wrong_phrase"
              ? "That recovery phrase doesn't match. Check spelling and word order."
              : result.reason === "not_setup"
                ? "Vault isn't set up yet. Set one up from settings first."
                : "We couldn't read your vault. Try again.";
        return;
      }
      unlockOpen = false;
      unlockPassword = "";
      unlockPhrase = "";
      const resume = pendingResume;
      pendingResume = null;
      resume?.(true);
    } catch (err) {
      unlockError = err instanceof Error ? err.message : "Couldn't unlock.";
    } finally {
      isUnlockingVault = false;
    }
  }

  async function handleUpload() {
    const files = uploadStore.files;
    if (files.length === 0) return;

    uploadSpeed = null;
    uploadEta = null;
    lastSpeedTs = 0;

    const controller = new AbortController();
    uploadController = controller;
    let createdTransferId: string | null = null;

    try {
      uploadStore.setStatus("validating");

      for (let i = 0; i < files.length; i++) {
        const file = files[i].file;
        const firstBytes = await file.slice(0, 16).arrayBuffer();
        const magicBytes = btoa(
          String.fromCharCode(...new Uint8Array(firstBytes)),
        );

        const validation = await api.validateMagicBytes(magicBytes);
        if (!validation.valid) {
          uploadStore.setError(
            `"${file.name}": ${validation.reason ?? "File type not allowed"}`,
          );
          return;
        }
      }

      if (auth.isAuthenticated && auth.user) {
        const unlocked = await ensureVaultUnlocked();
        if (!unlocked) {
          uploadStore.setError(
            "Vault stays locked — sign in or unlock to keep this transfer in your dashboard.",
          );
          return;
        }
      }

      const key = await generateKey();
      const password =
        uploadStore.password.length >= MIN_PASSWORD_LENGTH
          ? uploadStore.password
          : undefined;

      const trimmedTitle = uploadStore.title.trim();
      let encryptedTitlePayload:
        | { encryptedTitle: string; encryptedTitleIv: string }
        | null = null;
      if (trimmedTitle.length > 0 && trimmedTitle.length <= TITLE_MAX) {
        const { ciphertext, iv } = await encryptString(trimmedTitle, key);
        encryptedTitlePayload = {
          encryptedTitle: ciphertext,
          encryptedTitleIv: iv,
        };
      }

      const transfer = await api.createTransfer(
        uploadStore.expiresInHours,
        password,
        uploadStore.maxDownloads,
        encryptedTitlePayload,
      );
      createdTransferId = transfer.transferId;

      const keyString = password
        ? await wrapKey(key, password)
        : await exportKey(key);

      uploadStore.setStatus("encrypting");

      let uploadFailed = false;
      for (let i = 0; i < files.length; i++) {
        if (controller.signal.aborted)
          throw new DOMException("aborted", "AbortError");
        uploadStore.setCurrentFileIndex(i);
        const fileState = files[i];
        const file = fileState.file;

        try {
          uploadStore.setFileStatus(i, "encrypting", 0);
          const { encryptedName, iv: nameIv } = await encryptFilename(
            file.name,
            key,
          );

          const { encryptedBlob, iv: fileIv } = await encryptFile(
            file,
            key,
            (p) => uploadStore.setFileStatus(i, "encrypting", p * 0.15),
          );

          if (controller.signal.aborted)
            throw new DOMException("aborted", "AbortError");

          uploadStore.setFileStatus(i, "encrypting", 15);
          uploadStore.setFileStatus(i, "uploading", 15);

          const initResponse = await api.initMultipartUpload({
            transferId: transfer.transferId,
            contentType: file.type || "application/octet-stream",
            encryptedName,
            encryptedNameIv: nameIv,
            fileIv,
            size: encryptedBlob.size,
          });

          await uploadEncryptedBlobMultipart({
            uploadId: initResponse.uploadId,
            fileId: initResponse.fileId,
            transferId: transfer.transferId,
            r2Key: initResponse.r2Key,
            encryptedBlob,
            partUrls: initResponse.partUrls,
            signal: controller.signal,
            onProgress: (p) => {
              uploadStore.setFileStatus(i, "uploading", 15 + p.percent * 0.85);
              // Throttle the displayed speed/ETA to ~1s so the readout stays
              // steady instead of flickering on every progress event.
              const now = performance.now();
              if (p.percent >= 100 || now - lastSpeedTs > 1000) {
                uploadSpeed = p.bytesPerSecond;
                uploadEta = p.etaSeconds;
                lastSpeedTs = now;
              }
            },
          });

          uploadStore.setFileStatus(i, "complete", 100);
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") throw err;
          uploadStore.setFileStatus(
            i,
            "error",
            0,
            err instanceof Error ? err.message : "Upload failed",
          );
          uploadFailed = true;
          break;
        }
      }

      if (uploadFailed) {
        api.abortTransfer(transfer.transferId).catch(() => {});
        throw new Error(
          uploadStore.files.find((f) => f.status === "error")?.error ??
            "Upload failed",
        );
      }

      uploadStore.setStatus("uploading");

      let vaultWrap: { wrappedKey: string } | undefined;
      lastUploadVaulted = false;
      if (auth.isAuthenticated && auth.user) {
        const rawTransferKey = await crypto.subtle.exportKey("raw", key);
        const wrapped = await wrapTransferKey(auth.user.id, rawTransferKey);
        vaultWrap = { wrappedKey: wrapped };
        lastUploadVaulted = true;
      }

      const completeResponse = await api.completeTransfer(
        transfer.transferId,
        vaultWrap,
      );

      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}${completeResponse.shareUrl}#${keyString}`;
      uploadStore.setShareUrl(shareUrl);
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        // User cancelled — clean up the partial transfer and return to the
        // settings view with the same files still queued.
        if (createdTransferId)
          api.abortTransfer(createdTransferId).catch(() => {});
        returnToSettings();
        return;
      }
      if (uploadStore.status !== "error") {
        const friendly = friendlyUploadError(error);
        uploadStore.setError(friendly.message, friendly.upgradeUrl);
      }
    } finally {
      uploadController = null;
    }
  }

  const isProcessing = $derived(
    uploadStore.status === "validating" ||
      uploadStore.status === "encrypting" ||
      uploadStore.status === "uploading",
  );

  const totalSize = $derived(
    uploadStore.files.reduce((sum, f) => sum + f.file.size, 0),
  );

  const hasFiles = $derived(uploadStore.files.length > 0);

  const isSuccess = $derived(
    uploadStore.status === "complete" && !!uploadStore.shareUrl,
  );

  // The settings body scrolls (overflow-y-auto) once settled, but during the
  // panel's grow/shrink morph its full-height content briefly exceeds the
  // still-animating container and flashes a scrollbar. Suppress overflow for
  // the morph window so the transition stays clean.
  let isMorphing = $state(false);
  let morphTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void hasFiles;
    void isSuccess;
    isMorphing = true;
    morphTimer = setTimeout(() => (isMorphing = false), 480);
    return () => clearTimeout(morphTimer);
  });

  const currentFile = $derived(uploadStore.files[uploadStore.currentFileIndex]);
  const phaseLabel = $derived.by(() => {
    if (uploadStore.status === "validating") return "Checking…";
    return currentFile?.status === "uploading" ? "Uploading…" : "Encrypting…";
  });

  const passwordTooShort = $derived(
    uploadStore.password.length > 0 &&
      uploadStore.password.length < MIN_PASSWORD_LENGTH,
  );

  const canSubmitUnlock = $derived(
    !isUnlockingVault &&
      (unlockMode === "password"
        ? unlockPassword.length > 0
        : unlockPhrase.trim().length > 0),
  );

  function handlePageDragOver(e: DragEvent) {
    e.preventDefault();
    if (isProcessing) return;
    isDraggingOver = true;
  }

  function handlePageDragLeave(e: DragEvent) {
    if (e.relatedTarget === null) isDraggingOver = false;
  }

  function handlePageDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingOver = false;
    if (isProcessing) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) handleFilesSelect(Array.from(files));
  }

  function openFilePicker() {
    if (isProcessing) return;
    fileInput?.click();
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      handleFilesSelect(Array.from(input.files));
      input.value = "";
    }
  }

  function goToSetup() {
    goto("/setup/vault");
  }
</script>

<svelte:head>
  <title>{PAGE_TITLE}</title>
  <meta name="description" content={PAGE_DESCRIPTION} />
  <meta
    name="robots"
    content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  />
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

<input
  bind:this={fileInput}
  type="file"
  multiple
  class="hidden"
  onchange={handleFileChange}
  disabled={isProcessing}
/>

<!-- -mt-14 pulls the image behind the sticky nav so the glass effect actually sees through to artwork. -->
<section
  ondragover={handlePageDragOver}
  ondragleave={handlePageDragLeave}
  ondrop={handlePageDrop}
  class={cn(
    "relative min-h-screen -mt-14 overflow-hidden transition-colors duration-200 ease-out",
    isDraggingOver && "bg-primary/5",
  )}
>
  {#if featured}
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-cover bg-center pointer-events-none"
      style="
        background-image: url('{featured.src}');
        clip-path: {imageRevealed ? 'inset(0 round 0)' : 'inset(calc(100% - 22rem) 0 0 calc(100% - 50rem) round 1.5rem 0 0 0)'};
        transition: clip-path 1200ms cubic-bezier(0.83, 0, 0.17, 1);
      "
    ></div>
  {/if}

  {#if isDraggingOver}
    <div
      aria-hidden="true"
      class="absolute inset-0 ring-2 ring-primary ring-inset pointer-events-none"
    ></div>
  {/if}

  <div class="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 lg:pt-32 pb-24">
    <div class="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-6 sm:gap-10 lg:gap-12 items-stretch">

      <!-- Height animates between empty (420) and has-files (580) sizes; sync'd with the extension's width animation. -->
      <aside
        class={cn(
          "relative sm:sticky sm:top-6 sm:flex sm:items-stretch",
          isSuccess ? "sm:h-auto" : hasFiles ? "sm:h-[580px]" : "sm:h-[420px]",
        )}
        style="transition: height 450ms cubic-bezier(0.16, 1, 0.3, 1);"
      >
        <!-- Loses right-side border + rounded corners when the extension is open so they visually fuse. -->
        <div
          class={cn(
            "glass-panel relative z-10 w-full sm:w-[320px] sm:flex sm:flex-col ease-liquid",
            hasFiles &&
              !isSuccess &&
              "lg:rounded-tr-none lg:rounded-br-none lg:border-r-transparent",
          )}
          style="transition: border-radius 450ms cubic-bezier(0.16, 1, 0.3, 1), border-color 450ms cubic-bezier(0.16, 1, 0.3, 1);"
        >
          {#if isSuccess}
            <div class="px-5 py-4 border-b border-border">
              <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
                <IconLockRegular class="size-4 text-primary" />
                Share link ready
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Decrypts in the recipient's browser.
              </p>
            </div>
            <div class="p-5 space-y-3">
              <TextInput
                id="home-share-link"
                aria-label="Share link"
                value={uploadStore.shareUrl ?? ""}
                readonly
                mono
                onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
              />
              <p class="text-xs text-muted-foreground">
                Expires in {formatExpiry(uploadStore.expiresInHours)}.
                {formatDownloads(uploadStore.maxDownloads)}.
                {#if lastUploadVaulted}
                  Saved to your dashboard.
                {/if}
              </p>
            </div>
            <div class="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/30">
              <Button variant="secondary" fullWidth={false} class="flex-1 whitespace-nowrap" onclick={resetUpload}>
                Send another
              </Button>
              <Button variant="primary" fullWidth={false} class="flex-1" onclick={copyShareLink}>
                {#if copied}
                  <IconCheckRegular class="size-4" />
                  Copied
                {:else}
                  <IconCopyRegular class="size-4" />
                  Copy link
                {/if}
              </Button>
            </div>
          {:else if !hasFiles}
            <button
              type="button"
              onclick={openFilePicker}
              disabled={isProcessing}
              aria-label="Drop files here or click to browse"
              class={cn(
                "w-full p-5 flex flex-col items-center justify-center text-center hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-lg transition-colors duration-200 ease-out sm:flex-1",
                isDraggingOver ? "bg-primary/5" : "hover:bg-accent",
                isProcessing && "opacity-60 cursor-not-allowed",
              )}
            >
              <span class="inline-flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary">
                <IconUploadRegular class="size-4" />
              </span>
              <div class="space-y-0.5 mt-3.5">
                <p class="text-sm font-semibold text-foreground leading-snug">
                  {#if isDraggingOver}
                    Release to encrypt
                  {:else}
                    Drop a file
                  {/if}
                </p>
                <p class="text-xs text-muted-foreground leading-relaxed max-w-[16rem]">
                  Or click to browse. Encrypts in your browser.
                </p>
              </div>
              <span class="mt-4 text-[11px] text-muted-foreground/80">
                Up to {formatSize(MAX_TOTAL_UPLOAD_SIZE)} per transfer
              </span>
            </button>
          {:else}
            <div class="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
                <IconLockRegular class="size-4 text-primary shrink-0" />
                <span class="truncate">
                  {uploadStore.files.length} file{uploadStore.files.length !== 1 ? "s" : ""}
                  · {formatSize(totalSize)}
                </span>
              </div>
              {#if !isProcessing}
                <button
                  type="button"
                  onclick={resetUpload}
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
                >
                  Clear
                </button>
              {/if}
            </div>

            <div class={cn("px-5 py-4 flex flex-col gap-4 flex-1 min-h-0 file-list-scroll overflow-x-hidden", isMorphing ? "overflow-y-hidden" : "overflow-y-auto")}>
              {#if uploadStore.status === "error"}
                <div role="alert" class="flex flex-1 flex-col items-center justify-center text-center gap-3 py-4">
                  <span class="inline-flex items-center justify-center size-12 rounded-full bg-destructive/10 text-destructive-foreground">
                    <IconWarningRegular class="size-6" />
                  </span>
                  <div class="space-y-1">
                    <p class="text-sm font-semibold text-foreground">Upload failed</p>
                    <p class="text-xs text-muted-foreground leading-relaxed max-w-[18rem]">
                      {uploadStore.error}
                    </p>
                  </div>
                </div>
              {:else}
                {#if auth.isAuthenticated && auth.needsVaultSetup}
                <Alert tone="warning" title="Set up your vault first">
                  Signed-in uploads save filenames to your dashboard.
                  {#snippet action()}
                    <Button variant="secondary" fullWidth={false} onclick={goToSetup}>
                      Set up vault
                    </Button>
                  {/snippet}
                </Alert>
              {/if}

              {#if isProcessing}
                <div class="flex flex-1 flex-col items-center justify-center text-center gap-3 py-4">
                  <CircularProgress
                    percent={uploadStore.overallProgress}
                    sublabel={phaseLabel}
                  />
                  <div class="space-y-0.5 text-xs text-muted-foreground" aria-live="polite">
                    {#if currentFile?.status === "uploading" && uploadSpeed}
                      <p class="tabular-nums">
                        {formatSpeed(uploadSpeed)}{#if uploadEta} · {formatEta(uploadEta)} left{/if}
                      </p>
                    {/if}
                    {#if uploadStore.files.length > 1}
                      <p>File {uploadStore.currentFileIndex + 1} of {uploadStore.files.length}</p>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Inline file list for viewports below the extension's breakpoint. -->
              <div class="lg:hidden">
                {#each uploadStore.files as fileState, index (fileState.id)}
                  <FileRow
                    name={fileState.file.name}
                    size={formatSize(fileState.file.size)}
                    kind="upload"
                    status={fileRowStatus(fileState.status)}
                    percent={fileState.progress}
                    onRemove={() => removeFile(index)}
                  />
                {/each}
              </div>

              {#if !isProcessing}
                <button
                  type="button"
                  onclick={openFilePicker}
                  class="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:cursor-pointer"
                >
                  <IconPlusRegular class="size-4" />
                  Add more files
                </button>

                <div class="space-y-4 pt-1">
                  <div class="space-y-1">
                    <TextInput
                      id="home-transfer-title"
                      label="Transfer name (optional)"
                      placeholder="e.g. Q3 designs"
                      value={uploadStore.title}
                      oninput={(e) =>
                        uploadStore.setTitle(
                          (e.currentTarget as HTMLInputElement).value,
                        )}
                      maxlength={TITLE_MAX + 32}
                    />
                    {#if uploadStore.title.length > TITLE_MAX}
                      <p class="text-xs text-warning-foreground">
                        {uploadStore.title.length} / {TITLE_MAX} — too long.
                      </p>
                    {/if}
                  </div>

                  <SegmentedControl
                    label="Expires in"
                    options={EXPIRES_OPTIONS}
                    value={uploadStore.expiresInHours}
                    onChange={(v) => uploadStore.setExpiresInHours(v)}
                  />

                  <SegmentedControl
                    label="Max downloads"
                    options={DOWNLOADS_OPTIONS}
                    value={uploadStore.maxDownloads}
                    onChange={(v) => uploadStore.setMaxDownloads(v)}
                  />

                  <div class="space-y-1">
                    <PasswordInput
                      id="home-transfer-password"
                      label="Password (optional)"
                      placeholder="Add a password to protect the link"
                      value={uploadStore.password}
                      oninput={(e) =>
                        uploadStore.setPassword(
                          (e.currentTarget as HTMLInputElement).value,
                        )}
                    />
                    {#if passwordTooShort}
                      <p class="text-xs text-warning-foreground">
                        At least {MIN_PASSWORD_LENGTH} characters.
                      </p>
                    {/if}
                  </div>
                </div>
              {/if}
              {/if}
            </div>

            <div class="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/30">
              {#if isProcessing}
                <Button variant="secondary" fullWidth={false} class="flex-1" onclick={stopUpload}>
                  Stop
                </Button>
              {:else if uploadStore.status === "error"}
                <Button variant="secondary" fullWidth={false} class="flex-1" onclick={returnToSettings}>
                  Back
                </Button>
                <Button variant="primary" fullWidth={false} class="flex-1" onclick={retryUpload}>
                  Try again
                </Button>
              {:else}
                <Button
                  variant="primary"
                  fullWidth={false}
                  class="flex-1"
                  onclick={handleUpload}
                  disabled={passwordTooShort || (auth.isAuthenticated && auth.needsVaultSetup)}
                >
                  Create share link
                </Button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Extension slides out as an in-flow flex sibling so the grid's first column tracks its width. -->
        <div
          aria-hidden={!(hasFiles && !isSuccess)}
          class={cn(
            "hidden lg:block overflow-hidden ease-liquid shrink-0",
            hasFiles && !isSuccess
              ? "w-[300px]"
              : "w-0 pointer-events-none",
          )}
          style="transition: width 450ms cubic-bezier(0.16, 1, 0.3, 1);"
        >
          <div class="glass-panel w-[300px] h-full flex flex-col rounded-l-none border-l-0">
            <div class="px-5 py-4 border-b border-border">
              <p class="text-sm font-semibold text-foreground">
                Files
                <span class="font-normal text-muted-foreground">
                  · Queued for this transfer.
                </span>
              </p>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden file-list-scroll">
              {#each uploadStore.files as fileState, index (fileState.id)}
                <FileRow
                  name={fileState.file.name}
                  size={formatSize(fileState.file.size)}
                  kind="upload"
                  status={fileRowStatus(fileState.status)}
                  percent={fileState.progress}
                  onRemove={() => removeFile(index)}
                />
              {/each}
            </div>
          </div>
        </div>
      </aside>

      <div class="space-y-4 sm:text-right sm:max-w-md sm:ml-auto sm:pt-4">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.05]" style="letter-spacing: -0.03em">
          Send anything.
          <br />
          We see nothing.
        </h1>
        <p class="text-base text-muted-foreground leading-relaxed">
          End-to-end encrypted in your browser. The key never
          reaches our server.
        </p>
        <p class="text-sm text-muted-foreground/80 leading-relaxed">
          Drop a file in the panel — or anywhere on this page.
        </p>
      </div>
    </div>
  </div>

  {#if featured}
    <div class="absolute right-[25rem] translate-x-1/2 bottom-4 z-20 flex flex-col items-center gap-1.5">
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

<div class="bg-background border-t border-border">
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
    <HowItWorks class="mt-0 pt-0 border-t-0" />

    <section class="mt-14 pt-10 border-t border-border/60 space-y-3 text-sm text-muted-foreground leading-relaxed">
      <h2 class="text-base font-semibold text-foreground">
        Tessil, explained
      </h2>
      <p>
        Tessil is an end-to-end encrypted file transfer service.
        Files are scrambled in your browser before they leave your
        device. The decryption key lives in the URL fragment of the
        share link — the part after <code>#</code> that browsers
        don't send to servers. We never see your files, your
        filenames, or your keys.
      </p>
      <p>
        Anonymous transfers expire in hours; signed-in transfers
        can run longer and live on your dashboard. Password
        protection adds a second factor independent of the link.
        Read more about the security model on the
        <a href="/security" class="text-primary hover:underline">security page</a>.
      </p>
      <p>
        Built and run by one person, and free to use. If Tessil saves you a
        headache, you can support the project — the link's in the footer below.
      </p>
    </section>

    <SiteFooter current="home" />
  </div>
</div>

<Modal
  open={unlockOpen}
  title="Unlock your vault to upload"
  description="Signed-in transfers are saved to your dashboard. Unlock your vault so we can wrap this transfer for later."
  onClose={closeUnlockModal}
>
  <form onsubmit={submitUnlock} class="space-y-4" novalidate>
    {#if unlockMode === "password"}
      <PasswordInput
        id="home-unlock-password"
        label="Vault password"
        autocomplete="current-password"
        required
        bind:value={unlockPassword}
        disabled={isUnlockingVault}
      />
    {:else}
      <Textarea
        id="home-unlock-phrase"
        label="Recovery phrase"
        placeholder="word word word …"
        rows={3}
        bind:value={unlockPhrase}
        disabled={isUnlockingVault}
      />
    {/if}

    {#if unlockError}
      <Alert tone="destructive">{unlockError}</Alert>
    {/if}

    <button
      type="button"
      onclick={() => {
        unlockMode = unlockMode === "password" ? "phrase" : "password";
        unlockError = null;
      }}
      class="text-xs text-muted-foreground hover:text-foreground hover:cursor-pointer underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
      disabled={isUnlockingVault}
    >
      {unlockMode === "password"
        ? "Forgot your password? Use your recovery phrase instead."
        : "Have your password? Use it instead."}
    </button>

    {#snippet footer()}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={closeUnlockModal}
        disabled={isUnlockingVault}
      >
        Cancel
      </Button>
      <Button type="submit" fullWidth={false} disabled={!canSubmitUnlock}>
        {#if isUnlockingVault}
          <Spinner aria-hidden="true" />
          Unlocking…
        {:else}
          Unlock and upload
        {/if}
      </Button>
    {/snippet}
  </form>
</Modal>

<style>
  /* Minimal scrollbar — neutral grayscale, never brand colour. */
  :global(.file-list-scroll) {
    scrollbar-width: thin;
    scrollbar-color: rgb(0 0 0 / 0.18) transparent;
  }
  :global(.file-list-scroll::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }
  :global(.file-list-scroll::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.file-list-scroll::-webkit-scrollbar-thumb) {
    background-color: rgb(0 0 0 / 0.18);
    border-radius: 9999px;
    border: 1px solid transparent;
    background-clip: content-box;
  }
  :global(.file-list-scroll::-webkit-scrollbar-thumb:hover) {
    background-color: rgb(0 0 0 / 0.32);
  }

  :global(.ease-liquid) {
    transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
</style>
