<script lang="ts">
  import { goto } from "$app/navigation";
  import { api, ApiError, type EntitlementResponse } from "$lib/api/client";
  import { clearPass, loadPass, type StoredPass } from "$lib/billing/pass";
  import { uploadEncryptedStreamMultipart } from "$lib/upload/multipart";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import CircularProgress from "$lib/components/CircularProgress.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import HowItWorks from "$lib/components/HowItWorks.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import PaywallModal from "$lib/components/PaywallModal.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { MAX_TOTAL_UPLOAD_SIZE } from "$lib/config/limits";
  import { PASS_PRICE, PLAN_PRICE } from "$lib/config/pricing";
  import { SITE_URL } from "$lib/config/site";
  import {
    encryptFilename,
    encryptString,
  } from "$lib/crypto/encrypt";
  import { encryptFileStream } from "$lib/crypto/streaming";
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

  const PAGE_TITLE = "Tessil - Send anything. We see nothing.";
  const PAGE_DESCRIPTION =
    "End-to-end encrypted file transfer. Your browser encrypts before upload - we never see your files or the key.";

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
        offers: [
          {
            "@type": "Offer",
            name: "Single transfer",
            price: "1",
            priceCurrency: "EUR",
          },
          {
            "@type": "Offer",
            name: "Monthly",
            price: "5",
            priceCurrency: "EUR",
          },
        ],
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

  // Null until the API answers. An unreachable API reads as "no paywall"
  // here, which is safe: the server enforces it on create-transfer anyway.
  let entitlement = $state<EntitlementResponse | null>(null);
  const paywallOn = $derived(entitlement?.paywall === true);
  const mustPay = $derived(paywallOn && entitlement?.entitled === false);
  const maxTotalSize = $derived(
    paywallOn && entitlement
      ? entitlement.paidCaps.maxTransferSize
      : MAX_TOTAL_UPLOAD_SIZE,
  );
  const paidMaxExpiryHours = $derived(
    entitlement ? Math.max(...entitlement.paidCaps.allowedExpiryHours) : 720,
  );

  const EXPIRES_OPTIONS = $derived.by(() => {
    const base = [
      { value: 1, label: "1h" },
      { value: 6, label: "6h" },
      { value: 12, label: "12h" },
      { value: 24, label: "1d" },
    ];
    const free = [...base, { value: 72, label: "3d" }];
    // With the paywall on every send is a paid one, so everyone gets the
    // paid expiry options.
    if (!paywallOn) {
      if (!auth.user) return base;
      if (auth.user.tier !== "pro") return free;
    }
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

  // Gates the modal out of the prerendered homepage; its copy would
  // otherwise ship in a closed <dialog> on the primary SEO target.
  let paywallMounted = $state(false);
  let paywallOpen = $state(false);
  let paywallResume = $state<StoredPass | null>(null);
  let pendingPayment:
    | ((result: { ok: boolean; passToken: string | null }) => void)
    | null = null;

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

  onMount(() => {
    paywallMounted = true;
    void refreshEntitlement();
  });

  async function refreshEntitlement(): Promise<EntitlementResponse | null> {
    try {
      entitlement = await api.getEntitlement();
    } catch {
      // Keep whatever we had; the server is the real gate.
    }
    return entitlement;
  }

  // Resolves once the sender is paid up, or with ok=false if they back out.
  // A pass bought earlier and not yet spent is reused without asking again.
  async function ensurePaid(): Promise<{ ok: boolean; passToken: string | null }> {
    const current = await refreshEntitlement();
    if (!current?.paywall || current.entitled) return { ok: true, passToken: null };

    const stored = loadPass();
    let resume: StoredPass | null = null;
    if (stored) {
      try {
        const { state } = await api.getPassStatus(stored.token);
        if (state === "paid") return { ok: true, passToken: stored.token };
        if (state === "unpaid") resume = stored;
        else clearPass();
      } catch {
        resume = stored;
      }
    }

    paywallResume = resume;
    paywallOpen = true;
    return await new Promise((resolve) => {
      pendingPayment = resolve;
    });
  }

  function settlePayment(result: { ok: boolean; passToken: string | null }) {
    paywallOpen = false;
    paywallResume = null;
    const resume = pendingPayment;
    pendingPayment = null;
    resume?.(result);
  }

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

    if (projectedTotal > maxTotalSize) {
      const remaining = maxTotalSize - currentTotal;
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

    const payment = await ensurePaid();
    if (!payment.ok) return;

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
            "Vault stays locked - sign in or unlock to keep this transfer in your dashboard.",
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
        payment.passToken,
      );
      createdTransferId = transfer.transferId;

      const keyString = password
        ? await wrapKey(key, password)
        : await exportKey(key);

      uploadStore.setStatus("encrypting");

      let uploadFailed = false;
      let uploadFailure: unknown = null;
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

          // Streaming encryption: the ciphertext is produced lazily as Parts are
          // read off the stream, so memory stays bounded to a few Parts
          // regardless of file size, and the upload starts immediately instead
          // of after a whole-file encrypt. Encryption now overlaps upload, so
          // there is no separate encrypt progress phase.
          const encryptor = encryptFileStream(file, key);

          if (controller.signal.aborted)
            throw new DOMException("aborted", "AbortError");

          uploadStore.setFileStatus(i, "uploading", 0);

          const initResponse = await api.initMultipartUpload({
            transferId: transfer.transferId,
            contentType: file.type || "application/octet-stream",
            encryptedName,
            encryptedNameIv: nameIv,
            fileIv: encryptor.ivB64,
            size: encryptor.size,
          });

          await uploadEncryptedStreamMultipart({
            uploadId: initResponse.uploadId,
            fileId: initResponse.fileId,
            transferId: transfer.transferId,
            r2Key: initResponse.r2Key,
            source: encryptor.stream,
            partUrls: initResponse.partUrls,
            signal: controller.signal,
            onProgress: (p) => {
              uploadStore.setFileStatus(i, "uploading", p.percent);
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
          uploadFailure = err;
          uploadFailed = true;
          break;
        }
      }

      if (uploadFailed) {
        api.abortTransfer(transfer.transferId).catch(() => {});
        // Re-throw the original error (keeps ApiError type, so tier-limit
        // messages + upgradeUrl survive through to friendlyUploadError).
        throw uploadFailure ?? new Error("Upload failed");
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
      if (payment.passToken) clearPass();
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        // User cancelled - clean up the partial transfer and return to the
        // settings view with the same files still queued.
        if (createdTransferId)
          api.abortTransfer(createdTransferId).catch(() => {});
        returnToSettings();
        return;
      }
      // A pass the server no longer accepts is dead weight; drop it so the
      // next attempt offers a fresh one instead of failing the same way.
      if (error instanceof ApiError && error.code === "pass_already_used") {
        clearPass();
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

<Seo
  title={PAGE_TITLE}
  description={PAGE_DESCRIPTION}
  path="/"
  alternates={[
    { locale: "en", path: "/" },
    { locale: "nl", path: "/nl" },
  ]}
/>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify(homeSchema).replace(/</g, "\\u003c")}</script>`}
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
      class="featured-reveal absolute inset-0 bg-cover bg-center pointer-events-none"
      style="
        background-image: url('{featured.src}');
        clip-path: {imageRevealed ? 'inset(0 round 0)' : 'inset(var(--reveal-top) 0 0 var(--reveal-left) round var(--reveal-round))'};
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

  <div class="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 lg:pt-32 pb-[16rem] sm:pb-24">
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
                Up to {formatSize(maxTotalSize)} per transfer{#if mustPay}
                  · {PASS_PRICE} to send, or {PLAN_PRICE} a month{/if}
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
                        {uploadStore.title.length} / {TITLE_MAX} - too long.
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
                {#if uploadStore.errorUpgradeUrl && !auth.isAuthenticated}
                  <Button variant="primary" fullWidth={false} class="flex-1" onclick={() => goto("/login?redirect=/")}>
                    Sign in
                  </Button>
                {:else}
                  <Button variant="primary" fullWidth={false} class="flex-1" onclick={retryUpload}>
                    Try again
                  </Button>
                {/if}
              {:else}
                <Button
                  variant="primary"
                  fullWidth={false}
                  class="flex-1"
                  onclick={handleUpload}
                  disabled={passwordTooShort || (auth.isAuthenticated && auth.needsVaultSetup)}
                >
                  {mustPay ? "Continue to payment" : "Create share link"}
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
          Drop a file in the panel - or anywhere on this page.
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
        share link, the part after <code>#</code> that browsers
        don't send to servers. We never see your files, your
        filenames, or your keys.
      </p>
      <p>
        You don't have to take that on faith.
        <a href="/verify" class="text-primary underline underline-offset-2">Verify it yourself</a>
        walks through four checks you can run against this site in about two
        minutes, using the developer tools already in your browser.
      </p>
      <p>
        You choose how long a transfer lives, from an hour up to 30
        days, and how many times it can be downloaded. Password
        protection adds a second factor independent of the link.
        Read more about the security model on the
        <a href="/security" class="text-primary underline underline-offset-2">security page</a>.
      </p>
      <p>
        New to encrypted transfer? See how Tessil compares to
        <a href="/compare" class="text-primary underline underline-offset-2">WeTransfer, Proton Drive, and other tools</a>.
      </p>
      <p>
        Built and run by one person, with no ads and no investors. Sending
        costs {PASS_PRICE} per transfer or {PLAN_PRICE} a month, which is what
        pays for the servers. Receiving is always free. See
        <a href="/pricing" class="text-primary underline underline-offset-2">pricing</a>.
      </p>
    </section>

    <section class="mt-14 pt-10 border-t border-border/60">
      <h2 class="text-base font-semibold text-foreground mb-4">Frequently asked questions</h2>
      <div class="divide-y divide-border/60 border-y border-border/60 text-sm">
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Is Tessil really end-to-end encrypted?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">
            Yes. Your files are encrypted in your browser with AES-GCM before they upload, and the decryption key lives in the share link, never on our servers. We can't read your files, your filenames, or your keys.
          </p>
        </details>
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Do I need an account to send files?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">
No. You can send with a one-time {PASS_PRICE} pass and no account, and receiving never needs one. An account is only needed for the {PLAN_PRICE} monthly plan, and adds a dashboard of the transfers you create. It doesn't change how files are encrypted.
          </p>
        </details>
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How is Tessil different from WeTransfer or Dropbox?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">
            Those services can read what you upload. Tessil can't, because encryption happens in your browser before anything is sent. Tessil is also open source, EU-hosted, and shows no ads.
            <a href="/compare" class="text-primary underline underline-offset-2">See the full comparison</a>.
          </p>
        </details>
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How large can the files be?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">
Up to 2 GB per transfer. Files are encrypted and uploaded in parts, so big transfers stay reliable even on slower connections and do not have to fit in your browser's memory.
          </p>
        </details>
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            What does Tessil cost?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">
Sending costs {PASS_PRICE} per transfer with no account, or {PLAN_PRICE} a month for as many as you need. Downloading is free for everyone. There are no ads and no selling of data, and Tessil is open source under the AGPL-3.0 licence, so anyone can audit exactly how it handles encryption.
          </p>
        </details>
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How long do transfers last?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">
            Transfers expire automatically based on the time limit and download count you choose. Once a transfer expires, the encrypted data is deleted.
          </p>
        </details>
      </div>
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

{#if paywallMounted}
  <PaywallModal
    open={paywallOpen}
    maxTransferSize={maxTotalSize}
    maxExpiryHours={paidMaxExpiryHours}
    resume={paywallResume}
    onPaid={(passToken) => settlePayment({ ok: true, passToken })}
    onClose={() => settlePayment({ ok: false, passToken: null })}
  />
{/if}

<style>
  /* Minimal scrollbar - neutral grayscale, never brand colour. */
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

  /* Featured reveal band - shorter & full-width on mobile, corner crop on desktop. */
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
