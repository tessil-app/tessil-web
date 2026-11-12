<script lang="ts">
  // Security sub-route: passkeys. A passkey signs you in, and can also be
  // set to unlock the vault. Removing one never loses data: the vault
  // password and recovery phrase still open it.

  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PasskeyRow from "$lib/components/PasskeyRow.svelte";
  import VaultProof from "$lib/components/VaultProof.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import IconPlusRegular from "phosphor-icons-svelte/IconPlusRegular.svelte";
  import { api, type PasskeySummary } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import {
    enrollPasskey,
    isPasskeySupported,
    PasskeyError,
  } from "$lib/auth/passkey";
  import {
    disablePasskeyUnlock,
    enablePasskeyUnlock,
    passkeysThatUnlock,
    type VaultAccess,
  } from "$lib/vault/client";
  import { vaultFailureMessage } from "$lib/vault/messages";
  import { onMount } from "svelte";

  let passkeySupported = $state(false);
  let passkeys = $state<PasskeySummary[] | null>(null);
  let passkeysError = $state<string | null>(null);
  let isAdding = $state(false);
  let newNickname = $state("");
  let isEnrolling = $state(false);
  let enrollError = $state<string | null>(null);
  let renamingId = $state<string | null>(null);
  let renameDraft = $state("");
  let isRenaming = $state(false);
  let renameError = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let deleteConfirmId = $state<string | null>(null);
  let deleteError = $state<string | null>(null);

  // Which passkeys can unlock the vault, and the dialog that enables one.
  let vaultIsSetup = $derived(auth.user !== null && !auth.needsVaultSetup);
  let unlocksVault = $state(new Set<string>());
  let vaultBusyId = $state<string | null>(null);
  let vaultError = $state<string | null>(null);
  let enableFor = $state<PasskeySummary | null>(null);
  let enableProof = $state<VaultAccess | null>(null);
  let isEnabling = $state(false);
  let enableError = $state<string | null>(null);

  async function loadVaultPasskeys() {
    try {
      unlocksVault = new Set((await passkeysThatUnlock(true)).map((w) => w.authenticatorId));
    } catch {
      unlocksVault = new Set();
    }
  }

  function askVaultUnlock(p: PasskeySummary) {
    enableFor = p;
    enableProof = null;
    enableError = null;
    vaultError = null;
  }

  async function submitEnable(e?: Event) {
    e?.preventDefault();
    if (!auth.user || !enableFor || isEnabling || !enableProof) return;
    isEnabling = true;
    enableError = null;
    try {
      const result = await enablePasskeyUnlock(auth.user.id, enableFor, enableProof);
      if (result.ok) {
        unlocksVault = new Set([...unlocksVault, enableFor.id]);
        enableFor = null;
        enableProof = null;
      } else {
        enableError = vaultFailureMessage(result.reason);
      }
    } catch (err) {
      enableError = err instanceof Error ? err.message : "Couldn't set this up.";
    } finally {
      isEnabling = false;
    }
  }

  async function stopVaultUnlock(p: PasskeySummary) {
    vaultBusyId = p.id;
    vaultError = null;
    try {
      await disablePasskeyUnlock(p.id);
      const next = new Set(unlocksVault);
      next.delete(p.id);
      unlocksVault = next;
    } catch (err) {
      vaultError = err instanceof Error ? err.message : "Couldn't change that.";
    } finally {
      vaultBusyId = null;
    }
  }

  onMount(() => {
    passkeySupported = isPasskeySupported();
    void loadPasskeys();
    void loadVaultPasskeys();
  });

  async function loadPasskeys() {
    passkeysError = null;
    try {
      const { authenticators } = await api.listPasskeys();
      passkeys = authenticators;
    } catch (err) {
      passkeysError =
        err instanceof Error ? err.message : "Couldn't load sign-in keys.";
      passkeys = [];
    }
  }

  function startAddPasskey() {
    isAdding = true;
    newNickname = "";
    enrollError = null;
  }

  function cancelAddPasskey() {
    if (isEnrolling) return;
    isAdding = false;
    newNickname = "";
    enrollError = null;
  }

  async function addPasskey() {
    if (isEnrolling) return;
    enrollError = null;
    isEnrolling = true;
    try {
      const nickname = newNickname.trim();
      await enrollPasskey(nickname.length > 0 ? nickname : null);
      isAdding = false;
      newNickname = "";
      await loadPasskeys();
    } catch (err) {
      if (err instanceof PasskeyError) {
        if (err.kind !== "cancelled") enrollError = err.message;
      } else {
        enrollError =
          err instanceof Error ? err.message : "Couldn't add a passkey.";
      }
    } finally {
      isEnrolling = false;
    }
  }

  function startRename(p: PasskeySummary) {
    renamingId = p.id;
    renameDraft = p.nickname ?? "";
    renameError = null;
    deleteConfirmId = null;
  }

  function cancelRename() {
    if (isRenaming) return;
    renamingId = null;
    renameDraft = "";
    renameError = null;
  }

  async function saveRename() {
    if (!renamingId || isRenaming) return;
    isRenaming = true;
    renameError = null;
    try {
      const trimmed = renameDraft.trim();
      await api.renamePasskey(renamingId, trimmed.length > 0 ? trimmed : null);
      renamingId = null;
      renameDraft = "";
      await loadPasskeys();
    } catch (err) {
      renameError =
        err instanceof Error ? err.message : "Couldn't rename the passkey.";
    } finally {
      isRenaming = false;
    }
  }

  function askDelete(p: PasskeySummary) {
    deleteConfirmId = p.id;
    deleteError = null;
    renamingId = null;
  }

  function cancelDelete() {
    if (deletingId) return;
    deleteConfirmId = null;
    deleteError = null;
  }

  async function confirmDelete(id: string) {
    if (deletingId) return;
    deletingId = id;
    deleteError = null;
    try {
      await api.deletePasskey(id);
      deleteConfirmId = null;
      await loadPasskeys();
    } catch (err) {
      deleteError =
        err instanceof Error ? err.message : "Couldn't remove the passkey.";
    } finally {
      deletingId = null;
    }
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function passkeyMeta(p: PasskeySummary): string {
    const where = p.deviceType === "multiDevice" ? "Synced" : "This device";
    const when = p.lastUsedAt
      ? `Last used ${dateFmt.format(new Date(p.lastUsedAt))}`
      : "Never used";
    return `${where} · ${when}`;
  }

  const showFraming = $derived(
    passkeySupported && !(passkeys !== null && passkeys.length === 0),
  );
  const showFooter = $derived(
    passkeySupported && passkeys !== null && (passkeys.length > 0 || isAdding),
  );
</script>

<Frame.Root>
  <Frame.Header>
    <Frame.Title class="text-base">Sign-in keys</Frame.Title>
    {#if showFraming}
      <Frame.Description class="mt-1 block">
        Sign-in keys are tied to this site - they can't be used to sign in
        anywhere else. Email sign-in stays available either way.
      </Frame.Description>
    {/if}
  </Frame.Header>

  <Frame.Panel>
    {#if !passkeySupported}
      <Alert tone="info" title="Your browser doesn't support passkeys">
        Sign-in keys need a recent browser with a platform authenticator
        (Touch ID, Face ID, Windows Hello) or a security key.
      </Alert>
    {:else if passkeys === null}
      <ul class="flex flex-col">
        {#each [0, 1, 2] as i (i)}
          <li class="py-3.5 first:pt-0 last:pb-0 {i > 0 ? 'border-t border-border' : ''}">
            <div class="flex items-center gap-3.5">
              <div class="size-8 shrink-0 rounded-md bg-muted animate-pulse" aria-hidden="true"></div>
              <div class="flex-1 min-w-0 space-y-1.5">
                <div class="h-3.5 w-1/3 rounded bg-muted animate-pulse"></div>
                <div class="h-3 w-1/2 rounded bg-muted animate-pulse"></div>
              </div>
              <div class="flex gap-1.5 shrink-0">
                <div class="h-7 w-17 rounded bg-muted animate-pulse"></div>
                <div class="h-7 w-17 rounded bg-muted animate-pulse"></div>
              </div>
            </div>
          </li>
        {/each}
      </ul>
      <span class="sr-only" role="status" aria-live="polite">Loading sign-in keys…</span>
    {:else if passkeys.length === 0}
      <div class="flex flex-col items-center gap-3 py-4 text-center">
        <p class="text-sm text-muted-foreground max-w-md text-pretty">
          Add a sign-in key to skip the email step next time. Sign-in keys are
          tied to this site - they can't be used to sign in anywhere else.
          Email sign-in stays available either way.
        </p>
        <div class="w-full max-w-64">
          <Button onclick={startAddPasskey}>
            <IconPlusRegular class="size-4" />
            Add a sign-in key
          </Button>
        </div>
        {#if passkeysError}
          <Alert tone="destructive" class="w-full text-left">{passkeysError}</Alert>
        {/if}
      </div>
    {:else}
      {#if passkeysError}
        <Alert tone="destructive" class="mb-4">{passkeysError}</Alert>
      {/if}
      {#if vaultError}
        <Alert tone="destructive" class="mb-4">{vaultError}</Alert>
      {/if}
      <ul class="flex flex-col divide-y divide-border">
        {#each passkeys as p (p.id)}
          {@const isCurrent = auth.user?.currentAuthenticatorId === p.id}
          {@const meta = passkeyMeta(p)}
          {@const isRenamingThis = renamingId === p.id}
          {@const isConfirmingThis = deleteConfirmId === p.id}
          {@const showVaultLine = vaultIsSetup && !isRenamingThis && !isConfirmingThis}
          {@const showBelow =
            (isRenamingThis && renameError !== null) || isConfirmingThis || showVaultLine}
          <PasskeyRow
            nickname={p.nickname}
            {meta}
            {isCurrent}
            showBody={isRenamingThis}
            {showBelow}
          >
            {#snippet body()}
              <div class="flex flex-col gap-1">
                <TextInput
                  id={`rename-${p.id}`}
                  bind:value={renameDraft}
                  maxlength={64}
                  disabled={isRenaming}
                  placeholder="e.g. MacBook Touch ID"
                  aria-label="Nickname"
                />
                <div class="text-xs text-muted-foreground">{meta}</div>
              </div>
            {/snippet}

            {#snippet actions()}
              {#if renamingId === p.id}
                <Button
                  variant="secondary"
                  fullWidth={false}
                  onclick={cancelRename}
                  disabled={isRenaming}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth={false}
                  onclick={saveRename}
                  disabled={isRenaming}
                >
                  {#if isRenaming}
                    <Spinner aria-hidden="true" />
                    Saving
                  {:else}
                    Save
                  {/if}
                </Button>
              {:else if deleteConfirmId !== p.id}
                <Button
                  variant="ghost"
                  fullWidth={false}
                  onclick={() => startRename(p)}
                  disabled={deletingId === p.id}
                >
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  onclick={() => askDelete(p)}
                  disabled={deletingId === p.id}
                >
                  Remove
                </Button>
              {/if}
            {/snippet}

            {#snippet below()}
              {#if showVaultLine}
                <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {unlocksVault.has(p.id)
                      ? "Unlocks your vault."
                      : "Can also unlock your vault, so you don't have to type its password."}
                  </span>
                  <button
                    type="button"
                    onclick={() => (unlocksVault.has(p.id) ? stopVaultUnlock(p) : askVaultUnlock(p))}
                    disabled={vaultBusyId === p.id}
                    class="underline underline-offset-2 hover:text-foreground hover:cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
                  >
                    {unlocksVault.has(p.id) ? "Stop" : "Set this up"}
                  </button>
                </p>
              {/if}

              {#if isRenamingThis && renameError}
                <Alert tone="destructive">{renameError}</Alert>
              {/if}

              {#if isConfirmingThis}
                {#if isCurrent}
                  <Alert tone="warning">
                    This is the sign-in key for your current session. You'll
                    stay signed in here, but you'll need to sign in by email
                    or another passkey next time.
                  </Alert>
                {/if}
                {#if deleteError}
                  <Alert tone="destructive">{deleteError}</Alert>
                {/if}
                <div class="flex flex-wrap items-center gap-2">
                  <p class="flex-1 basis-32 text-sm text-foreground">
                    Remove this sign-in key?
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    onclick={cancelDelete}
                    disabled={deletingId === p.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    fullWidth={false}
                    onclick={() => confirmDelete(p.id)}
                    disabled={deletingId === p.id}
                  >
                    {#if deletingId === p.id}
                      <Spinner aria-hidden="true" />
                      Removing
                    {:else}
                      Confirm remove
                    {/if}
                  </Button>
                </div>
              {/if}
            {/snippet}
          </PasskeyRow>
        {/each}
      </ul>
    {/if}
  </Frame.Panel>

  {#if showFooter}
    <Frame.Footer>
      {#if isAdding}
        <div class="rounded-md bg-muted p-3.5 flex flex-col gap-3">
          {#if enrollError}
            <Alert tone="destructive">{enrollError}</Alert>
          {/if}
          <div class="flex flex-wrap items-end gap-2">
            <div class="flex-1 basis-56 min-w-0">
              <TextInput
                id="new-passkey-nickname"
                label="Nickname (optional)"
                placeholder="e.g. MacBook Touch ID"
                bind:value={newNickname}
                maxlength={64}
                disabled={isEnrolling}
              />
            </div>
            <Button
              variant="secondary"
              fullWidth={false}
              onclick={cancelAddPasskey}
              disabled={isEnrolling}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth={false}
              onclick={addPasskey}
              disabled={isEnrolling}
            >
              {#if isEnrolling}
                <Spinner aria-hidden="true" />
                Waiting on your device
              {:else}
                Continue
              {/if}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            {#if isEnrolling}
              Confirm on your device to continue.
            {:else}
              Your browser will ask you to confirm with Touch ID, Face ID,
              Windows Hello, or a security key.
            {/if}
          </p>
        </div>
      {:else}
        <div>
          <Button variant="secondary" fullWidth={false} onclick={startAddPasskey}>
            <IconPlusRegular class="size-4" />
            Add a sign-in key
          </Button>
        </div>
      {/if}
    </Frame.Footer>
  {/if}
</Frame.Root>

<Modal
  open={enableFor !== null}
  title="Unlock your vault with this sign-in key"
  description="Confirm it's you once. After that, this sign-in key opens your vault with a touch or a glance. Every other way in keeps working."
  onClose={() => {
    if (!isEnabling) enableFor = null;
  }}
>
  <form id="enable-passkey-unlock" onsubmit={submitEnable} class="space-y-4" novalidate>
    {#if enableFor}
      <VaultProof bind:access={enableProof} idPrefix="enable-passkey" disabled={isEnabling} />
    {/if}
    {#if enableError}
      <Alert tone="destructive">{enableError}</Alert>
    {/if}
  </form>

  {#snippet footer()}
    <Button
      type="button"
      variant="ghost"
      fullWidth={false}
      onclick={() => (enableFor = null)}
      disabled={isEnabling}
    >
      Cancel
    </Button>
    <Button
      type="submit"
      form="enable-passkey-unlock"
      fullWidth={false}
      disabled={isEnabling || !enableProof}
    >
      {#if isEnabling}
        <Spinner aria-hidden="true" />
        Waiting on your device
      {:else}
        Continue
      {/if}
    </Button>
  {/snippet}
</Modal>
