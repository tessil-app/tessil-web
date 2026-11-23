<script lang="ts">
  import TextLink from "$lib/components/TextLink.svelte";
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Notice from "$lib/components/Notice.svelte";
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
  import { base64UrlToBytes } from "$lib/crypto/base64url";
  import { decryptFilename, decryptString } from "$lib/crypto/decrypt";
  import { plaintextSize } from "$lib/crypto/streaming";
  import { isHandedCopy } from "$lib/portal/keys";
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
  import { appLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG } from "$lib/i18n/locale";
  import { chromeMessages } from "$lib/i18n/messages/chrome";
  import { transfersMessages } from "$lib/i18n/messages/transfers";

  const locale = $derived(appLocale());
  const t = $derived(transfersMessages[locale]);
  const c = $derived(chromeMessages[locale]);

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
        if (transfers.find((tr) => tr.id === id)?.wrappedKey) {
          vaultStates[id] = { status: "locked" };
        }
      }
      return;
    }
    for (const tr of transfers) {
      if (!tr.wrappedKey) continue;
      const st = vaultStates[tr.id];
      if (!st || st.status === "locked") {
        vaultStates[tr.id] = { status: "unlocking" };
        void unwrapRow(tr);
      }
    }
  });

  // Someone handed this account a portal it has not accepted yet.
  let pendingShare = $state<string | null>(null);
  onMount(() => {
    if (!auth.user) return;
    api
      .listPortals()
      .then((res) => {
        const row = res.portals.find(
          (p) => p.role === "member" && isHandedCopy(base64UrlToBytes(p.sealedKeys)),
        );
        pendingShare = row ? (row.owner?.email ?? t.someone) : null;
      })
      .catch(() => {});
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
        err instanceof Error ? err.message : t.errors.load;
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
        err instanceof Error ? err.message : t.errors.loadMore;
    } finally {
      isLoadingMore = false;
    }
  }

  async function seedVaultStates(rows: OwnedTransferSummary[]) {
    if (!auth.user) return;
    const unlockedNow = await isUnlocked(auth.user.id);
    for (const tr of rows) {
      if (!tr.wrappedKey) continue;
      if (vaultStates[tr.id]) continue;
      if (unlockedNow) {
        vaultStates[tr.id] = { status: "unlocking" };
        void unwrapRow(tr);
      } else {
        vaultStates[tr.id] = { status: "locked" };
      }
    }
  }

  async function unwrapRow(tr: OwnedTransferSummary) {
    if (!tr.wrappedKey || !auth.user) return;
    const raw = await unwrapTransferKey(auth.user.id, tr.wrappedKey);
    if (!raw) {
      vaultStates[tr.id] = { status: "blind-error" };
      return;
    }
    try {
      const transferKey = await importTransferKey(raw);
      const { files } = await api.getMyTransferFiles(tr.id);
      const names = await Promise.all(
        files.map((f) =>
          decryptFilename(f.encryptedName, f.encryptedNameIv, transferKey),
        ),
      );
      let title: string | null = null;
      if (tr.encryptedTitle && tr.encryptedTitleIv) {
        try {
          title = await decryptString(tr.encryptedTitle, tr.encryptedTitleIv, transferKey);
        } catch {
          // Title fails-soft so the row still renders.
          title = null;
        }
      }
      const sizes = files.map((f) => plaintextSize(f.size));
      vaultStates[tr.id] = { status: "unlocked", names, sizes, title };
    } catch {
      vaultStates[tr.id] = { status: "blind-error" };
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
      unlockError = err instanceof Error ? err.message : t.errors.unlock;
    } finally {
      isUnlocking = false;
    }
  }


  async function copyRowLink(tr: OwnedTransferSummary, e: Event) {
    e.stopPropagation();
    if (!tr.wrappedKey || !auth.user) return;
    if (copyingId === tr.id) return;
    copyingId = tr.id;
    try {
      const raw = await unwrapTransferKey(auth.user.id, tr.wrappedKey);
      if (!raw) {
        errorMessage = t.errors.rebuild;
        return;
      }
      const fragment = transferKeyToFragment(raw);
      const url = `${window.location.origin}/d/${tr.id}#${fragment}`;
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
      copiedId = tr.id;
      setTimeout(() => {
        if (copiedId === tr.id) copiedId = null;
      }, 2000);
    } catch {
      errorMessage = t.errors.copy;
    } finally {
      copyingId = null;
    }
  }

  function requestInlineDelete(tr: OwnedTransferSummary, e: Event) {
    e.stopPropagation();
    if (inlineDeletingId) return;
    confirmDeleteId = tr.id;
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
        err instanceof Error ? err.message : t.errors.delete;
      if (errorMessage === "Transfer not found.") {
        transfers = transfers.filter((row) => row.id !== id);
        confirmDeleteId = null;
      }
    } finally {
      inlineDeletingId = null;
    }
  }

  function rowDisplayName(tr: OwnedTransferSummary): string {
    const vs = vaultStates[tr.id];
    if (vs?.status === "unlocked") {
      if (vs.title && vs.title.length > 0) return vs.title;
      if (vs.names.length > 0) return summariseNames(vs.names);
    }
    return t.files(tr.fileCount);
  }

  function summariseNames(names: string[]): string {
    if (names.length === 0) return t.noFiles;
    if (names.length === 1) return names[0];
    return t.more(names[0], names.length - 1);
  }

  // Names of the access keys behind transfers a program sent.
  let keyNames = $state<Record<string, string>>({});
  let keyNamesAsked = false;
  $effect(() => {
    if (keyNamesAsked || !transfers.some((tr) => tr.deviceId)) return;
    keyNamesAsked = true;
    void api
      .listAccessKeys()
      .then((res) => (keyNames = Object.fromEntries(res.devices.map((d) => [d.id, d.name]))))
      .catch(() => {});
  });

  const lockedVaultedCount = $derived(
    transfers.filter((tr) => tr.wrappedKey && vaultStates[tr.id]?.status === "locked")
      .length,
  );

  function statusOf(tr: OwnedTransferSummary): {
    label: string;
    tone: "success" | "warning" | "muted";
  } {
    const expired = new Date(tr.expiresAt) < new Date();
    if (expired) return { label: t.status.expired, tone: "muted" };
    if (!tr.isCompleted) return { label: t.status.inProgress, tone: "warning" };
    return { label: t.status.active, tone: "success" };
  }

  const dateFmt = $derived(
    new Intl.DateTimeFormat(HTML_LANG[locale], { year: "numeric", month: "short", day: "numeric" }),
  );

  function shortDate(iso: string) {
    return dateFmt.format(new Date(iso));
  }

  function relativeExpiry(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return t.expired;
    const mins = Math.round(ms / 60000);
    if (mins < 60) return t.inMinutes(mins);
    const hours = Math.round(mins / 60);
    if (hours < 24) return t.inHours(hours);
    return t.inDays(Math.round(hours / 24));
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
    transfers = transfers.map((tr) =>
      tr.id === id
        ? { ...tr, encryptedTitle, encryptedTitleIv }
        : tr,
    );
    const vs = vaultStates[id];
    if (vs?.status === "unlocked") {
      vaultStates[id] = { ...vs, title: decryptedTitle };
    }
  }

  function handleDrawerDelete(id: string) {
    transfers = transfers.filter((tr) => tr.id !== id);
    delete vaultStates[id];
  }

  const openTransfer = $derived(
    openTransferId ? transfers.find((tr) => tr.id === openTransferId) ?? null : null,
  );
  const openVaultState = $derived(
    openTransferId ? vaultStates[openTransferId] : undefined,
  );
  const confirmDeleteTransfer = $derived(
    confirmDeleteId
      ? transfers.find((tr) => tr.id === confirmDeleteId) ?? null
      : null,
  );
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded}
    <div
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-16 text-info"
    >
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{t.loading}</p>
    </div>
  {:else if auth.user}
    <PageHeader
      title={t.title}
      tagline={t.tagline}
      align="left"
    >
      {#snippet actions()}
        <!-- The empty state has its own button; two would be one too many. -->
        {#if transfers.length > 0}
          <Button href="/dashboard/new" fullWidth={false} class="whitespace-nowrap">{t.newTransfer}</Button>
        {/if}
      {/snippet}
    </PageHeader>

    <UsageBanner {usage} />

    {#if pendingShare}
      <Notice class="mb-6">
        {t.sharedWithYou(pendingShare)}
        {#snippet action()}
          <Button variant="secondary" fullWidth={false} href="/dashboard/portals">{t.view}</Button>
        {/snippet}
      </Notice>
    {/if}

    <div class="space-y-6">
      <p class="text-sm text-muted-foreground">
        {t.intro}
      </p>

      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if auth.needsVaultSetup}
        <Notice>
          {t.noVault}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/setup/vault">{t.setUpVault}</Button>
          {/snippet}
        </Notice>
      {/if}

      {#if !vaultUnlocked && lockedVaultedCount > 0 && skipped}
        <Notice>
          {t.locked(lockedVaultedCount)}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} onclick={openUnlockPrompt}>
              {t.unlockVault}
            </Button>
          {/snippet}
        </Notice>
      {/if}

      {#if isLoading}
        <div
          role="status"
          aria-live="polite"
          class="flex flex-col items-center gap-4 py-12 text-info"
        >
          <Spinner class="size-8" aria-hidden="true" />
          <p class="text-muted-foreground">{t.loadingTransfers}</p>
        </div>
      {:else if transfers.length === 0}
        <EmptyState title={t.emptyTitle}>
          <p>{t.empty}</p>
          {#snippet actions()}
            <Button href="/dashboard/new" fullWidth={false}>{t.first}</Button>
          {/snippet}
        </EmptyState>
      {:else}
        <Table.Root
          cols="grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)]"
          actions="sm"
        >
          {#snippet header()}
            <div>{t.cols.name}</div>
            <div>{t.cols.size}</div>
            <div>{t.cols.created}</div>
            <div>{t.cols.expires}</div>
            <div>{t.cols.status}</div>
          {/snippet}

          {#each transfers as tr (tr.id)}
            {@const status = statusOf(tr)}
            {@const vs = vaultStates[tr.id]}
            {@const isVaulted = !!tr.wrappedKey}
            {@const canRowAction = isVaulted && vs?.status === "unlocked"}
            <Table.Row onclick={() => (openTransferId = tr.id)}>
              {#snippet cells()}
                <div class="min-w-0">
                  <div class="text-foreground font-medium truncate" title={rowDisplayName(tr)}>
                    {rowDisplayName(tr)}
                  </div>
                  <div class="text-xs text-muted-foreground truncate">
                    {t.files(tr.fileCount)}
                    {#if tr.hasPassword}
                      · {t.passwordProtected}
                    {/if}
                    {#if tr.deviceId}
                      · {t.sentBy(keyNames[tr.deviceId] ?? t.anAccessKey)}
                    {:else if !isVaulted}
                      · {t.nameNotKept}
                    {:else if vs?.status === "locked"}
                      · {t.vaultLocked}
                    {:else if vs?.status === "unlocking"}
                      · {t.decrypting}
                    {:else if vs?.status === "blind-error"}
                      · {t.couldntDecrypt}
                    {/if}
                  </div>
                </div>
                <div class="text-muted-foreground">{formatSize(tr.totalBytes)}</div>
                <div class="text-muted-foreground">{shortDate(tr.createdAt)}</div>
                <div class="text-muted-foreground">
                  {shortDate(tr.expiresAt)}
                  <span class="text-xs">({relativeExpiry(tr.expiresAt)})</span>
                </div>
                <div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              {/snippet}

              {#snippet stacked()}
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-foreground truncate">{rowDisplayName(tr)}</p>
                      <p class="text-xs text-muted-foreground">
                        {t.files(tr.fileCount)} · {formatSize(tr.totalBytes)}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {t.createdExpires(shortDate(tr.createdAt), relativeExpiry(tr.expiresAt))}
                  </p>
                  {#if vs?.status === "locked"}
                    <p class="text-xs text-muted-foreground">{t.lockedRow}</p>
                  {:else if vs?.status === "unlocking"}
                    <p class="text-xs text-muted-foreground">{t.decryptingRow}</p>
                  {:else if vs?.status === "blind-error"}
                    <p class="text-xs text-muted-foreground">{t.couldntDecryptRow}</p>
                  {/if}
                </div>
              {/snippet}

              {#snippet actions()}
                <IconButton
                  label={copiedId === tr.id ? t.linkCopied : t.copyLink}
                  onclick={(e) => copyRowLink(tr, e)}
                  disabled={!canRowAction || copyingId === tr.id}
                >
                  {#if copyingId === tr.id}
                    <Spinner class="size-4" aria-hidden="true" />
                  {:else if copiedId === tr.id}
                    <IconCheckRegular class="size-4 text-success-foreground" />
                  {:else}
                    <IconCopyRegular class="size-4" />
                  {/if}
                </IconButton>
                <IconButton
                  label={t.deleteTransfer}
                  tone="destructive"
                  onclick={(e) => requestInlineDelete(tr, e)}
                  disabled={inlineDeletingId === tr.id}
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
                {t.loading}
              {:else}
                {t.loadMore}
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
  title={c.unlockTitle}
  description={t.unlockBody}
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
        label={c.vaultPassword}
        autocomplete="current-password"
        required
        bind:value={unlockPassword}
        disabled={isUnlocking}
      />
    {:else}
      <Textarea
        id="unlock-recovery-phrase"
        label={c.recoveryPhrase}
        placeholder={t.phrasePlaceholder}
        rows={3}
        bind:value={unlockPhrase}
        disabled={isUnlocking}
      />
      <p class="text-xs text-muted-foreground">
        {t.phraseHint}
      </p>
    {/if}

    {#if unlockError}
      <Alert tone="destructive">{unlockError}</Alert>
    {/if}

    {#if hasVaultPassword}
    <TextLink
      onclick={() => {
        unlockMode = unlockMode === "password" ? "phrase" : "password";
        unlockError = null;
      }}
      class="text-xs text-muted-foreground"
      disabled={isUnlocking}
    >
      {unlockMode === "password" ? c.usePhrase : c.usePassword}
    </TextLink>
    {/if}

    {#snippet footerActions()}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={closeUnlockPrompt}
        disabled={isUnlocking}
      >
        {t.skip}
      </Button>
      <Button type="submit" fullWidth={false} disabled={!canSubmitUnlock}>
        {#if isUnlocking}
          <Spinner aria-hidden="true" />
          {c.unlocking}
        {:else}
          {c.unlock}
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
  title={t.deleteTitle}
  description={t.deleteBody}
  onClose={() => {
    if (!inlineDeletingId) confirmDeleteId = null;
  }}
>
  {#if confirmDeleteTransfer}
    <p class="text-sm text-muted-foreground">
      <span class="font-medium text-foreground">{rowDisplayName(confirmDeleteTransfer)}</span>
      · {t.files(confirmDeleteTransfer.fileCount)}
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
      {c.cancel}
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
        {t.deleting}
      {:else}
        {t.deleteTransfer}
      {/if}
    </Button>
  {/snippet}
</Modal>
