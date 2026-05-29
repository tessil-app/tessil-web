<script lang="ts">
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
  import TransferDetailDrawer, {
    type VaultRowState,
  } from "$lib/components/TransferDetailDrawer.svelte";
  import { api, type OwnedTransferSummary, type UsageResponse } from "$lib/api/client";
  import { decryptFilename, decryptString } from "$lib/crypto/decrypt";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import UsageBanner from "$lib/components/UsageBanner.svelte";
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

  let transfers = $state<OwnedTransferSummary[]>([]);
  let nextCursor = $state<string | null>(null);
  let isLoading = $state(false);
  let isLoadingMore = $state(false);
  let errorMessage = $state<string | null>(null);
  let inlineDeletingId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let copyingId = $state<string | null>(null);
  let copiedId = $state<string | null>(null);
  let vaultStates = $state<Record<string, VaultRowState>>({});

  let openTransferId = $state<string | null>(null);

  let vaultUnlocked = $state(false);
  let promptOpen = $state(false);
  let skipped = $state(false);
  let unlockMode = $state<"password" | "phrase">("password");
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let isUnlocking = $state(false);
  let unlockError = $state<string | null>(null);

  let hasAttemptedLoad = $state(false);

  let usage = $state<UsageResponse | null>(null);

  // Re-lock every cached row when K_vault expires or the user locks manually.
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
      api.getMyUsage().then(
        (u) => (usage = u),
        () => {},
      );
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

  // Prompt once on first load; "Skip" hands off to the banner for the rest of the visit.
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
      let title: string | null = null;
      if (t.encryptedTitle && t.encryptedTitleIv) {
        try {
          title = await decryptString(t.encryptedTitle, t.encryptedTitleIv, transferKey);
        } catch {
          // Title fails-soft so the row still renders.
          title = null;
        }
      }
      vaultStates[t.id] = { status: "unlocked", names, title };
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

  async function copyRowLink(t: OwnedTransferSummary, e: Event) {
    e.stopPropagation();
    if (!t.wrappedKey || !auth.user) return;
    if (copyingId === t.id) return;
    copyingId = t.id;
    try {
      const raw = await unwrapTransferKey(auth.user.id, t.wrappedKey);
      if (!raw) {
        errorMessage =
          "Couldn't rebuild the share link — unlock the vault and try again.";
        return;
      }
      const fragment = transferKeyToFragment(raw);
      const url = `${window.location.origin}/d/${t.id}#${fragment}`;
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
      copiedId = t.id;
      setTimeout(() => {
        if (copiedId === t.id) copiedId = null;
      }, 2000);
    } catch {
      errorMessage = "Couldn't copy the share link.";
    } finally {
      copyingId = null;
    }
  }

  function requestInlineDelete(t: OwnedTransferSummary, e: Event) {
    e.stopPropagation();
    if (inlineDeletingId) return;
    confirmDeleteId = t.id;
  }

  async function performInlineDelete() {
    if (!confirmDeleteId || inlineDeletingId) return;
    const id = confirmDeleteId;
    inlineDeletingId = id;
    try {
      await api.deleteMyTransfer(id);
      transfers = transfers.filter((row) => row.id !== id);
      delete vaultStates[id];
      if (openTransferId === id) openTransferId = null;
      confirmDeleteId = null;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't delete that transfer.";
      if (errorMessage === "Transfer not found.") {
        transfers = transfers.filter((row) => row.id !== id);
        confirmDeleteId = null;
      }
    } finally {
      inlineDeletingId = null;
    }
  }

  function rowDisplayName(t: OwnedTransferSummary): string {
    const vs = vaultStates[t.id];
    if (vs?.status === "unlocked") {
      if (vs.title && vs.title.length > 0) return vs.title;
      if (vs.names.length > 0) return summariseNames(vs.names);
    }
    return `${t.fileCount} ${t.fileCount === 1 ? "file" : "files"}`;
  }

  function summariseNames(names: string[]): string {
    if (names.length === 0) return "(no files)";
    if (names.length === 1) return names[0];
    return `${names[0]} + ${names.length - 1} more`;
  }

  const lockedVaultedCount = $derived(
    transfers.filter((t) => t.wrappedKey && vaultStates[t.id]?.status === "locked")
      .length,
  );

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
  });

  function shortDate(iso: string) {
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

  function handleTitleSaved(
    id: string,
    decryptedTitle: string | null,
    encryptedTitle: string | null,
    encryptedTitleIv: string | null,
  ) {
    transfers = transfers.map((t) =>
      t.id === id
        ? { ...t, encryptedTitle, encryptedTitleIv }
        : t,
    );
    const vs = vaultStates[id];
    if (vs?.status === "unlocked") {
      vaultStates[id] = { ...vs, title: decryptedTitle };
    }
  }

  function handleDrawerDelete(id: string) {
    transfers = transfers.filter((t) => t.id !== id);
    delete vaultStates[id];
  }

  const openTransfer = $derived(
    openTransferId ? transfers.find((t) => t.id === openTransferId) ?? null : null,
  );
  const openVaultState = $derived(
    openTransferId ? vaultStates[openTransferId] : undefined,
  );
  const confirmDeleteTransfer = $derived(
    confirmDeleteId
      ? transfers.find((t) => t.id === confirmDeleteId) ?? null
      : null,
  );
</script>

<svelte:head>
  <title>Dashboard — Tessil</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout width="5xl">
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
    <PageHeader
      title="Your transfers"
      tagline="Everything you've sent while signed in."
      align="left"
    />

    <UsageBanner {usage} />

    <div class="space-y-6">
      <p class="text-sm text-muted-foreground">
        Transfers you create while signed in appear here. File contents are
        end-to-end encrypted; only the original share link can decrypt them.
      </p>

      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if !vaultUnlocked && lockedVaultedCount > 0 && skipped}
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-card p-4"
        >
          <p class="text-sm text-muted-foreground">
            Vault is locked. {lockedVaultedCount}
            {lockedVaultedCount === 1 ? "transfer has" : "transfers have"} encrypted names waiting.
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
                Anything you upload while signed in appears here.
              </p>
              <div class="flex justify-center pt-2">
                <Button href="/" fullWidth={false}>Create your first transfer</Button>
              </div>
            </div>
          </Frame.Panel>
        </Frame.Root>
      {:else}
        <!-- Desktop table (sm+) -->
        <div class="hidden sm:block overflow-hidden rounded-lg bg-card">
          <div
            class="grid grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            <div>Name</div>
            <div>Size</div>
            <div>Created</div>
            <div>Expires</div>
            <div>Status</div>
          </div>
          <ul class="divide-y divide-border">
            {#each transfers as t (t.id)}
              {@const status = statusOf(t)}
              {@const vs = vaultStates[t.id]}
              {@const isVaulted = !!t.wrappedKey}
              {@const canRowAction = isVaulted && vs?.status === "unlocked"}
              <li class="relative group">
                <button
                  type="button"
                  onclick={() => (openTransferId = t.id)}
                  class="grid grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 items-center w-full px-4 py-3 text-left text-sm transition-colors duration-150 ease-out hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div class="min-w-0">
                    <div class="text-foreground font-medium truncate" title={rowDisplayName(t)}>
                      {rowDisplayName(t)}
                    </div>
                    <div class="text-xs text-muted-foreground truncate">
                      {t.fileCount} {t.fileCount === 1 ? "file" : "files"}
                      {#if t.hasPassword}
                        · password-protected
                      {/if}
                      {#if vs?.status === "locked"}
                        · vault locked
                      {:else if vs?.status === "unlocking"}
                        · decrypting…
                      {:else if vs?.status === "blind-error"}
                        · couldn't decrypt
                      {/if}
                    </div>
                  </div>
                  <div class="text-muted-foreground">{formatSize(t.totalBytes)}</div>
                  <div class="text-muted-foreground">{shortDate(t.createdAt)}</div>
                  <div class="text-muted-foreground">
                    {shortDate(t.expiresAt)}
                    <span class="text-xs">({relativeExpiry(t.expiresAt)})</span>
                  </div>
                  <div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </button>

                <!-- Sibling of the button so its clicks don't bubble through and open the drawer. -->
                <div
                  class="pointer-events-none absolute inset-y-0 right-3 hidden items-center gap-2 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:flex"
                >
                  <div class="pointer-events-auto flex items-center gap-2 bg-card rounded-md p-1 shadow-sm border border-border">
                    <button
                      type="button"
                      onclick={(e) => copyRowLink(t, e)}
                      disabled={!canRowAction || copyingId === t.id}
                      class="text-xs font-medium px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {#if copyingId === t.id}
                        Copying…
                      {:else if copiedId === t.id}
                        Copied!
                      {:else}
                        Copy link
                      {/if}
                    </button>
                    <button
                      type="button"
                      onclick={(e) => requestInlineDelete(t, e)}
                      disabled={inlineDeletingId === t.id}
                      class="text-xs font-medium px-2 py-1 rounded text-destructive-foreground hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {inlineDeletingId === t.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        </div>

        <!-- Mobile stack (<sm) — actions live in the drawer instead of an overlay. -->
        <ul class="space-y-3 sm:hidden">
          {#each transfers as t (t.id)}
            {@const status = statusOf(t)}
            {@const vs = vaultStates[t.id]}
            <li>
              <button
                type="button"
                onclick={() => (openTransferId = t.id)}
                class="block w-full text-left bg-card rounded-lg p-4 space-y-2 transition-colors duration-150 ease-out hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-foreground truncate">
                      {rowDisplayName(t)}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {t.fileCount} {t.fileCount === 1 ? "file" : "files"} · {formatSize(t.totalBytes)}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <p class="text-xs text-muted-foreground">
                  Created {shortDate(t.createdAt)} · Expires {relativeExpiry(t.expiresAt)}
                </p>
                {#if vs?.status === "locked"}
                  <p class="text-xs text-muted-foreground">Vault locked — unlock to see name.</p>
                {:else if vs?.status === "unlocking"}
                  <p class="text-xs text-muted-foreground">Decrypting…</p>
                {:else if vs?.status === "blind-error"}
                  <p class="text-xs text-muted-foreground">Couldn't decrypt metadata.</p>
                {/if}
              </button>
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

<TransferDetailDrawer
  open={openTransferId !== null}
  userId={auth.user?.id ?? null}
  transfer={openTransfer}
  vaultState={openVaultState}
  onClose={() => (openTransferId = null)}
  onDeleted={handleDrawerDelete}
  onTitleSaved={handleTitleSaved}
/>

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

<Modal
  open={confirmDeleteId !== null}
  title="Delete this transfer?"
  description="The encrypted files are removed and the share link stops working. This can't be undone."
  onClose={() => {
    if (!inlineDeletingId) confirmDeleteId = null;
  }}
>
  {#if confirmDeleteTransfer}
    <p class="text-sm text-muted-foreground">
      <span class="font-medium text-foreground">{rowDisplayName(confirmDeleteTransfer)}</span>
      · {confirmDeleteTransfer.fileCount}
      {confirmDeleteTransfer.fileCount === 1 ? "file" : "files"}
      · {formatSize(confirmDeleteTransfer.totalBytes)}
    </p>
  {/if}

  {#snippet footer()}
    <Button
      type="button"
      variant="ghost"
      fullWidth={false}
      onclick={() => (confirmDeleteId = null)}
      disabled={!!inlineDeletingId}
    >
      Cancel
    </Button>
    <Button
      type="button"
      variant="destructive"
      fullWidth={false}
      onclick={performInlineDelete}
      disabled={!!inlineDeletingId}
    >
      {#if inlineDeletingId}
        <Spinner aria-hidden="true" />
        Deleting…
      {:else}
        Delete transfer
      {/if}
    </Button>
  {/snippet}
</Modal>
