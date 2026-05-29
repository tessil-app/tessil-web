<script lang="ts">
  import { api, type OwnedTransferSummary } from "$lib/api/client";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { encryptString } from "$lib/crypto/encrypt";
  import { formatSize } from "$lib/utils";
  import {
    importTransferKey,
    transferKeyToFragment,
    unwrapTransferKey,
  } from "$lib/vault/client";

  export type VaultRowState =
    | { status: "locked" }
    | { status: "unlocking" }
    | { status: "unlocked"; names: string[]; title: string | null }
    | { status: "blind-error" };

  interface Props {
    open: boolean;
    userId: string | null;
    transfer: OwnedTransferSummary | null;
    vaultState: VaultRowState | undefined;
    onClose: () => void;
    /** Parent removes the row from its list. */
    onDeleted: (id: string) => void;
    /** Parent updates its cached title + ciphertext for the row. */
    onTitleSaved: (
      id: string,
      decryptedTitle: string | null,
      encryptedTitle: string | null,
      encryptedTitleIv: string | null,
    ) => void;
  }

  const TITLE_MAX = 200;

  let {
    open,
    userId,
    transfer,
    vaultState,
    onClose,
    onDeleted,
    onTitleSaved,
  }: Props = $props();

  let originalTitle = $state("");
  let titleInput = $state("");
  let titleSaving = $state(false);
  let titleError = $state<string | null>(null);

  let shareUrl = $state<string | null>(null);
  let recovering = $state(false);
  let recoverError = $state<string | null>(null);
  let copied = $state(false);

  let confirmingDelete = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  // Re-seed transient state every time the open transfer changes.
  let lastSeededId = $state<string | null>(null);
  $effect(() => {
    if (!open || !transfer) return;
    if (lastSeededId === transfer.id) return;
    lastSeededId = transfer.id;
    const decrypted =
      vaultState?.status === "unlocked" ? vaultState.title ?? "" : "";
    originalTitle = decrypted;
    titleInput = decrypted;
    titleError = null;
    shareUrl = null;
    recovering = false;
    recoverError = null;
    copied = false;
    confirmingDelete = false;
    deleting = false;
    deleteError = null;
  });

  // Pick up a freshly-decrypted title when the vault unlocks mid-drawer, unless the user is editing.
  $effect(() => {
    if (!open || !transfer) return;
    if (vaultState?.status !== "unlocked") return;
    if (titleInput !== originalTitle) return;
    const fresh = vaultState.title ?? "";
    if (fresh !== originalTitle) {
      originalTitle = fresh;
      titleInput = fresh;
    }
  });

  const trimmedTitle = $derived(titleInput.trim());
  const titleDirty = $derived(trimmedTitle !== originalTitle.trim());
  const titleOverLimit = $derived(titleInput.length > TITLE_MAX);
  const canSaveTitle = $derived(
    titleDirty &&
      !titleOverLimit &&
      !titleSaving &&
      vaultState?.status === "unlocked",
  );

  async function saveTitle() {
    if (!transfer || !userId) return;
    if (!canSaveTitle) return;
    titleSaving = true;
    titleError = null;
    try {
      let encryptedTitle: string | null = null;
      let encryptedTitleIv: string | null = null;

      if (trimmedTitle.length > 0) {
        const raw = await unwrapTransferKey(userId, transfer.wrappedKey ?? "");
        if (!raw) {
          titleError = "Couldn't unlock this transfer's key. Try unlocking the vault again.";
          return;
        }
        const transferKey = await importTransferKey(raw);
        const { ciphertext, iv } = await encryptString(trimmedTitle, transferKey);
        encryptedTitle = ciphertext;
        encryptedTitleIv = iv;
      }

      await api.setMyTransferTitle(transfer.id, encryptedTitle, encryptedTitleIv);
      const newDecrypted = trimmedTitle.length > 0 ? trimmedTitle : null;
      onTitleSaved(transfer.id, newDecrypted, encryptedTitle, encryptedTitleIv);
      originalTitle = trimmedTitle;
      titleInput = trimmedTitle;
    } catch (err) {
      titleError = err instanceof Error ? err.message : "Couldn't save the title.";
    } finally {
      titleSaving = false;
    }
  }

  function cancelTitleEdit() {
    titleInput = originalTitle;
    titleError = null;
  }

  async function recoverShareLink() {
    if (!transfer || !userId || !transfer.wrappedKey || recovering) return;
    recovering = true;
    recoverError = null;
    try {
      const raw = await unwrapTransferKey(userId, transfer.wrappedKey);
      if (!raw) {
        recoverError =
          "Couldn't rebuild the share link — the vault couldn't decrypt this transfer.";
        return;
      }
      const fragment = transferKeyToFragment(raw);
      shareUrl = `${window.location.origin}/d/${transfer.id}#${fragment}`;
    } catch {
      recoverError = "Couldn't rebuild the share link.";
    } finally {
      recovering = false;
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  async function performDelete() {
    if (!transfer || deleting) return;
    deleting = true;
    deleteError = null;
    try {
      await api.deleteMyTransfer(transfer.id);
      onDeleted(transfer.id);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't delete that transfer.";
      if (msg === "Transfer not found.") {
        // Treat as already-gone so the row clears.
        onDeleted(transfer.id);
        onClose();
        return;
      }
      deleteError = msg;
    } finally {
      deleting = false;
    }
  }

  function statusOf(t: OwnedTransferSummary): {
    label: string;
    tone: "success" | "warning" | "muted";
  } {
    const expired = new Date(t.expiresAt) < new Date();
    if (expired) return { label: "Expired", tone: "muted" };
    if (!t.isCompleted) return { label: "In progress", tone: "warning" };
    return { label: "Active", tone: "success" };
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function relativeExpiry(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "expired";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `in ${hours}h`;
    const days = Math.round(hours / 24);
    return `in ${days}d`;
  }
</script>

<Drawer {open} {onClose} title="Transfer details">
  {#if transfer}
    {@const status = statusOf(transfer)}
    {@const canRecover = vaultState?.status === "unlocked"}
    {@const decryptedNames = vaultState?.status === "unlocked" ? vaultState.names : null}

    <div class="space-y-3">
      <section class="space-y-2 rounded-lg bg-card p-4">
        <label
          for="transfer-title-input"
          class="block text-sm font-medium text-foreground"
        >
          Transfer name
        </label>
        {#if vaultState?.status === "unlocked"}
          <TextInput
            id="transfer-title-input"
            bind:value={titleInput}
            placeholder="Optional — give this transfer a memorable name"
            maxlength={TITLE_MAX + 32}
            disabled={titleSaving}
          />
          <p class="text-xs text-muted-foreground">
            Encrypted in your browser with this transfer's key. Recipients
            using the share link see the same name; the server only stores
            the ciphertext.
          </p>
          {#if titleOverLimit}
            <p class="text-xs text-destructive-foreground">
              {titleInput.length} / {TITLE_MAX} — too long. Trim it down to save.
            </p>
          {/if}
          {#if titleError}
            <Alert tone="destructive">{titleError}</Alert>
          {/if}
        {:else if vaultState?.status === "locked"}
          <p class="text-sm text-muted-foreground">
            Unlock the vault to view or change this transfer's name.
          </p>
        {:else if vaultState?.status === "unlocking"}
          <p class="text-sm text-muted-foreground">Unlocking…</p>
        {:else if vaultState?.status === "blind-error"}
          <p class="text-sm text-muted-foreground">
            We couldn't decrypt this transfer's metadata. The files themselves
            stay downloadable with the original share link.
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">
            This transfer was created without a vault wrap, so it has no
            editable name. The download page still shows its files.
          </p>
        {/if}
      </section>

      <section class="space-y-3 rounded-lg bg-card p-4">
        <h3 class="text-sm font-medium text-foreground">
          Files
          <span class="text-muted-foreground font-normal">
            · {transfer.fileCount} {transfer.fileCount === 1 ? "file" : "files"}
            · {formatSize(transfer.totalBytes)}
          </span>
        </h3>
        {#if decryptedNames}
          {#if decryptedNames.length > 0}
            <div>
              <div class="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </div>
              <ul class="border-y border-border divide-y divide-border">
                {#each decryptedNames as name, i (`${transfer.id}-${i}`)}
                  <li class="px-3 py-2 text-sm text-foreground truncate" title={name}>
                    {name}
                  </li>
                {/each}
              </ul>
            </div>
          {:else}
            <p class="text-sm text-muted-foreground">No files in this transfer.</p>
          {/if}
        {:else}
          <p class="text-sm text-muted-foreground">
            Filenames are end-to-end encrypted. Unlock the vault to see them.
          </p>
        {/if}
      </section>

      <section class="space-y-2 rounded-lg bg-card p-4">
        <h3 class="text-sm font-medium text-foreground">Details</h3>
        <dl class="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <dt class="text-muted-foreground">Status</dt>
          <dd><Badge tone={status.tone}>{status.label}</Badge></dd>

          <dt class="text-muted-foreground">Created</dt>
          <dd class="text-foreground">{dateFmt.format(new Date(transfer.createdAt))}</dd>

          <dt class="text-muted-foreground">Expires</dt>
          <dd class="text-foreground">
            {dateFmt.format(new Date(transfer.expiresAt))}
            <span class="text-muted-foreground">({relativeExpiry(transfer.expiresAt)})</span>
          </dd>

          <dt class="text-muted-foreground">Downloads</dt>
          <dd class="text-foreground">{transfer.downloadCount}</dd>

          <dt class="text-muted-foreground">Password</dt>
          <dd class="text-foreground">
            {transfer.hasPassword ? "Required" : "None"}
          </dd>
        </dl>
      </section>

      <section class="space-y-2 rounded-lg bg-card p-4">
        <h3 class="text-sm font-medium text-foreground">Share link</h3>
        {#if recoverError}
          <Alert tone="warning">{recoverError}</Alert>
        {/if}
        {#if shareUrl}
          <p class="text-xs text-muted-foreground">
            Anyone with this link can download the files. The key after the
            <code class="font-mono">#</code> never reaches our servers.
          </p>
          <input
            type="text"
            readonly
            value={shareUrl}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <div class="flex gap-2">
            <Button variant="secondary" fullWidth={false} onclick={copyShareLink}>
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              variant="ghost"
              fullWidth={false}
              onclick={() => {
                shareUrl = null;
                copied = false;
              }}
            >
              Hide
            </Button>
          </div>
        {:else if canRecover && transfer.wrappedKey}
          <p class="text-xs text-muted-foreground">
            Rebuild the original share link from your vault. Nothing is sent
            to our servers — the key is derived in your browser.
          </p>
          <Button
            variant="secondary"
            fullWidth={false}
            onclick={recoverShareLink}
            disabled={recovering}
          >
            {#if recovering}
              <Spinner aria-hidden="true" />
              Rebuilding…
            {:else}
              Get share link
            {/if}
          </Button>
        {:else if !transfer.wrappedKey}
          <p class="text-sm text-muted-foreground">
            This transfer wasn't saved with a vault wrap, so the share link
            can't be rebuilt here. The link you used at upload time is the
            only copy.
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">
            Unlock the vault to rebuild this transfer's share link.
          </p>
        {/if}
      </section>

      <section class="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 class="text-sm font-medium text-foreground">Danger zone</h3>
        <p class="text-xs text-muted-foreground">
          Deleting removes the encrypted files and revokes the share link.
          This can't be undone.
        </p>
        {#if deleteError}
          <Alert tone="destructive">{deleteError}</Alert>
        {/if}
        {#if confirmingDelete}
          <div class="flex flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              fullWidth={false}
              onclick={performDelete}
              disabled={deleting}
            >
              {#if deleting}
                <Spinner aria-hidden="true" />
                Deleting…
              {:else}
                Confirm delete
              {/if}
            </Button>
            <Button
              variant="ghost"
              fullWidth={false}
              onclick={() => (confirmingDelete = false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        {:else}
          <Button
            variant="destructive"
            fullWidth={false}
            onclick={() => (confirmingDelete = true)}
          >
            Delete transfer
          </Button>
        {/if}
      </section>
    </div>
  {/if}

  {#snippet footer()}
    {#if titleDirty}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={cancelTitleEdit}
        disabled={titleSaving}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        fullWidth={false}
        onclick={saveTitle}
        disabled={!canSaveTitle}
      >
        {#if titleSaving}
          <Spinner aria-hidden="true" />
          Saving…
        {:else}
          Save name
        {/if}
      </Button>
    {:else}
      <Button type="button" variant="secondary" fullWidth={false} onclick={onClose}>
        Close
      </Button>
    {/if}
  {/snippet}
</Drawer>
