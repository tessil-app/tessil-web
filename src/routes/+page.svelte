<script lang="ts">
  import { goto } from "$app/navigation";
  import { api, ApiError } from "$lib/api/client";
  import { checkFileType } from "$lib/upload/fileTypeCheck";
  import { holdWhileUploading } from "$lib/upload/keepAwake";
  import { uploadEncryptedStreamMultipart } from "$lib/upload/multipart";
  import { runFiles } from "$lib/upload/pool";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import CircularProgress from "$lib/components/CircularProgress.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
  import Modal from "$lib/components/Modal.svelte";
  import PasskeyUnlockButton from "$lib/components/PasskeyUnlockButton.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SupportModal from "$lib/components/SupportModal.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { MAX_TOTAL_UPLOAD_SIZE } from "$lib/config/limits";
  import { SITE_URL } from "$lib/config/site";
  import {
    encryptFilename,
    encryptString,
  } from "$lib/crypto/encrypt";
  import { encryptFileStream } from "$lib/crypto/streaming";
  import { exportKey, generateKey } from "$lib/crypto/key";
  import { protectTransferKey } from "$lib/crypto/transferPassword";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import type { FileUploadState } from "$lib/stores/upload.types";
  import {
    hasDismissedPrompt,
    markPromptDismissed,
    markTransferSent,
    shouldAutoOpenPrompt,
  } from "$lib/support/prompt";
  import { cn, formatEta, formatSize, formatSpeed } from "$lib/utils";
  import {
    isUnlocked,
    unlockWithPassword,
    unlockWithPhrase,
    wrapTransferKey,
    vaultHasPassword,
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

  const steps: { title: string; body: string; link?: { href: string; label: string } }[] = [
    {
      title: "Encrypted before it leaves",
      body: "Your browser scrambles every file, its name included. What reaches us is unreadable.",
    },
    {
      title: "The key is never ours",
      body: PORTALS_ANNOUNCED
        ? "It travels in the part of the link browsers don't send to servers. For portals it stays in your vault."
        : "It travels in the part of the link browsers don't send to servers.",
    },
    {
      title: "Gone when it should be",
      body: PORTALS_ANNOUNCED
        ? "Transfers expire in hours or days. What arrives in a portal is deleted after 30 days."
        : "Transfers expire in hours or days, and the files are deleted with them.",
    },
    {
      title: "Check it yourself",
      body: "Four checks in your own browser, about two minutes.",
      link: { href: "/verify", label: "Verify it" },
    },
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
  // The connection dropped mid-file; the upload continues by itself when it is back.
  let uploadStalled = $state(false);
  let lastSpeedTs = 0;
  let uploadController: AbortController | null = null;
  let lastUploadVaulted = $state(false);
  let isDraggingOver = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let featured = $state<FeaturedItem | null>(null);

  let unlockOpen = $state(false);
  let unlockMode = $state<"password" | "phrase">("password");
  // A vault can exist without a password. Then the dialog offers the
  // passkey and the recovery phrase, and no password field.
  let hasVaultPassword = $state(true);
  $effect(() => {
    if (!unlockOpen) return;
    vaultHasPassword()
      .then((has) => {
        hasVaultPassword = has;
        if (!has) unlockMode = "phrase";
      })
      .catch(() => {});
  });
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let unlockError = $state<string | null>(null);
  let isUnlockingVault = $state(false);
  let pendingResume: ((choice: VaultChoice) => void) | null = null;

  // Gates the modal out of the prerendered homepage; its copy would
  // otherwise ship in a closed <dialog> on the primary SEO target.
  let supportMounted = $state(false);
  let supportOpen = $state(false);
  let supportPillVisible = $state(false);

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

  // Read once on mount so the ask lands on a visit after a completed
  // transfer, never on top of the share link the user came to copy.
  onMount(() => {
    supportMounted = true;
    // Asking for support and offering paid plans at once sends two
    // messages. Once the plans are announced, the ask moves to the footer.
    supportOpen = !PORTALS_ANNOUNCED && shouldAutoOpenPrompt();
    supportPillVisible = !PORTALS_ANNOUNCED && hasDismissedPrompt();
  });

  // Dismissing and clicking through both mean "do not ask again"; the pill
  // stays as the way back in.
  function closeSupport() {
    markPromptDismissed();
    supportOpen = false;
    supportPillVisible = true;
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
    uploadStalled = false;
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

  // A vault is never required to send. With one, the transfer's key is
  // kept so the dashboard can show its name and give the link again.
  //   unlocked   keep the key
  //   skipped    send anyway, without keeping the key
  //   cancelled  do not send
  type VaultChoice = "unlocked" | "skipped" | "cancelled";

  async function askToUnlockVault(): Promise<VaultChoice> {
    if (!auth.user || auth.needsVaultSetup) return "skipped";
    if (await isUnlocked(auth.user.id)) return "unlocked";
    unlockMode = "password";
    unlockPassword = "";
    unlockPhrase = "";
    unlockError = null;
    unlockOpen = true;
    return await new Promise<VaultChoice>((resolve) => {
      pendingResume = resolve;
    });
  }

  function closeUnlockModal(choice: VaultChoice = "cancelled") {
    unlockOpen = false;
    unlockError = null;
    unlockPassword = "";
    unlockPhrase = "";
    const resume = pendingResume;
    pendingResume = null;
    resume?.(choice);
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
      resume?.("unlocked");
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
    uploadStalled = false;
    lastSpeedTs = 0;

    const controller = new AbortController();
    uploadController = controller;
    let createdTransferId: string | null = null;

    try {
      uploadStore.setStatus("validating");

      for (let i = 0; i < files.length; i++) {
        const file = files[i].file;
        const blocked = await checkFileType(file);
        if (blocked) {
          uploadStore.setError(`"${file.name}": ${blocked}`);
          return;
        }
      }

      const vaultChoice = await askToUnlockVault();
      if (vaultChoice === "cancelled") {
        returnToSettings();
        return;
      }
      const keepKey = vaultChoice === "unlocked";

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

      // With a password the link carries the key wrapped under it, and
      // the server gets a derived verifier instead of the password.
      const protectedKey = password ? await protectTransferKey(key, password) : null;

      const transfer = await api.createTransfer(
        uploadStore.expiresInHours,
        protectedKey ?? undefined,
        uploadStore.maxDownloads,
        encryptedTitlePayload,
      );
      createdTransferId = transfer.transferId;

      const keyString = protectedKey ? protectedKey.fragment : await exportKey(key);

      uploadStore.setStatus("encrypting");

      // Per file: its smoothed speed, and whether it is waiting for the
      // connection. The readout shows the sum and "any".
      const speeds = new Map<number, number>();
      const waiting = new Set<number>();
      const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);

      try {
        await runFiles(
          files,
          (fileState) => fileState.file.size,
          async (fileState, i, fileSignal) => {
            const file = fileState.file;
            try {
              uploadStore.setFileStatus(i, "encrypting", 0);
              const { encryptedName, iv: nameIv } = await encryptFilename(file.name, key);

              // Streaming encryption: the ciphertext is produced lazily as Parts are
              // read off the stream, so memory stays bounded to a few Parts
              // regardless of file size, and the upload starts immediately instead
              // of after a whole-file encrypt.
              const encryptor = encryptFileStream(file, key);

              if (fileSignal.aborted) throw new DOMException("aborted", "AbortError");

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
                signal: fileSignal,
                onProgress: (p) => {
                  uploadStore.setFileStatus(i, "uploading", p.percent);
                  speeds.set(i, p.bytesPerSecond ?? 0);
                  if (p.stalled) waiting.add(i);
                  else waiting.delete(i);
                  uploadStalled = waiting.size > 0;
                  // Throttle the displayed speed/ETA to ~1s so the readout stays
                  // steady instead of flickering on every progress event.
                  const now = performance.now();
                  if (now - lastSpeedTs > 1000) {
                    let rate = 0;
                    for (const v of speeds.values()) rate += v;
                    const left = totalBytes * (1 - uploadStore.overallProgress / 100);
                    uploadSpeed = rate > 0 ? rate : null;
                    uploadEta = rate > 0 ? left / rate : null;
                    lastSpeedTs = now;
                  }
                },
              });

              uploadStore.setFileStatus(i, "complete", 100);
            } catch (err) {
              if ((err as DOMException)?.name !== "AbortError") {
                uploadStore.setFileStatus(
                  i,
                  "error",
                  0,
                  err instanceof Error ? err.message : "Upload failed",
                );
              }
              throw err;
            } finally {
              speeds.delete(i);
              waiting.delete(i);
              uploadStalled = waiting.size > 0;
            }
          },
          controller.signal,
        );
      } catch (err) {
        // A user's Stop is handled further down, with the transfer cleaned up there.
        if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");
        api.abortTransfer(transfer.transferId).catch(() => {});
        // Re-throw the original error (keeps ApiError type, so tier-limit
        // messages + upgradeUrl survive through to friendlyUploadError).
        throw err ?? new Error("Upload failed");
      }

      uploadStore.setStatus("uploading");

      let vaultWrap: { wrappedKey: string } | undefined;
      lastUploadVaulted = false;
      if (keepKey && auth.user) {
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
      markTransferSent();
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        // User cancelled - clean up the partial transfer and return to the
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

  // A locked phone or a closed tab ends the upload; prevent the first, ask before the second.
  $effect(() => {
    if (!isProcessing) return;
    return holdWhileUploading();
  });

  const totalSize = $derived(
    uploadStore.files.reduce((sum, f) => sum + f.file.size, 0),
  );

  const hasFiles = $derived(uploadStore.files.length > 0);

  // The panel grows when files are added and may reach past the screen.
  // Once it has finished growing, bring it to the middle.
  let panelEl = $state<HTMLElement | null>(null);
  let hadFiles = false;
  $effect(() => {
    const has = hasFiles;
    if (has && !hadFiles && panelEl) {
      const el = panelEl;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" }), 480);
    }
    hadFiles = has;
  });

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

  // Several files can be in flight at once.
  const isSending = $derived(uploadStore.files.some((f) => f.status === "uploading"));
  const filesDone = $derived(uploadStore.files.filter((f) => f.status === "complete").length);
  const phaseLabel = $derived.by(() => {
    if (uploadStore.status === "validating") return "Checking…";
    return isSending ? "Uploading…" : "Encrypting…";
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
    "relative -mt-14 overflow-hidden transition-colors duration-200 ease-out",
    isDraggingOver && "bg-primary/5",
  )}
>
  {#if isDraggingOver}
    <div
      aria-hidden="true"
      class="absolute inset-0 ring-2 ring-primary ring-inset pointer-events-none"
    ></div>
  {/if}

  <!-- Empty, the whole hero is one screen: words, wall and label, no scrolling.
       With files queued the panel is taller and the page may grow. -->
  <div
    class={cn(
      "relative max-w-6xl mx-auto px-4 sm:px-6 pt-[4.5rem] sm:pt-20 pb-3 flex flex-col min-h-[100svh]",
      !hasFiles && !isSuccess && "sm:h-[100svh] sm:min-h-[38rem]",
    )}
  >
    <div class="mx-auto flex max-w-2xl shrink-0 flex-col items-center gap-2.5 sm:gap-3 text-center">
        {#if PORTALS_ANNOUNCED}
          <a
            href="/portals"
            class="inline-flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3.5 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">New</span>
            Now you can receive files too
          </a>
        {/if}
        {#if supportPillVisible}
          <div class="flex justify-center">
            <button
              type="button"
              onclick={() => (supportOpen = true)}
              class="inline-flex items-center gap-2 rounded-full bg-background/85 backdrop-blur-md border border-border/70 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background hover:cursor-pointer transition-colors duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
              Keep Tessil alive
            </button>
          </div>
        {/if}
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-none" style="letter-spacing: -0.035em">
          Send anything.
          <br />
          We see nothing.
        </h1>
        <p class="max-w-lg text-base text-muted-foreground leading-snug">
          End-to-end encrypted in your browser. The key never
          reaches our server.
        </p>
        <p class="hidden sm:block text-sm text-muted-foreground/80">
          Drop a file in the panel - or anywhere on this page.
        </p>
    </div>

    <!-- The wall: this month's artwork, with the panel hung on it. -->
    <div
      class={cn(
        "relative mt-5 sm:mt-6 flex flex-1 flex-wrap items-start justify-between gap-4 sm:gap-6 rounded-2xl bg-muted bg-cover bg-center p-3 sm:p-6 lg:p-8",
        (hasFiles || isSuccess) && "sm:min-h-[39rem]",
      )}
      style={featured ? `background-image: url('${featured.src}')` : undefined}
    >

      <!-- Height animates between empty (420) and has-files (580) sizes; sync'd with the extension's width animation. -->
      <aside
        bind:this={panelEl}
        class={cn(
          "relative w-full sm:w-auto sm:flex sm:items-stretch",
          isSuccess ? "sm:h-auto" : hasFiles ? "sm:h-[580px]" : "panel-empty",
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
                {:else if auth.isAuthenticated}
                  Keep this link: without a vault it can't be shown again.
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
                  <p class="text-xs text-muted-foreground">
                    You can send right away. To keep names and links in your dashboard,
                    <button
                      type="button"
                      onclick={goToSetup}
                      class="underline underline-offset-2 hover:text-foreground hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
                    >
                      set up a vault
                    </button>.
                  </p>
                {/if}

              {#if isProcessing}
                <div class="flex flex-1 flex-col items-center justify-center text-center gap-3 py-4">
                  <CircularProgress
                    percent={uploadStore.overallProgress}
                    sublabel={phaseLabel}
                  />
                  <div class="space-y-0.5 text-xs text-muted-foreground" aria-live="polite">
                    {#if isSending && uploadStalled}
                      <p class="text-warning-foreground">
                        Connection lost. Continuing as soon as it is back. Keep this tab open.
                      </p>
                    {:else if isSending && uploadSpeed}
                      <p class="tabular-nums">
                        {formatSpeed(uploadSpeed)}{#if uploadEta} · {formatEta(uploadEta)} left{/if}
                      </p>
                    {/if}
                    {#if uploadStore.files.length > 1}
                      <p>{filesDone} of {uploadStore.files.length} files done</p>
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
                  disabled={passwordTooShort}
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

      {#if PORTALS_ANNOUNCED && !hasFiles}
        <a
          href="/portals"
          class="group relative self-end w-full sm:w-80 rounded-lg bg-card/95 p-5 shadow-lg space-y-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Receive
            <Badge tone="info">New</Badge>
          </span>
          <span class="block text-base font-semibold leading-snug text-foreground">
            A link where people send you files. Only you can open them.
          </span>
          <span class="block text-sm text-primary underline-offset-4 group-hover:underline">
            Meet portals
          </span>
        </a>
      {/if}
    </div>

    {#if featured}
      <div class="mt-2 flex shrink-0 flex-wrap justify-between gap-x-6 gap-y-0.5 px-1 text-xs text-muted-foreground">
        <p>
          <span class="font-medium text-foreground">{featured.artist}</span>, from
          {#if featured.artistUrl}
            <TextLink href={featured.artistUrl} target="_blank" rel="noopener noreferrer">{featured.title}</TextLink>
          {:else}
            {featured.title}
          {/if}
        </p>
        <p>On this wall this month.</p>
      </div>
    {/if}
  </div>

</section>

<div class="bg-background">
  <section aria-labelledby="how-title" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
    <h2 id="how-title" class="sr-only">How it works</h2>
    <ol class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {#each steps as step, i (step.title)}
        <li class="space-y-2">
          <p class="text-xs font-semibold tracking-wider text-primary tabular-nums" aria-hidden="true">
            0{i + 1}
          </p>
          <h3 class="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            {step.body}
            {#if step.link}
              <TextLink href={step.link.href} class="text-primary">{step.link.label}</TextLink>
            {/if}
          </p>
        </li>
      {/each}
    </ol>
  </section>

  {#if PORTALS_ANNOUNCED}
    <section
      id="portals"
      aria-labelledby="portals-title"
      class="border-t border-border scroll-mt-20"
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
        <div class="space-y-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">New: portals</p>
          <h2 id="portals-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            Now it works both ways.
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            A portal is a link you hand to the people you work with. They see what you need
            and send it, without an account. It is encrypted in their browser, so what arrives
            can be opened by you and nobody else, us included.
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each ["A checklist that shows what is still missing", "Works on a phone, no account for the sender", "Deleted automatically after 30 days"] as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href={auth.user ? "/dashboard/portals" : "/pricing"} fullWidth={false}>
              {auth.user ? "Open your portals" : "See the plans"}
            </Button>
            <p class="text-sm text-muted-foreground">
              You set portals up in your dashboard. Sending stays free.
              <TextLink href="/portals">Take the tour</TextLink>
            </p>
          </div>
        </div>

        <!-- What the sender sees. An illustration, not a control. -->
        <div aria-hidden="true" class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3.5">
          <p class="text-xs text-muted-foreground">Send files to</p>
          <p class="text-xl font-semibold tracking-tight text-foreground">Studio North</p>
          <div class="flex justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
            <span>What is needed</span>
            <span>2 of 3 added</span>
          </div>
          {#each [{ label: "Signed contract", file: "contract-signed.pdf" }, { label: "Logo files", file: "logo.zip" }] as row (row.label)}
            <div class="flex items-center gap-2.5 rounded-md border border-border px-3.5 py-2.5 text-sm">
              <IconCheckRegular class="size-4 shrink-0 text-success-foreground" />
              <span class="flex-1 text-foreground">{row.label}</span>
              <span class="text-xs text-muted-foreground">{row.file}</span>
            </div>
          {/each}
          <div class="flex items-center gap-2.5 rounded-md border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground">
            <span class="size-4 shrink-0 rounded-full border border-dashed border-warning"></span>
            <span class="flex-1">Invoice details</span>
            <span class="text-xs font-medium text-foreground">Choose file</span>
          </div>
          <div class="rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">
            Send 2 files
          </div>
        </div>
      </div>
    </section>
  {/if}

  <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 border-t border-border pt-16 sm:pt-24">
    <!-- A heading on the left, the text in a readable column on the right. -->
    <section class="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        Tessil, explained
      </h2>
      <div class="max-w-2xl space-y-4 text-base text-muted-foreground leading-relaxed">
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
          Anonymous transfers expire in hours; signed-in transfers
          can run longer and live on your dashboard. Password
          protection adds a second factor independent of the link.
          Read more about the security model on the
          <a href="/security" class="text-primary underline underline-offset-2">security page</a>.
        </p>
        <p>
          New to encrypted transfer? See how Tessil compares to
          <a href="/compare" class="text-primary underline underline-offset-2">WeTransfer, Proton Drive, and other tools</a>.
        </p>
        <p>
          Built and run by one person, and free to use. If Tessil saves you a
          headache, you can support the project. The link's in the footer below.
        </p>
      </div>
    </section>

    <section class="mt-16 sm:mt-24 pt-16 sm:pt-24 border-t border-border grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        Questions
      </h2>
      <div class="max-w-2xl divide-y divide-border border-y border-border text-base">
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Is Tessil really end-to-end encrypted?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Yes. Your files are encrypted in your browser with AES-GCM before they upload, and the decryption key lives in the share link, never on our servers. We can't read your files, your filenames, or your keys.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Do I need an account to send files?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            No. You can send and receive files anonymously. A free account is optional and just adds a dashboard to manage the transfers you create. It doesn't change how files are encrypted.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How is Tessil different from WeTransfer or Dropbox?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Those services can read what you upload. Tessil can't, because encryption happens in your browser before anything is sent. Tessil is also open source, EU-hosted, and shows no ads.
            <a href="/compare" class="text-primary underline underline-offset-2">See the full comparison</a>.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How large can the files be?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Large files are supported through multi-part uploads, so big transfers stay reliable even on slower connections. Signed-in transfers allow larger sizes than anonymous ones.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Is Tessil free?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Yes, completely free, with no ads and no selling of data. Tessil is open source under the AGPL-3.0 licence, so anyone can audit exactly how it handles encryption.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How long do transfers last?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Transfers expire automatically based on the time limit and download count you choose. Once a transfer expires, the encrypted data is deleted.
          </p>
        </details>
      </div>
    </section>

    <div class="pt-16">
      <SiteFooter current="home" />
    </div>
  </div>
</div>

<Modal
  open={unlockOpen}
  title="Keep this transfer in your dashboard?"
  description="Unlock your vault and the dashboard can show this transfer's name and give you its link again. Or send without unlocking and keep the link yourself."
  onClose={() => closeUnlockModal("cancelled")}
>
  <!-- The footer is a snippet of the Modal, so it sits outside the form and
       its submit button points back at the form by id. -->
  <form id="home-unlock-form" onsubmit={submitUnlock} class="space-y-4" novalidate>
    <PasskeyUnlockButton
      active={unlockOpen}
      disabled={isUnlockingVault}
      onUnlocked={() => closeUnlockModal("unlocked")}
    />
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

    {#if hasVaultPassword}
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
    {/if}

  </form>

  {#snippet footer()}
    <Button
      type="button"
      variant="ghost"
      fullWidth={false}
      onclick={() => closeUnlockModal("skipped")}
      disabled={isUnlockingVault}
    >
      Send without unlocking
    </Button>
    <Button type="submit" form="home-unlock-form" fullWidth={false} disabled={!canSubmitUnlock}>
      {#if isUnlockingVault}
        <Spinner aria-hidden="true" />
        Unlocking…
      {:else}
        Unlock and send
      {/if}
    </Button>
  {/snippet}
</Modal>

{#if supportMounted}
  <SupportModal open={supportOpen} onClose={closeSupport} />
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

  /* The empty panel takes what the screen leaves after the words and the
     label, up to its full size, so the hero fits without scrolling. */
  @media (min-width: 640px) {
    .panel-empty {
      height: min(420px, max(240px, 100svh - 29.5rem));
    }
  }
</style>
