<script lang="ts">
  // Dashboard list. Post-ADR-0004 every owned transfer is wrapped under a
  // single per-user K_vault, so unlocking is one password prompt — no more
  // per-credential branching. Eager prompt on mount; "Skip" collapses to a
  // banner the user can re-tap.

  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import { api, type OwnedTransferSummary } from "$lib/api/client";
  import { decryptFilename } from "$lib/crypto/decrypt";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import {
    importTransferKey,
    isUnlocked,
    subscribeToVaultState,
    transferKeyToFragment,
    unlockWithPassword,
    unlockWithPhrase,
    unwrapTransferKey,
  } from "$lib/vault/client";
  import { onDestroy, onMount } from "svelte";

  // Per-row decrypt state. Without per-credential wraps the only failure
  // modes left are "vault locked" (recover by unlocking) and "tag failed"
  // (genuine corruption / wrong vault — rare). We keep one error bucket.
  type VaultRowState =
    | { status: "locked" }
    | { status: "unlocking" }
    | { status: "unlocked"; names: string[] }
    | { status: "blind-error" };

  let transfers = $state<OwnedTransferSummary[]>([]);
  let nextCursor = $state<string | null>(null);
  let isLoading = $state(false);
  let isLoadingMore = $state(false);
  let errorMessage = $state<string | null>(null);
  let confirmingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let vaultStates = $state<Record<string, VaultRowState>>({});

  // Unlock modal state
  let vaultUnlocked = $state(false);
  let promptOpen = $state(false);
  let skipped = $state(false);
  let unlockMode = $state<"password" | "phrase">("password");
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let isUnlocking = $state(false);
  let unlockError = $state<string | null>(null);

  // "Get share link" reveal — same as before, just sourced from K_vault.
  let recoveredShareUrl = $state<Record<string, string>>({});
  let recoveringId = $state<string | null>(null);
  let recoverError = $state<string | null>(null);
  let copiedShareId = $state<string | null>(null);

  let hasAttemptedLoad = $state(false);

  // Subscribe to vault lock/unlock notifications. When the cached K_vault
  // expires (24h TTL) or the user manually locks, we flip every "unlocked"
  // row back to "locked" so the UI matches reality.
  const unsubscribeVault = subscribeToVaultState(({ unlocked }) => {
    vaultUnlocked = unlocked;
    if (!unlocked) {
      for (const id of Object.keys(vaultStates)) {
        if (transfers.find((t) => t.id === id)?.wrappedKey) {
          vaultStates[id] = { status: "locked" };
        }
      }
    }
  });

  onMount(async () => {
    if (auth.user) {
      vaultUnlocked = await isUnlocked(auth.user.id);
    }
  });

  onDestroy(() => unsubscribeVault());

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

  // Eager prompt: as soon as we know the user is signed in and the vault
  // is locked, surface the modal. Don't prompt again after Skip — the
  // banner takes over for the rest of the visit.
  $effect(() => {
    if (!auth.loaded || !auth.isAuthenticated) return;
    if (skipped || vaultUnlocked || promptOpen) return;
    if (!hasAttemptedLoad) return;
    if (lockedVaultedCount === 0) return;
    promptOpen = true;
  });

  async function loadFirstPage() {
    isLoading = true;
    errorMessage = null;
    try {
      const res = await api.listMyTransfers();
      transfers = res.transfers;
      nextCursor = res.nextCursor;
      await seedVaultStates(res.transfers);
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
      await seedVaultStates(res.transfers);
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't load more transfers.";
    } finally {
      isLoadingMore = false;
    }
  }

  async function seedVaultStates(rows: OwnedTransferSummary[]) {
    if (!auth.user) return;
    const unlockedNow = await isUnlocked(auth.user.id);
    for (const t of rows) {
      if (!t.wrappedKey) continue;
      if (vaultStates[t.id]) continue;
      if (unlockedNow) {
        vaultStates[t.id] = { status: "unlocking" };
        void unwrapRow(t);
      } else {
        vaultStates[t.id] = { status: "locked" };
      }
    }
  }

  async function unwrapRow(t: OwnedTransferSummary) {
    if (!t.wrappedKey || !auth.user) return;
    const raw = await unwrapTransferKey(auth.user.id, t.wrappedKey);
    if (!raw) {
      vaultStates[t.id] = { status: "blind-error" };
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

  function openUnlockPrompt() {
    skipped = false;
    unlockError = null;
    unlockPassword = "";
    unlockPhrase = "";
    unlockMode = "password";
    promptOpen = true;
  }

  function closeUnlockPrompt() {
    promptOpen = false;
    if (!vaultUnlocked) skipped = true;
    unlockError = null;
    unlockPassword = "";
    unlockPhrase = "";
  }

  async function handleUnlock(e: SubmitEvent) {
    e.preventDefault();
    if (isUnlocking || !auth.user) return;
    unlockError = null;
    isUnlocking = true;
    try {
      const result =
        unlockMode === "password"
          ? await unlockWithPassword(auth.user.id, unlockPassword)
          : await unlockWithPhrase(auth.user.id, unlockPhrase);
      if (!result.ok) {
        unlockError = unlockErrorMessage(result.reason);
        return;
      }
      // Successful unlock — flip every locked row to "unlocking" and
      // resolve them in parallel. `subscribeToVaultState` already updated
      // `vaultUnlocked` for us.
      const targets = transfers.filter(
        (t) => t.wrappedKey && vaultStates[t.id]?.status !== "unlocked",
      );
      for (const t of targets) vaultStates[t.id] = { status: "unlocking" };
      promptOpen = false;
      unlockPassword = "";
      unlockPhrase = "";
      await Promise.all(targets.map((t) => unwrapRow(t)));
    } catch (err) {
      unlockError = err instanceof Error ? err.message : "Couldn't unlock.";
    } finally {
      isUnlocking = false;
    }
  }

  function unlockErrorMessage(
    reason: "not_setup" | "wrong_password" | "wrong_phrase" | "malformed",
  ): string {
    switch (reason) {
      case "wrong_password":
        return "That password didn't unlock the vault.";
      case "wrong_phrase":
        return "That recovery phrase doesn't match. Check spelling and word order.";
      case "not_setup":
        return "Vault isn't set up yet. Finish setup first.";
      case "malformed":
        return "We couldn't read your vault. Try again — contact support if this keeps happening.";
    }
  }

  async function recoverShareLink(t: OwnedTransferSummary) {
    if (!t.wrappedKey || !auth.user) return;
    if (recoveringId === t.id) return;
    recoveringId = t.id;
    recoverError = null;
    try {
      const raw = await unwrapTransferKey(auth.user.id, t.wrappedKey);
      if (!raw) {
        recoverError =
          "Couldn't rebuild the share link — the vault couldn't decrypt this transfer.";
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
    transfers.filter((t) => t.wrappedKey && vaultStates[t.id]?.status === "locked")
      .length,
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

  const canSubmitUnlock = $derived(
    !isUnlocking &&
      (unlockMode === "password" ? unlockPassword.length > 0 : unlockPhrase.trim().length > 0),
  );
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
    <PageHeader title="Your transfers" align="left" />

    <div class="space-y-6">
      <p class="text-sm text-muted-foreground">
        Transfers you create while signed in appear here. File contents stay
        end-to-end encrypted — only the original share link (with its key)
        can decrypt them.
      </p>

      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if recoverError}
        <Alert tone="warning">{recoverError}</Alert>
      {/if}

      {#if !vaultUnlocked && lockedVaultedCount > 0 && skipped}
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <p class="text-sm text-muted-foreground">
            Vault is locked. {lockedVaultedCount}
            {lockedVaultedCount === 1 ? "transfer has" : "transfers have"} encrypted filenames waiting.
          </p>
          <div class="sm:shrink-0">
            <Button variant="secondary" fullWidth={false} onclick={openUnlockPrompt}>
              Unlock vault
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
                      Filenames saved — unlock the vault to view.
                    </p>
                  {:else if vaultState?.status === "unlocking"}
                    <p class="text-xs text-muted-foreground">Unlocking filenames…</p>
                  {:else if vaultState?.status === "blind-error"}
                    <p class="text-xs text-muted-foreground">
                      Couldn't read saved filenames for this transfer. The files
                      themselves stay downloadable to anyone with the share link.
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

<Modal
  open={promptOpen}
  title="Unlock your vault"
  description="Enter your vault password to see filenames and rebuild share links for your saved transfers."
  onClose={closeUnlockPrompt}
>
  <form onsubmit={handleUnlock} class="space-y-4" novalidate>
    {#if unlockMode === "password"}
      <PasswordInput
        id="unlock-vault-password"
        label="Vault password"
        autocomplete="current-password"
        required
        bind:value={unlockPassword}
        disabled={isUnlocking}
      />
    {:else}
      <Textarea
        id="unlock-recovery-phrase"
        label="Recovery phrase"
        placeholder="word word word …"
        rows={3}
        bind:value={unlockPhrase}
        disabled={isUnlocking}
      />
      <p class="text-xs text-muted-foreground">
        12 words, separated by spaces. Case and extra spacing don't matter.
      </p>
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
      disabled={isUnlocking}
    >
      {unlockMode === "password"
        ? "Forgot your password? Use your recovery phrase instead."
        : "Have your password? Use it instead."}
    </button>

    {#snippet footerActions()}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={closeUnlockPrompt}
        disabled={isUnlocking}
      >
        Skip for now
      </Button>
      <Button type="submit" fullWidth={false} disabled={!canSubmitUnlock}>
        {#if isUnlocking}
          <Spinner aria-hidden="true" />
          Unlocking…
        {:else}
          Unlock
        {/if}
      </Button>
    {/snippet}

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
      {@render footerActions()}
    </div>
  </form>
</Modal>
