<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api, type OwnedTransferSummary } from "$lib/api/client";
  import { decryptFilename } from "$lib/crypto/decrypt";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import {
    deriveVaultKey,
    importTransferKey,
    isVaultUnlocked,
    transferKeyToFragment,
    unwrapTransferKey,
  } from "$lib/vault/client";

  // States per vaulted row.
  //   "locked"           — server says vaulted, K_vault not derived yet.
  //   "unlocking"        — vault unlock in flight (one row or batch).
  //   "unlocked"         — filenames decrypted, names[] populated.
  //   "blind-credential" — wrappedKey present but unwrap returned null
  //                        (credential gone server-side or wrong device).
  //   "blind-error"      — files fetch or filename decrypt threw mid-flight.
  // Non-vaulted rows (`wrappedKey === null`) skip this state entirely and
  // render the legacy "N files" line.
  type VaultRowState =
    | { status: "locked" }
    | { status: "unlocking" }
    | { status: "unlocked"; names: string[] }
    | { status: "blind-credential" }
    | { status: "blind-error" };

  let transfers = $state<OwnedTransferSummary[]>([]);
  let nextCursor = $state<string | null>(null);
  let isLoading = $state(false);
  let isLoadingMore = $state(false);
  let errorMessage = $state<string | null>(null);
  let confirmingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let vaultStates = $state<Record<string, VaultRowState>>({});
  let isUnlocking = $state(false);
  let vaultUnlockError = $state<string | null>(null);
  // "Get share link" per-row reveal (doc 28 §3 / D-117). The URL is
  // rebuilt on demand from the unwrapped K_transfer; we keep the
  // recovered URL in component state only as long as the user has the
  // reveal panel open (cleared on hide / cancel / row delete).
  let recoveredShareUrl = $state<Record<string, string>>({});
  let recoveringId = $state<string | null>(null);
  let recoverError = $state<string | null>(null);
  let copiedShareId = $state<string | null>(null);
  // Sentinel so the auth-driven $effect fires loadFirstPage exactly once.
  // Gating on `transfers.length === 0` instead loops forever for accounts
  // with no transfers.
  let hasAttemptedLoad = $state(false);

  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
      return;
    }
    if (!hasAttemptedLoad) {
      hasAttemptedLoad = true;
      void loadFirstPage();
    }
  });

  function seedVaultStates(rows: OwnedTransferSummary[]) {
    for (const t of rows) {
      if (!t.wrappedKey || !t.wrapCredentialId) continue;
      if (vaultStates[t.id]) continue;
      // If K_vault is already cached this session (e.g. user unlocked, then
      // paginated), kick off unwrap-and-decrypt for this row immediately.
      if (isVaultUnlocked(t.wrapCredentialId)) {
        vaultStates[t.id] = { status: "unlocking" };
        void unwrapRow(t);
      } else {
        vaultStates[t.id] = { status: "locked" };
      }
    }
  }

  async function loadFirstPage() {
    isLoading = true;
    errorMessage = null;
    try {
      const res = await api.listMyTransfers();
      transfers = res.transfers;
      nextCursor = res.nextCursor;
      seedVaultStates(res.transfers);
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't load your transfers.";
    } finally {
      isLoading = false;
    }
  }

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    isLoadingMore = true;
    try {
      const res = await api.listMyTransfers(nextCursor);
      transfers = [...transfers, ...res.transfers];
      nextCursor = res.nextCursor;
      seedVaultStates(res.transfers);
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't load more transfers.";
    } finally {
      isLoadingMore = false;
    }
  }

  async function unwrapRow(t: OwnedTransferSummary) {
    if (!t.wrappedKey || !t.wrapCredentialId) return;

    const raw = await unwrapTransferKey(t.wrappedKey, t.wrapCredentialId);
    if (!raw) {
      // Per doc 28 §4: missing credential or tag failure → soft fail.
      vaultStates[t.id] = { status: "blind-credential" };
      return;
    }

    try {
      const transferKey = await importTransferKey(raw);
      const { files } = await api.getMyTransferFiles(t.id);
      const names = await Promise.all(
        files.map((f) =>
          decryptFilename(f.encryptedName, f.encryptedNameIv, transferKey),
        ),
      );
      vaultStates[t.id] = { status: "unlocked", names };
    } catch {
      vaultStates[t.id] = { status: "blind-error" };
    }
  }

  async function unlockVault() {
    if (isUnlocking) return;
    vaultUnlockError = null;
    isUnlocking = true;
    try {
      const derived = await deriveVaultKey();
      if (!derived) {
        vaultUnlockError =
          "Couldn't unlock filenames — passkey verification was cancelled or unavailable.";
        return;
      }

      // Flip all locked rows that match the derived credential to "unlocking"
      // first so the UI shows progress, then resolve them in parallel.
      const targets: OwnedTransferSummary[] = [];
      for (const t of transfers) {
        const st = vaultStates[t.id];
        if (
          st?.status === "locked" &&
          t.wrapCredentialId === derived.credentialId
        ) {
          vaultStates[t.id] = { status: "unlocking" };
          targets.push(t);
        }
      }
      await Promise.all(targets.map((t) => unwrapRow(t)));

      // Rows wrapped under a *different* credential of the same user stay
      // locked — surfaced via the per-row helper text. They'll unlock when
      // the user signs in with that other passkey on this device.
    } finally {
      isUnlocking = false;
    }
  }

  async function recoverShareLink(t: OwnedTransferSummary) {
    if (!t.wrappedKey || !t.wrapCredentialId) return;
    if (recoveringId === t.id) return;
    recoveringId = t.id;
    recoverError = null;
    try {
      const raw = await unwrapTransferKey(t.wrappedKey, t.wrapCredentialId);
      if (!raw) {
        recoverError =
          "Couldn't rebuild the share link — the sign-in key that wrapped this transfer isn't available here.";
        return;
      }
      const fragment = transferKeyToFragment(raw);
      recoveredShareUrl[t.id] = `${window.location.origin}/d/${t.id}#${fragment}`;
    } catch {
      recoverError = "Couldn't rebuild the share link.";
    } finally {
      recoveringId = null;
    }
  }

  function hideShareLink(id: string) {
    delete recoveredShareUrl[id];
    if (copiedShareId === id) copiedShareId = null;
  }

  async function copyShareLink(id: string) {
    const url = recoveredShareUrl[id];
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    copiedShareId = id;
    setTimeout(() => {
      if (copiedShareId === id) copiedShareId = null;
    }, 2000);
  }

  function nameSummary(names: string[]): string {
    if (names.length === 0) return "(no files)";
    if (names.length <= 2) return names.join(", ");
    return `${names[0]}, ${names[1]} + ${names.length - 2} more`;
  }

  const lockedVaultedCount = $derived(
    transfers.filter((t) => vaultStates[t.id]?.status === "locked").length,
  );

  async function confirmDelete(id: string) {
    if (deletingId) return;
    deletingId = id;
    try {
      await api.deleteMyTransfer(id);
      transfers = transfers.filter((t) => t.id !== id);
      delete recoveredShareUrl[id];
      delete vaultStates[id];
      confirmingId = null;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't delete that transfer.";
      // If the row already vanished server-side, drop it from the UI too.
      if (errorMessage === "Transfer not found.") {
        transfers = transfers.filter((t) => t.id !== id);
        confirmingId = null;
      }
    } finally {
      deletingId = null;
    }
  }

  function cancelConfirm() {
    confirmingId = null;
  }

  function statusOf(t: OwnedTransferSummary): { label: string; tone: "success" | "warning" | "muted" } {
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

  function formatDate(iso: string) {
    return dateFmt.format(new Date(iso));
  }

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

<svelte:head>
  <title>Dashboard — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  {#if !auth.loaded}
    <div
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-16 text-info"
    >
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if auth.user}
    {@const userEmail = auth.user.email}
    <PageHeader title="Your transfers" align="left">
      {#snippet actions()}
        <span class="text-sm text-muted-foreground">
          Signed in as <span class="text-foreground">{userEmail}</span>
        </span>
        <a
          href="/dashboard/settings"
          class="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        >
          Settings
        </a>
      {/snippet}
    </PageHeader>

    <div class="space-y-6">
      <p class="text-sm text-muted-foreground">
        Transfers you create while signed in appear here. File contents stay
        end-to-end encrypted — only the original share link (with its key) can
        decrypt them.
      </p>

      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if vaultUnlockError}
        <Alert tone="warning">{vaultUnlockError}</Alert>
      {/if}

      {#if recoverError}
        <Alert tone="warning">{recoverError}</Alert>
      {/if}

      {#if lockedVaultedCount > 0}
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <p class="text-sm text-muted-foreground">
            {lockedVaultedCount}
            {lockedVaultedCount === 1 ? "transfer has" : "transfers have"} encrypted filenames saved to your dashboard. Unlock them with your passkey to view.
          </p>
          <div class="sm:shrink-0">
            <Button
              variant="secondary"
              fullWidth={false}
              onclick={unlockVault}
              disabled={isUnlocking}
            >
              {#if isUnlocking}
                <Spinner aria-hidden="true" />
                Unlocking…
              {:else}
                Unlock filenames
              {/if}
            </Button>
          </div>
        </div>
      {/if}

      {#if isLoading}
        <div
          role="status"
          aria-live="polite"
          class="flex flex-col items-center gap-4 py-12 text-info"
        >
          <Spinner class="size-8" aria-hidden="true" />
          <p class="text-muted-foreground">Loading your transfers…</p>
        </div>
      {:else if transfers.length === 0}
        <Frame.Root>
          <Frame.Panel>
            <div class="text-center space-y-3">
              <h2 class="text-lg font-medium text-foreground">No transfers yet</h2>
              <p class="text-sm text-muted-foreground">
                When you upload a file while signed in, it'll show up here so
                you can manage it.
              </p>
              <div class="flex justify-center pt-2">
                <Button href="/" fullWidth={false}>Create a transfer</Button>
              </div>
            </div>
          </Frame.Panel>
        </Frame.Root>
      {:else}
        <ul class="space-y-3">
          {#each transfers as t (t.id)}
            {@const status = statusOf(t)}
            {@const vaultState = vaultStates[t.id]}
            {@const canRecover = vaultState?.status === "unlocked"}
            {@const shareUrl = recoveredShareUrl[t.id]}
            <li class="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    {#if vaultState?.status === "unlocked"}
                      <span
                        class="text-sm font-medium text-foreground truncate"
                        title={vaultState.names.join("\n")}
                      >
                        {nameSummary(vaultState.names)}
                      </span>
                    {:else}
                      <span class="text-sm font-medium text-foreground">
                        {t.fileCount} {t.fileCount === 1 ? "file" : "files"}
                      </span>
                    {/if}
                    <span class="text-sm text-muted-foreground">·</span>
                    <span class="text-sm text-muted-foreground">{formatSize(t.totalBytes)}</span>
                    {#if t.hasPassword}
                      <span class="text-sm text-muted-foreground">·</span>
                      <span class="text-xs text-muted-foreground">password-protected</span>
                    {/if}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    Created {formatDate(t.createdAt)} · Expires {relativeExpiry(t.expiresAt)}
                    · {t.downloadCount} {t.downloadCount === 1 ? "download" : "downloads"}
                  </p>
                  {#if vaultState?.status === "locked"}
                    <p class="text-xs text-muted-foreground">
                      Filenames saved — unlock with your passkey to view.
                    </p>
                  {:else if vaultState?.status === "unlocking"}
                    <p class="text-xs text-muted-foreground">Unlocking filenames…</p>
                  {:else if vaultState?.status === "blind-credential"}
                    <p class="text-xs text-muted-foreground">
                      Filenames are saved under a sign-in key that isn't available here.
                      The files stay downloadable to anyone with the share link.
                    </p>
                  {:else if vaultState?.status === "blind-error"}
                    <p class="text-xs text-muted-foreground">
                      Couldn't read saved filenames for this transfer.
                    </p>
                  {/if}
                </div>
                <div class="flex items-center gap-2 sm:shrink-0">
                  {#if confirmingId === t.id}
                    <span class="text-sm text-muted-foreground" aria-live="polite">
                      Delete?
                    </span>
                    <Button
                      variant="destructive"
                      fullWidth={false}
                      onclick={() => confirmDelete(t.id)}
                      disabled={deletingId === t.id}
                    >
                      {#if deletingId === t.id}
                        <Spinner aria-hidden="true" />
                        Deleting…
                      {:else}
                        Confirm
                      {/if}
                    </Button>
                    <Button
                      variant="ghost"
                      fullWidth={false}
                      onclick={cancelConfirm}
                      disabled={deletingId === t.id}
                    >
                      Cancel
                    </Button>
                  {:else}
                    {#if canRecover && !shareUrl}
                      <Button
                        variant="ghost"
                        fullWidth={false}
                        onclick={() => recoverShareLink(t)}
                        disabled={recoveringId === t.id}
                      >
                        {#if recoveringId === t.id}
                          <Spinner aria-hidden="true" />
                          Rebuilding…
                        {:else}
                          Get share link
                        {/if}
                      </Button>
                    {/if}
                    <Button
                      variant="ghost"
                      fullWidth={false}
                      onclick={() => (confirmingId = t.id)}
                    >
                      Delete
                    </Button>
                  {/if}
                </div>
              </div>

              {#if shareUrl}
                <div class="space-y-2 border-t border-border pt-3">
                  <p class="text-xs text-muted-foreground">
                    Anyone with this link can download the files. The key
                    after the <code class="font-mono">#</code> never reaches our servers.
                  </p>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readonly
                      value={shareUrl}
                      class="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
                    />
                    <div class="flex gap-2 sm:shrink-0">
                      <Button
                        variant="secondary"
                        fullWidth={false}
                        onclick={() => copyShareLink(t.id)}
                      >
                        {#if copiedShareId === t.id}
                          Copied!
                        {:else}
                          Copy
                        {/if}
                      </Button>
                      <Button
                        variant="ghost"
                        fullWidth={false}
                        onclick={() => hideShareLink(t.id)}
                      >
                        Hide
                      </Button>
                    </div>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>

        {#if nextCursor}
          <div class="flex justify-center">
            <Button
              variant="secondary"
              fullWidth={false}
              onclick={loadMore}
              disabled={isLoadingMore}
            >
              {#if isLoadingMore}
                <Spinner aria-hidden="true" />
                Loading…
              {:else}
                Load more
              {/if}
            </Button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</PageLayout>
