<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import IconButton from "$lib/components/IconButton.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasskeyUnlockButton from "$lib/components/PasskeyUnlockButton.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import * as Table from "$lib/components/table";
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
    vaultHasPassword,
  } from "$lib/vault/client";
  import { vaultFailureMessage } from "$lib/vault/messages";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconCopyRegular from "phosphor-icons-svelte/IconCopyRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
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
  // A vault can exist without a password. Then the dialog offers the
  // passkey and the recovery phrase, and no password field.
  let hasVaultPassword = $state(true);
  $effect(() => {
    if (!promptOpen) return;
    vaultHasPassword()
      .then((has) => {
        hasVaultPassword = has;
        if (!has) unlockMode = "phrase";
      })
      .catch(() => {});
  });
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let isUnlocking = $state(false);
  let unlockError = $state<string | null>(null);

  let hasAttemptedLoad = $state(false);

  let usage = $state<UsageResponse | null>(null);

  // Single source of truth for row crypto state: re-lock on lock/expiry, and
  // re-decrypt on (re)unlock - including unlocks triggered from the nav menu,
  // not just the dashboard's own prompt.
  const unsubscribeVault = subscribeToVaultState(({ unlocked }) => {
    vaultUnlocked = unlocked;
    if (!unlocked) {
      for (const id of Object.keys(vaultStates)) {
        if (transfers.find((t) => t.id === id)?.wrappedKey) {
          vaultStates[id] = { status: "locked" };
        }
      }
      return;
    }
    for (const t of transfers) {
      if (!t.wrappedKey) continue;
      const st = vaultStates[t.id];
      if (!st || st.status === "locked") {
        vaultStates[t.id] = { status: "unlocking" };
        void unwrapRow(t);
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
        unlockError = vaultFailureMessage(result.reason);
        return;
      }
      // Rows decrypt via the vault-state subscription (single decrypt path).
      promptOpen = false;
      unlockPassword = "";
      unlockPhrase = "";
    } catch (err) {
      unlockError = err instanceof Error ? err.message : "Couldn't unlock.";
    } finally {
      isUnlocking = false;
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
          "Couldn't rebuild the share link - unlock the vault and try again.";
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

<Seo title="Dashboard - Tessil" robots="noindex" />

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

      {#if auth.needsVaultSetup}
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-card p-4"
        >
          <p class="text-sm text-muted-foreground">
            Without a vault, transfers are listed without their names and their links can't be
            shown again. A vault keeps both, encrypted so only you can read them.
          </p>
          <div class="sm:shrink-0">
            <Button variant="secondary" fullWidth={false} href="/setup/vault">Set up vault</Button>
          </div>
        </div>
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
        <Table.Root
          cols="grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)]"
          actions="sm"
        >
          {#snippet header()}
            <div>Name</div>
            <div>Size</div>
            <div>Created</div>
            <div>Expires</div>
            <div>Status</div>
          {/snippet}

          {#each transfers as t (t.id)}
            {@const status = statusOf(t)}
            {@const vs = vaultStates[t.id]}
            {@const isVaulted = !!t.wrappedKey}
            {@const canRowAction = isVaulted && vs?.status === "unlocked"}
            <Table.Row onclick={() => (openTransferId = t.id)}>
              {#snippet cells()}
                <div class="min-w-0">
                  <div class="text-foreground font-medium truncate" title={rowDisplayName(t)}>
                    {rowDisplayName(t)}
                  </div>
                  <div class="text-xs text-muted-foreground truncate">
                    {t.fileCount} {t.fileCount === 1 ? "file" : "files"}
                    {#if t.hasPassword}
                      · password-protected
                    {/if}
                    {#if !isVaulted}
                      · name not kept
                    {:else if vs?.status === "locked"}
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
              {/snippet}

              {#snippet stacked()}
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-foreground truncate">{rowDisplayName(t)}</p>
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
                    <p class="text-xs text-muted-foreground">Vault locked - unlock to see name.</p>
                  {:else if vs?.status === "unlocking"}
                    <p class="text-xs text-muted-foreground">Decrypting…</p>
                  {:else if vs?.status === "blind-error"}
                    <p class="text-xs text-muted-foreground">Couldn't decrypt metadata.</p>
                  {/if}
                </div>
              {/snippet}

              {#snippet actions()}
                <IconButton
                  label={copiedId === t.id ? "Link copied" : "Copy link"}
                  onclick={(e) => copyRowLink(t, e)}
                  disabled={!canRowAction || copyingId === t.id}
                >
                  {#if copyingId === t.id}
                    <Spinner class="size-4" aria-hidden="true" />
                  {:else if copiedId === t.id}
                    <IconCheckRegular class="size-4 text-success-foreground" />
                  {:else}
                    <IconCopyRegular class="size-4" />
                  {/if}
                </IconButton>
                <IconButton
                  label="Delete transfer"
                  tone="destructive"
                  onclick={(e) => requestInlineDelete(t, e)}
                  disabled={inlineDeletingId === t.id}
                >
                  <IconTrashRegular class="size-4" />
                </IconButton>
              {/snippet}
            </Table.Row>
          {/each}
        </Table.Root>

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
    <!-- Rows decrypt via the vault-state subscription, as with a password. -->
    <PasskeyUnlockButton
      active={promptOpen}
      disabled={isUnlocking}
      onUnlocked={() => {
        promptOpen = false;
        unlockPassword = "";
        unlockPhrase = "";
      }}
    />
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

    {#if hasVaultPassword}
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
    {/if}

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
