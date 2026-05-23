<script lang="ts">
  // Home / upload page. Anonymous uploads run unmodified; signed-in
  // uploads always wrap the transfer key under the user's K_vault, and
  // prompt for the password mid-flow when the vault is locked.

  import { goto } from "$app/navigation";
  import { api, ApiError } from "$lib/api/client";
  import { uploadEncryptedBlobMultipart } from "$lib/upload/multipart";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import Checkbox from "$lib/components/Checkbox.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { MAX_TOTAL_UPLOAD_SIZE } from "$lib/config/limits";
  import { encryptFile, encryptFilename, encryptString } from "$lib/crypto/encrypt";
  import { exportKey, generateKey, wrapKey } from "$lib/crypto/key";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import type { FileUploadState } from "$lib/stores/upload.types";
  import { formatSize } from "$lib/utils";
  import {
    isUnlocked,
    unlockWithPassword,
    unlockWithPhrase,
    wrapTransferKey,
  } from "$lib/vault/client";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconCopyRegular from "phosphor-icons-svelte/IconCopyRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";

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
  const TITLE_MAX = 200;

  // Tier-aware expiry options. Anonymous tops out at 1d (24h);
  // authenticated Free gets +72h; Pro adds 7d/14d/30d. Server-side
  // enforcement is in `src/config/tiers.ts` — this list just gates
  // what the UI offers.
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

  // Keep `expiresInHours` valid as auth state changes — if a user
  // signs out mid-upload and the selected value isn't in the new
  // (smaller) option set, snap to the closest legal value.
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

  let copied = $state(false);
  let lastUploadVaulted = $state(false);

  // Vault unlock modal (only shown when the user is signed in and tries to
  // upload with a locked vault). Pending raw-K_transfer + pending complete
  // hooks live on `pendingWrap` so we can resume after a successful unlock.
  let unlockOpen = $state(false);
  let unlockMode = $state<"password" | "phrase">("password");
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let unlockError = $state<string | null>(null);
  let isUnlockingVault = $state(false);
  let pendingResume: ((unlocked: boolean) => void) | null = null;

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

  function clearError() {
    uploadStore.reset();
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

  // Returns true once the vault is unlocked, false if the user cancelled.
  // Caller must already know auth.user is non-null.
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

      // Signed-in path: every upload is vault-wrapped. If the vault is
      // locked, prompt now so we can wrap once the K_transfer is generated.
      // We do this before generating any encryption keys to avoid wasting
      // CPU if the user cancels the unlock.
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
        uploadStore.passwordEnabled &&
        uploadStore.password.length >= MIN_PASSWORD_LENGTH
          ? uploadStore.password
          : undefined;

      // Encrypt the optional transfer title under K_transfer. Over-limit
      // titles are dropped silently here — the form already surfaces a
      // warning, and we'd rather ship a nameless transfer than block.
      const trimmedTitle = uploadStore.title.trim();
      let encryptedTitlePayload:
        | { encryptedTitle: string; encryptedTitleIv: string }
        | null = null;
      if (trimmedTitle.length > 0 && trimmedTitle.length <= TITLE_MAX) {
        const { ciphertext, iv } = await encryptString(trimmedTitle, key);
        encryptedTitlePayload = { encryptedTitle: ciphertext, encryptedTitleIv: iv };
      }

      const transfer = await api.createTransfer(
        uploadStore.expiresInHours,
        password,
        uploadStore.maxDownloads,
        encryptedTitlePayload,
      );

      const keyString = password
        ? await wrapKey(key, password)
        : await exportKey(key);

      uploadStore.setStatus("encrypting");

      let uploadFailed = false;
      for (let i = 0; i < files.length; i++) {
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
            (p) => {
              uploadStore.setFileStatus(i, "encrypting", p * 0.5);
            },
          );

          uploadStore.setFileStatus(i, "encrypting", 50);
          uploadStore.setFileStatus(i, "uploading", 50);

          // Init the multipart upload — returns all Part URLs in one
          // batch. The orchestrator handles slicing, parallel
          // uploads, per-Part retry with backoff, and abort on
          // terminal failure.
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
            onProgress: (p) => {
              uploadStore.setFileStatus(i, "uploading", 50 + p * 0.5);
            },
          });

          uploadStore.setFileStatus(i, "complete", 100);
        } catch (err) {
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

      // Vault wrap for signed-in uploads. ensureVaultUnlocked() ran earlier
      // so wrapTransferKey() should never throw here unless the IDB cache
      // was wiped mid-upload — in that rare case we still abort cleanly
      // rather than ship a transfer the dashboard can't manage.
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
      if (uploadStore.status !== "error") {
        const message = error instanceof Error ? error.message : "Upload failed";
        const upgradeUrl =
          error instanceof ApiError ? error.upgradeUrl : undefined;
        uploadStore.setError(message, upgradeUrl);
      }
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

  // Per-browser memory advisory. The current non-chunked encryption
  // holds plaintext + ciphertext in JS heap simultaneously (~2× file
  // size at peak). Safari and mobile browsers cap their JS heap lower
  // than desktop Chrome — surface a warning so users know up-front
  // rather than discovering it via OOM mid-upload.
  const browserMemoryWarning = $derived.by((): string | null => {
    if (totalSize <= 0) return null;
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    // Practical JS-heap ceilings by browser family.
    const ceilingBytes = isMobile
      ? 400 * 1024 * 1024
      : isSafari
        ? 750 * 1024 * 1024
        : 1.5 * 1024 * 1024 * 1024;
    if (totalSize < ceilingBytes * 0.66) return null;
    const human = isMobile
      ? "mobile browsers (~400 MB)"
      : isSafari
        ? "Safari (~750 MB)"
        : "your browser (~1.5 GiB)";
    return `Files this size can OOM on ${human}. If the upload fails partway, try a smaller file or use Chrome / Firefox on desktop.`;
  });

  const headerCount = $derived(
    `${uploadStore.files.length} file${uploadStore.files.length !== 1 ? "s" : ""} · ${formatSize(totalSize)}`,
  );

  const passwordTooShort = $derived(
    uploadStore.passwordEnabled &&
      uploadStore.password.length < MIN_PASSWORD_LENGTH,
  );

  const isSuccess = $derived(
    uploadStore.status === "complete" && !!uploadStore.shareUrl,
  );

  const canSubmitUnlock = $derived(
    !isUnlockingVault &&
      (unlockMode === "password"
        ? unlockPassword.length > 0
        : unlockPhrase.trim().length > 0),
  );

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

<PageLayout>
  <PageHeader
    title="Encrypted in your browser."
    tagline="Your files are scrambled before they leave your device — we never see the contents."
    wordmarkHref="/"
  />

  <Frame.Root>
    {#if isSuccess}
      <Frame.Header>
        <Frame.Title>Share link ready</Frame.Title>
        <Frame.Description class="flex items-center gap-2">
          <IconLockRegular class="size-4" />
          This link decrypts in the recipient's browser.
        </Frame.Description>
      </Frame.Header>
      <Frame.Panel>
        <div class="space-y-3">
          <TextInput
            id="share-link"
            label="Share link"
            value={uploadStore.shareUrl ?? ""}
            readonly
            mono
            onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <div class="flex gap-2">
            <Button variant="secondary" fullWidth={false} onclick={copyShareLink}>
              {#if copied}
                <IconCheckRegular class="size-4" />
                Copied!
              {:else}
                <IconCopyRegular class="size-4" />
                Copy link
              {/if}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            Expires in {formatExpiry(uploadStore.expiresInHours)}. {formatDownloads(
              uploadStore.maxDownloads,
            )}.
          </p>
          {#if lastUploadVaulted}
            <p class="text-xs text-muted-foreground">
              You can also recover this link from your dashboard later.
            </p>
          {/if}
        </div>
      </Frame.Panel>
      <Frame.Footer class="px-5 py-4">
        <div class="flex">
          <Button variant="secondary" fullWidth={false} onclick={resetUpload}>
            Upload another
          </Button>
        </div>
      </Frame.Footer>
    {:else if hasFiles}
      <Frame.Header>
        <Frame.Title>{headerCount}</Frame.Title>
        <Frame.Description class="flex items-center gap-2">
          <IconLockRegular class="size-4" />
          Encrypted before upload.
        </Frame.Description>
      </Frame.Header>
      <Frame.Panel>
        <div class="space-y-4">
          <div class="space-y-1.5">
            <p class="text-xs text-muted-foreground">
              {formatSize(totalSize)} of {formatSize(MAX_TOTAL_UPLOAD_SIZE)} used
            </p>
            <ProgressBar
              progress={(totalSize / MAX_TOTAL_UPLOAD_SIZE) * 100}
              thin
            />
          </div>

          <DropZone
            onFilesSelect={handleFilesSelect}
            disabled={isProcessing}
            maxTotalSize={MAX_TOTAL_UPLOAD_SIZE}
            compact
          />

          {#if browserMemoryWarning}
            <Alert tone="warning">
              {browserMemoryWarning}
            </Alert>
          {/if}

          {#if uploadStore.status === "error" && uploadStore.error}
            <Alert tone="destructive" title="Upload failed">
              {uploadStore.error}
              {#snippet action()}
                {#if uploadStore.errorUpgradeUrl}
                  <Button
                    fullWidth={false}
                    onclick={() => goto(uploadStore.errorUpgradeUrl!)}
                  >
                    Upgrade to Pro
                  </Button>
                {/if}
                <Button variant="secondary" fullWidth={false} onclick={clearError}>
                  Try again
                </Button>
              {/snippet}
            </Alert>
          {/if}

          {#if auth.isAuthenticated && auth.needsVaultSetup}
            <Alert tone="warning" title="Set up your vault first">
              Signed-in uploads save filenames to your dashboard. Finish vault
              setup before uploading.
              {#snippet action()}
                <Button variant="secondary" fullWidth={false} onclick={goToSetup}>
                  Set up vault
                </Button>
              {/snippet}
            </Alert>
          {/if}

          <div>
            {#each uploadStore.files as fileState, index (fileState.file.name + index)}
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

          <div
            class={[
              "space-y-5 pt-2 transition-opacity duration-200 ease-out",
              isProcessing && "opacity-60 pointer-events-none",
            ]}
          >
            <div class="space-y-1">
              <TextInput
                id="transfer-title"
                label="Transfer name (optional)"
                placeholder="e.g. Q3 designs"
                value={uploadStore.title}
                oninput={(e) =>
                  uploadStore.setTitle(
                    (e.currentTarget as HTMLInputElement).value,
                  )}
                maxlength={TITLE_MAX + 32}
                disabled={isProcessing}
              />
              <p class="text-xs text-muted-foreground">
                Encrypted in your browser with the same key as the files. Anyone
                with the share link sees the name; the server only stores
                ciphertext.
              </p>
              {#if uploadStore.title.length > TITLE_MAX}
                <p class="text-xs text-warning-foreground">
                  {uploadStore.title.length} / {TITLE_MAX} — too long. We'll
                  ship this transfer without a name unless you trim it.
                </p>
              {/if}
            </div>

            <SegmentedControl
              label="Expires in"
              options={EXPIRES_OPTIONS}
              value={uploadStore.expiresInHours}
              onChange={(v) => uploadStore.setExpiresInHours(v)}
              disabled={isProcessing}
            />

            <SegmentedControl
              label="Max downloads"
              options={DOWNLOADS_OPTIONS}
              value={uploadStore.maxDownloads}
              onChange={(v) => uploadStore.setMaxDownloads(v)}
              disabled={isProcessing}
            />

            <div class="space-y-2">
              <Checkbox
                checked={uploadStore.passwordEnabled}
                onchange={(e) =>
                  uploadStore.setPasswordEnabled(
                    (e.currentTarget as HTMLInputElement).checked,
                  )}
                disabled={isProcessing}
              >
                Password protect
              </Checkbox>

              {#if uploadStore.passwordEnabled}
                <PasswordInput
                  id="transfer-password"
                  label="Password"
                  srOnlyLabel
                  placeholder="Enter a password"
                  value={uploadStore.password}
                  oninput={(e) =>
                    uploadStore.setPassword(
                      (e.currentTarget as HTMLInputElement).value,
                    )}
                  disabled={isProcessing}
                />
                {#if uploadStore.password.length > 0 && passwordTooShort}
                  <p class="text-xs text-warning-foreground">
                    Password must be at least {MIN_PASSWORD_LENGTH} characters
                  </p>
                {/if}
              {/if}
            </div>

            {#if auth.isAuthenticated && !auth.needsVaultSetup}
              <p class="text-xs text-muted-foreground">
                Signed in — this transfer will be saved to your dashboard so
                you can rename, delete, or rebuild the share link later.
              </p>
            {/if}
          </div>
        </div>
      </Frame.Panel>
      <Frame.Footer class="px-5 py-4">
        {#if isProcessing}
          <Button variant="primary" disabled>
            <Spinner class="size-4" />
            Encrypting and uploading…
          </Button>
        {:else}
          <Button
            variant="primary"
            onclick={handleUpload}
            disabled={passwordTooShort || (auth.isAuthenticated && auth.needsVaultSetup)}
          >
            Create share link
          </Button>
        {/if}
      </Frame.Footer>
    {:else}
      <Frame.Panel>
        {#if uploadStore.status === "error" && uploadStore.error}
          <div class="mb-4">
            <Alert tone="destructive" title="Couldn't add files">
              {uploadStore.error}
              {#snippet action()}
                {#if uploadStore.errorUpgradeUrl}
                  <Button
                    fullWidth={false}
                    onclick={() => goto(uploadStore.errorUpgradeUrl!)}
                  >
                    Upgrade to Pro
                  </Button>
                {/if}
                <Button variant="secondary" fullWidth={false} onclick={clearError}>
                  Dismiss
                </Button>
              {/snippet}
            </Alert>
          </div>
        {/if}
        <DropZone
          onFilesSelect={handleFilesSelect}
          disabled={isProcessing}
          maxTotalSize={MAX_TOTAL_UPLOAD_SIZE}
        />
      </Frame.Panel>
    {/if}
  </Frame.Root>

  <SiteFooter current="home">
    {#snippet tagline()}
      All files are end-to-end encrypted in your browser before upload.
      JTransfer cannot read your files, even in transit or at rest.
    {/snippet}
  </SiteFooter>

  <section
    class="mt-12 pt-10 border-t border-border/60 text-sm text-muted-foreground leading-relaxed space-y-3"
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
</PageLayout>

<Modal
  open={unlockOpen}
  title="Unlock your vault to upload"
  description="Signed-in transfers are saved to your dashboard. Unlock your vault so we can wrap this transfer for later."
  onClose={closeUnlockModal}
>
  <form onsubmit={submitUnlock} class="space-y-4" novalidate>
    {#if unlockMode === "password"}
      <PasswordInput
        id="upload-unlock-password"
        label="Vault password"
        autocomplete="current-password"
        required
        bind:value={unlockPassword}
        disabled={isUnlockingVault}
      />
    {:else}
      <Textarea
        id="upload-unlock-phrase"
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

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
    </div>
  </form>
</Modal>
