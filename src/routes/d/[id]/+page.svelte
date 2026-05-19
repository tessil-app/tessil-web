<script lang="ts">
  import { page } from "$app/stores";
  import { api, type TransferMetadata } from "$lib/api/client";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { decryptFile, decryptFilename, decryptString } from "$lib/crypto/decrypt";
  import { importKey, isWrappedKey, unwrapKey } from "$lib/crypto/key";
  import { formatSize } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
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
  // Decrypted transfer title (ADR-0005). Surfaced as the page H1 once the
  // fragment key has decrypted it; never sent to or seen by the server.
  let decryptedTitle = $state<string | null>(null);

  let password = $state("");
  let passwordError = $state<string | null>(null);
  let isVerifyingPassword = $state(false);
  let transferId = $state<string | null>(null);
  let rawFragment = $state<string | null>(null);

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
        errorMessage = "The sender set an expiry date that has passed.";
      } else if (lower.includes("not found") || lower.includes("404")) {
        errorTitle = "This link is no longer valid";
        errorMessage =
          "The transfer may have expired, been deleted, or the link is incorrect.";
      } else {
        errorTitle = "Unable to access files";
        errorMessage = message;
      }
      pageStatus = "error";
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

    // Best-effort title decrypt. A failure here is non-fatal — we keep the
    // generic H1 and let the recipient continue.
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

  async function downloadFile(index: number) {
    const file = files[index];
    if (!key || file.status === "downloading") return;

    try {
      files[index].status = "downloading";
      files[index].progress = 0;

      files[index].progress = 10;
      const encryptedData = await api.downloadFile(
        file.id,
        accessToken ?? undefined
      );
      files[index].progress = 70;

      const decryptedBlob = await decryptFile(
        encryptedData,
        file.fileIv,
        key,
        (p) => {
          files[index].progress = 70 + p * 0.3;
        }
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
      files[index].error =
        err instanceof Error ? err.message : "Download failed";
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
  const isSingleFile = $derived(files.length === 1);
  const fileCountTitle = $derived(
    `${files.length} file${files.length !== 1 ? "s" : ""} received`
  );
  const downloadAllLabel = $derived(
    isSingleFile && files[0]
      ? `Download ${files[0].name}`
      : `Download all (${files.length})`
  );

  // Page H1: prefer the decrypted title once the recipient has unlocked
  // (or for unprotected transfers, decrypted) the fragment key. Otherwise
  // fall back to the standing security tagline. The marketing copy moves
  // to the tagline slot so the trust signal is still visible.
  const pageH1 = $derived(
    pageStatus === "ready" && decryptedTitle
      ? decryptedTitle
      : "Encrypted in your browser."
  );
  const pageTagline = $derived(
    pageStatus === "ready" && decryptedTitle
      ? "Files are decrypted in your browser — we never saw the contents."
      : "Your files are scrambled before they leave your device — we never see the contents."
  );
</script>

<svelte:head>
  <title>Secure Download - JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  <PageHeader
    title={pageH1}
    tagline={pageTagline}
    wordmarkHref={null}
  />

  <Frame.Root>
    <Frame.Header>
      <Frame.Title>
        {#if pageStatus === "ready"}
          {fileCountTitle}
        {:else}
          Encrypted transfer
        {/if}
      </Frame.Title>
      <Frame.Description class="flex items-center gap-2">
        <IconLockRegular class="size-4" />
        Encrypted end-to-end. The server never saw the contents.
      </Frame.Description>
    </Frame.Header>

    <Frame.Panel>
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
            This transfer is password protected. Enter the password to decrypt.
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
        <Alert tone="destructive" title={errorTitle}>
          {errorMessage}
        </Alert>
      {:else if pageStatus === "ready"}
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
    </Frame.Panel>

    {#if pageStatus === "password_required"}
      <Frame.Footer>
        <Button
          variant="primary"
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
      </Frame.Footer>
    {:else if pageStatus === "ready"}
      <Frame.Footer>
        {#if allComplete}
          <Button variant="primary" disabled>
            <IconCheckRegular class="size-4" />
            Downloaded
          </Button>
        {:else if downloadAllInProgress || anyDownloading}
          <Button variant="primary" disabled>
            <Spinner class="size-4" />
            Downloading…
          </Button>
        {:else}
          <Button variant="primary" onclick={downloadAllFiles}>
            <IconDownloadRegular class="size-4" />
            {downloadAllLabel}
          </Button>
        {/if}
      </Frame.Footer>
    {/if}
  </Frame.Root>

  <SiteFooter current="download">
    {#snippet tagline()}
      <a
        href="/"
        class="hover:text-foreground transition-colors duration-200 ease-out"
      >
        Share your own files securely →
      </a>
    {/snippet}
  </SiteFooter>
</PageLayout>
