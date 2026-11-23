<script lang="ts">
  // The panel that sends files: pick or drop them, set how long the link
  // lasts, and get the link. Files are encrypted here before upload. Used
  // on the homepage and on the signed-in page for a new transfer; what is
  // queued lives in `uploadStore`, so the page around it can read that too.

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
  import Modal from "$lib/components/Modal.svelte";
  import PasskeyUnlockButton from "$lib/components/PasskeyUnlockButton.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { MAX_TOTAL_UPLOAD_SIZE } from "$lib/config/limits";
  import { encryptFilename, encryptString } from "$lib/crypto/encrypt";
  import { encryptFileStream } from "$lib/crypto/streaming";
  import { exportKey, generateKey } from "$lib/crypto/key";
  import { protectTransferKey } from "$lib/crypto/transferPassword";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import type { FileUploadState } from "$lib/stores/upload.types";
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
  import { fade } from "svelte/transition";
  import type { Locale } from "$lib/i18n/locale";
  import { sendMessages } from "$lib/i18n/messages/send";

  interface Props {
    /** Where "Sign in" comes back to when a limit asks for an account. */
    returnTo?: string;
    /** Sizes the empty panel from sm up. The homepage's default fits its one-screen hero. */
    emptyClass?: string;
    /**
     * "panel": the glass panel that hangs on the homepage's wall.
     * "page": files on the left, the link's settings on the right, for a page of its own.
     */
    layout?: "panel" | "page";
    /** The language to show; the page decides, from its address or the account. */
    locale?: Locale;
  }

  let { returnTo = "/", emptyClass = "panel-empty", layout = "panel", locale = "en" }: Props = $props();
  const t = $derived(sendMessages[locale]);

  const MIN_PASSWORD_LENGTH = 8;
  const MAX_FILENAME_BYTES = 255;
  const TITLE_MAX = 200;

  const EXPIRES_OPTIONS = $derived.by(() => {
    // Mirrors allowedExpiryHours per tier in the API.
    const base = [
      { value: 1, label: t.hours(1) },
      { value: 6, label: t.hours(6) },
      { value: 12, label: t.hours(12) },
      { value: 24, label: t.days(1) },
      { value: 72, label: t.days(3) },
    ];
    if (!auth.user) return base;
    const free = [...base, { value: 168, label: t.days(7) }];
    if (auth.user.tier !== "pro" && auth.user.tier !== "max") return free;
    const pro = [
      ...free,
      { value: 336, label: t.days(14) },
      { value: 720, label: t.days(30) },
    ];
    // Mirrors MAX_EXPIRY_HOURS in the API's tiers.
    return auth.user.tier === "max" ? [...pro, { value: 1440, label: t.days(60) }, { value: 2160, label: t.days(90) }] : pro;
  });

  $effect(() => {
    if (!EXPIRES_OPTIONS.some((o) => o.value === uploadStore.expiresInHours)) {
      const legal = EXPIRES_OPTIONS[EXPIRES_OPTIONS.length - 1]!.value;
      uploadStore.setExpiresInHours(legal);
    }
  });

  const DOWNLOADS_OPTIONS: { value: number | null; label: string }[] = $derived([
    { value: null, label: t.unlimited },
    { value: 1, label: "1" },
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 25, label: "25" },
  ]);

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
        t.nameTooLong(tooLong.name, MAX_FILENAME_BYTES),
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
        t.notEnoughSpace(formatSize(remaining)),
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
            t.errorServer,
        };
      }
      return { message: error.message, upgradeUrl: error.upgradeUrl };
    }
    const raw = error instanceof Error ? error.message.toLowerCase() : "";
    if (/network|connection|lost|fetch|load failed/.test(raw)) {
      return {
        message:
          t.errorConnection,
      };
    }
    return { message: t.errorUnfinished };
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
            ? t.wrongPassword
            : result.reason === "wrong_phrase"
              ? t.wrongPhrase
              : result.reason === "not_setup"
                ? t.noVault
                : t.unreadableVault;
        return;
      }
      unlockOpen = false;
      unlockPassword = "";
      unlockPhrase = "";
      const resume = pendingResume;
      pendingResume = null;
      resume?.("unlocked");
    } catch (err) {
      unlockError = err instanceof Error ? err.message : t.unlockFailed;
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
                  err instanceof Error ? err.message : t.uploadFailed,
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
  // Scroll at once to where its middle will be when it has finished
  // growing, so the two movements happen together.
  const PANEL_FULL_HEIGHT = 580;
  let panelEl = $state<HTMLElement | null>(null);
  let hadFiles = false;
  $effect(() => {
    const has = hasFiles;
    if (has && !hadFiles && panelEl) {
      const el = panelEl;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wide = window.matchMedia("(min-width: 640px)").matches;
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const height = wide ? PANEL_FULL_HEIGHT : rect.height;
        const top = rect.top + window.scrollY + height / 2 - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, top), behavior: calm ? "auto" : "smooth" });
      });
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
    if (uploadStore.status === "validating") return t.checking;
    return isSending ? t.uploading : t.encrypting;
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

  // Only files count; dragging text or a link across the page is not a drop.
  function carriesFiles(e: DragEvent): boolean {
    return e.dataTransfer?.types.includes("Files") ?? false;
  }

  function handlePageDragOver(e: DragEvent) {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    if (isProcessing) return;
    isDraggingOver = true;
  }

  function handlePageDragLeave(e: DragEvent) {
    if (e.relatedTarget === null) isDraggingOver = false;
  }

  function handlePageDrop(e: DragEvent) {
    if (!carriesFiles(e)) return;
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

<input
  bind:this={fileInput}
  type="file"
  multiple
  class="hidden"
  onchange={handleFileChange}
  disabled={isProcessing}
/>

<svelte:window
  ondragover={handlePageDragOver}
  ondragleave={handlePageDragLeave}
  ondrop={handlePageDrop}
/>

<!-- Shown while a file is held over the page, wherever on the page that is. -->
{#if isDraggingOver}
  <div
    aria-hidden="true"
    transition:fade={{ duration: 150 }}
    class="pointer-events-none fixed inset-0 z-50 bg-background/75 backdrop-blur-md p-3 sm:p-5"
  >
    <div class="drop-frame flex h-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-primary bg-primary/5 text-center">
      <span class="drop-icon inline-flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <IconUploadRegular class="size-7" />
      </span>
      <p class="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground" style="letter-spacing: -0.03em">
        {t.letGo}
      </p>
      <p class="max-w-sm text-base text-muted-foreground">
        {t.letGoBody}
      </p>
    </div>
  </div>
{/if}

{#snippet fields()}
  <div class="space-y-4 pt-1">
    <div class="space-y-1">
      <TextInput
        id="home-transfer-title"
        label={t.titleLabel}
        placeholder={t.titlePlaceholder}
        value={uploadStore.title}
        oninput={(e) =>
          uploadStore.setTitle(
            (e.currentTarget as HTMLInputElement).value,
          )}
        maxlength={TITLE_MAX + 32}
      />
      {#if uploadStore.title.length > TITLE_MAX}
        <p class="text-xs text-warning-foreground">
          {t.titleTooLong(uploadStore.title.length, TITLE_MAX)}
        </p>
      {/if}
    </div>

    <SegmentedControl
      label={t.expiresLabel}
      options={EXPIRES_OPTIONS}
      value={uploadStore.expiresInHours}
      onChange={(v) => uploadStore.setExpiresInHours(v)}
    />

    <SegmentedControl
      label={t.downloadsLabel}
      options={DOWNLOADS_OPTIONS}
      value={uploadStore.maxDownloads}
      onChange={(v) => uploadStore.setMaxDownloads(v)}
    />

    <div class="space-y-1">
      <PasswordInput
        id="home-transfer-password"
        label={t.passwordLabel}
        placeholder={t.passwordPlaceholder}
        value={uploadStore.password}
        oninput={(e) =>
          uploadStore.setPassword(
            (e.currentTarget as HTMLInputElement).value,
          )}
      />
      {#if passwordTooShort}
        <p class="text-xs text-warning-foreground">
          {t.passwordShort(MIN_PASSWORD_LENGTH)}
        </p>
      {/if}
    </div>
  </div>
{/snippet}

{#if layout === "page"}
  {#if isSuccess}
    <section class="max-w-2xl space-y-4 rounded-lg bg-card p-5 sm:p-6" aria-labelledby="send-ready">
      <div>
        <h2 id="send-ready" class="flex items-center gap-2 text-base font-semibold text-foreground">
          <IconLockRegular class="size-4 text-primary" />
          {t.ready}
        </h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{t.readyBodyPage}</p>
      </div>
      <TextInput
        id="home-share-link"
        aria-label={t.shareLink}
        value={uploadStore.shareUrl ?? ""}
        readonly
        mono
        onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
      />
      <p class="text-sm text-muted-foreground">
        {t.expiresIn(uploadStore.expiresInHours)}
        {uploadStore.maxDownloads === null ? t.unlimitedDownloads : t.maxDownloads(uploadStore.maxDownloads)}
        {#if lastUploadVaulted}
          {t.saved}
        {:else}
          {t.keepLink}
        {/if}
      </p>
      <div class="flex flex-wrap gap-2">
        <Button variant="primary" fullWidth={false} onclick={copyShareLink}>
          {#if copied}
            <IconCheckRegular class="size-4" />
            {t.copied}
          {:else}
            <IconCopyRegular class="size-4" />
            {t.copy}
          {/if}
        </Button>
        <Button variant="secondary" fullWidth={false} onclick={resetUpload}>{t.another}</Button>
      </div>
    </section>
  {:else}
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <!-- What goes: the files, and the place to add them. -->
      <section class="space-y-4 rounded-lg bg-card p-4 sm:p-5" aria-labelledby="send-files">
        <div class="flex items-center justify-between gap-3">
          <h2 id="send-files" class="text-base font-semibold text-foreground">
            {t.files}
            {#if hasFiles}
              <span class="font-normal text-muted-foreground">
                {uploadStore.files.length}, {formatSize(totalSize)}
              </span>
            {/if}
          </h2>
          {#if hasFiles && !isProcessing}
            <button
              type="button"
              onclick={resetUpload}
              class="rounded text-sm text-muted-foreground transition-colors duration-200 ease-out hover:cursor-pointer hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t.clear}
            </button>
          {/if}
        </div>

        {#if hasFiles}
          <div class="overflow-hidden rounded-md border border-border">
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
        {/if}

        {#if !isProcessing && uploadStore.status !== "error"}
          <button
            type="button"
            onclick={openFilePicker}
            aria-label={hasFiles ? t.addMore : t.dropAria}
            class={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-center transition-colors duration-200 ease-out hover:cursor-pointer hover:border-muted-foreground hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              hasFiles ? "px-4 py-5" : "px-4 py-16 sm:py-24",
            )}
          >
            <span class="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {#if hasFiles}
                <IconPlusRegular class="size-4" />
              {:else}
                <IconUploadRegular class="size-4" />
              {/if}
            </span>
            <span class="space-y-0.5">
              <span class="block text-sm font-semibold text-foreground">
                {hasFiles ? t.addMore : t.dropHere}
              </span>
              <span class="block text-sm text-muted-foreground">
                {hasFiles ? t.dropMoreHint : t.dropHint}
              </span>
            </span>
            {#if !hasFiles}
              <span class="text-xs text-muted-foreground">Up to {formatSize(MAX_TOTAL_UPLOAD_SIZE)} per transfer</span>
            {/if}
          </button>
        {/if}
      </section>

      <!-- How the link behaves, and the button that makes it. -->
      <section class="space-y-4 rounded-lg bg-card p-4 sm:p-5 lg:sticky lg:top-20" aria-labelledby="send-link">
        <h2 id="send-link" class="text-base font-semibold text-foreground">{t.theLink}</h2>
        {#if uploadStore.status === "error"}
          <Alert tone="destructive">{uploadStore.error}</Alert>
          <div class="flex gap-2">
            <Button variant="secondary" fullWidth={false} class="flex-1" onclick={returnToSettings}>{t.back}</Button>
            <Button variant="primary" fullWidth={false} class="flex-1" onclick={retryUpload}>{t.tryAgain}</Button>
          </div>
        {:else if isProcessing}
          <div class="flex flex-col items-center gap-3 py-4 text-center">
            <CircularProgress percent={uploadStore.overallProgress} sublabel={phaseLabel} />
            <div class="space-y-0.5 text-xs text-muted-foreground" aria-live="polite">
              {#if isSending && uploadStalled}
                <p class="text-warning-foreground">
                  {t.stalled}
                </p>
              {:else if isSending && uploadSpeed}
                <p class="tabular-nums">
                  {formatSpeed(uploadSpeed)}{#if uploadEta}, {t.left(formatEta(uploadEta))}{/if}
                </p>
              {/if}
              {#if uploadStore.files.length > 1}
                <p>{t.filesDone(filesDone, uploadStore.files.length)}</p>
              {/if}
            </div>
          </div>
          <Button variant="secondary" onclick={stopUpload}>{t.stop}</Button>
        {:else}
          {@render fields()}
          <Button variant="primary" onclick={handleUpload} disabled={!hasFiles || passwordTooShort}>
            {t.create}
          </Button>
          <p class="text-xs leading-relaxed text-muted-foreground">
            {#if auth.needsVaultSetup}
              {t.noVaultBeforePage}
              <button
                type="button"
                onclick={goToSetup}
                class="rounded underline underline-offset-2 hover:cursor-pointer hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t.setUpVault}
              </button>.
            {:else}
              {t.encryptedNote}
            {/if}
          </p>
        {/if}
      </section>
    </div>
  {/if}
{:else}
  <aside
    bind:this={panelEl}
    class={cn(
      "relative w-full sm:w-auto sm:flex sm:items-stretch",
      isSuccess ? "sm:h-auto" : hasFiles ? "sm:h-[580px]" : emptyClass,
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
            {t.ready}
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            {t.readyBody}
          </p>
        </div>
        <div class="p-5 space-y-3">
          <TextInput
            id="home-share-link"
            aria-label={t.shareLink}
            value={uploadStore.shareUrl ?? ""}
            readonly
            mono
            onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <p class="text-xs text-muted-foreground">
            {t.expiresIn(uploadStore.expiresInHours)}
            {uploadStore.maxDownloads === null ? t.unlimitedDownloads : t.maxDownloads(uploadStore.maxDownloads)}
            {#if lastUploadVaulted}
              {t.saved}
            {:else if auth.isAuthenticated}
              {t.keepLink}
            {/if}
          </p>
        </div>
        <div class="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <Button variant="secondary" fullWidth={false} class="flex-1 whitespace-nowrap" onclick={resetUpload}>
            {t.another}
          </Button>
          <Button variant="primary" fullWidth={false} class="flex-1" onclick={copyShareLink}>
            {#if copied}
              <IconCheckRegular class="size-4" />
              {t.copied}
            {:else}
              <IconCopyRegular class="size-4" />
              {t.copy}
            {/if}
          </Button>
        </div>
      {:else if !hasFiles}
        <button
          type="button"
          onclick={openFilePicker}
          disabled={isProcessing}
          aria-label={t.browseAria}
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
                {t.releaseToEncrypt}
              {:else}
                {t.dropFile}
              {/if}
            </p>
            <p class="text-xs text-muted-foreground leading-relaxed max-w-[16rem]">
              {t.browseHint}
            </p>
          </div>
          <span class="mt-4 text-[11px] text-muted-foreground/80">
            {t.upTo(formatSize(MAX_TOTAL_UPLOAD_SIZE))}
          </span>
        </button>
      {:else}
        <div class="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
            <IconLockRegular class="size-4 text-primary shrink-0" />
            <span class="truncate">
              {t.fileCount(uploadStore.files.length)}
              · {formatSize(totalSize)}
            </span>
          </div>
          {#if !isProcessing}
            <button
              type="button"
              onclick={resetUpload}
              class="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
            >
              {t.clear}
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
                <p class="text-sm font-semibold text-foreground">{t.uploadFailed}</p>
                <p class="text-xs text-muted-foreground leading-relaxed max-w-[18rem]">
                  {uploadStore.error}
                </p>
              </div>
            </div>
          {:else}
            {#if auth.isAuthenticated && auth.needsVaultSetup}
              <p class="text-xs text-muted-foreground">
                {t.noVaultBefore}
                <button
                  type="button"
                  onclick={goToSetup}
                  class="underline underline-offset-2 hover:text-foreground hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
                >
                  {t.setUpVault}
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
                    {t.stalled}
                  </p>
                {:else if isSending && uploadSpeed}
                  <p class="tabular-nums">
                    {formatSpeed(uploadSpeed)}{#if uploadEta} · {t.left(formatEta(uploadEta))}{/if}
                  </p>
                {/if}
                {#if uploadStore.files.length > 1}
                  <p>{t.filesDone(filesDone, uploadStore.files.length)}</p>
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
              {t.addMore}
            </button>

            {@render fields()}
          {/if}
          {/if}
        </div>

        <div class="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/30">
          {#if isProcessing}
            <Button variant="secondary" fullWidth={false} class="flex-1" onclick={stopUpload}>
              {t.stop}
            </Button>
          {:else if uploadStore.status === "error"}
            <Button variant="secondary" fullWidth={false} class="flex-1" onclick={returnToSettings}>
              {t.back}
            </Button>
            {#if uploadStore.errorUpgradeUrl && !auth.isAuthenticated}
              <Button variant="primary" fullWidth={false} class="flex-1" onclick={() => goto(`/login?redirect=${encodeURIComponent(returnTo)}`)}>
                {t.signIn}
              </Button>
            {:else}
              <Button variant="primary" fullWidth={false} class="flex-1" onclick={retryUpload}>
                {t.tryAgain}
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
              {t.create}
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
            {t.files}
            <span class="font-normal text-muted-foreground">
              · {t.queued}
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
{/if}

<Modal
  open={unlockOpen}
  title={t.unlockTitle}
  description={t.unlockBody}
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
        label={t.vaultPassword}
        autocomplete="current-password"
        required
        bind:value={unlockPassword}
        disabled={isUnlockingVault}
      />
    {:else}
      <Textarea
        id="home-unlock-phrase"
        label={t.recoveryPhrase}
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
        ? t.usePhrase
        : t.usePassword}
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
      {t.sendWithout}
    </Button>
    <Button type="submit" form="home-unlock-form" fullWidth={false} disabled={!canSubmitUnlock}>
      {#if isUnlockingVault}
        <Spinner aria-hidden="true" />
        {t.unlocking}
      {:else}
        {t.unlockAndSend}
      {/if}
    </Button>
  {/snippet}
</Modal>

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
    :global(.panel-empty) {
      height: min(420px, max(240px, 100svh - 29.5rem));
    }
  }

  /* The drop screen: the frame settles in, the icon bobs while it waits. */
  .drop-frame {
    animation: drop-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .drop-icon {
    animation: drop-bob 1.2s ease-in-out infinite;
  }
  @keyframes drop-in {
    from {
      transform: scale(0.97);
    }
  }
  @keyframes drop-bob {
    50% {
      transform: translateY(-6px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .drop-frame,
    .drop-icon {
      animation: none;
    }
  }
</style>
