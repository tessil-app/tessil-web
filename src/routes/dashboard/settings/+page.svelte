<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DefinitionRow from "$lib/components/DefinitionRow.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import * as Frame from "$lib/components/frame";
  import IdentityStrip from "$lib/components/IdentityStrip.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasskeyRow from "$lib/components/PasskeyRow.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import IconArrowLeftRegular from "phosphor-icons-svelte/IconArrowLeftRegular.svelte";
  import IconPlusRegular from "phosphor-icons-svelte/IconPlusRegular.svelte";
  import { api, type PasskeySummary } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import {
    enrollPasskey,
    isPasskeySupported,
    PasskeyError,
  } from "$lib/auth/passkey";
  import { onMount } from "svelte";

  let confirming = $state(false);
  let confirmEmail = $state("");
  let isDeleting = $state(false);
  let errorMessage = $state<string | null>(null);

  let isExporting = $state(false);
  let exportError = $state<string | null>(null);

  // Passkeys (audit doc 27 §13).
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
  // Phase F (D-117): show "N transfers will lose filename visibility"
  // when the user opens the Remove confirmation. Fetched on demand —
  // null while loading; -1 if the count lookup failed (treated as "we
  // couldn't check, proceed at your own risk").
  let deleteImpactCount = $state<number | null>(null);
  let deleteImpactError = $state(false);

  onMount(() => {
    if (auth.loaded && !auth.isAuthenticated) {
      goto("/login", { replaceState: true });
      return;
    }
    passkeySupported = isPasskeySupported();
    void loadPasskeys();
  });

  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
    }
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
    deleteImpactCount = null;
    deleteImpactError = false;
    renamingId = null;
    void loadDeleteImpact(p.id);
  }

  async function loadDeleteImpact(id: string) {
    try {
      const { count } = await api.getPasskeyWrappedTransferCount(id);
      // Stale-response guard: user may have flipped to a different
      // passkey's confirm by the time this resolves.
      if (deleteConfirmId === id) deleteImpactCount = count;
    } catch {
      if (deleteConfirmId === id) deleteImpactError = true;
    }
  }

  function cancelDelete() {
    if (deletingId) return;
    deleteConfirmId = null;
    deleteError = null;
    deleteImpactCount = null;
    deleteImpactError = false;
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

  function startConfirm() {
    confirming = true;
    confirmEmail = "";
    errorMessage = null;
  }

  function cancelConfirm() {
    confirming = false;
    confirmEmail = "";
    errorMessage = null;
  }

  async function exportAccount() {
    if (isExporting) return;
    isExporting = true;
    exportError = null;
    try {
      const { blob, filename } = await api.exportMyAccount();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      exportError = err instanceof Error ? err.message : "Couldn't export your data.";
    } finally {
      isExporting = false;
    }
  }

  async function deleteAccount() {
    if (isDeleting) return;
    isDeleting = true;
    errorMessage = null;
    try {
      await api.deleteMyAccount(confirmEmail);
      auth.user = null;
      await goto("/?deleted=1", { replaceState: true });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't delete your account.";
    } finally {
      isDeleting = false;
    }
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const memberSinceFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  });

  function passkeyMeta(p: PasskeySummary): string {
    const where = p.deviceType === "multiDevice" ? "Synced" : "This device";
    const when = p.lastUsedAt
      ? `Last used ${dateFmt.format(new Date(p.lastUsedAt))}`
      : "Never used";
    return `${where} · ${when}`;
  }

  // Show the persistent framing copy on every state where it adds context —
  // not on Empty (the empty body says the same thing) and not on Unsupported
  // (the Info Alert says the same thing).
  const showFraming = $derived(
    passkeySupported && !(passkeys !== null && passkeys.length === 0)
  );
  const showFooter = $derived(
    passkeySupported && passkeys !== null && passkeys.length > 0
  );
</script>

<svelte:head>
  <title>Settings — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout width="2xl">
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
    <PageHeader title="Settings" align="left">
      {#snippet actions()}
        <a
          href="/dashboard"
          class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        >
          <IconArrowLeftRegular class="size-3.5" />
          Back to dashboard
        </a>
      {/snippet}
    </PageHeader>

    <IdentityStrip>
      <DefinitionRow label="Email" value={auth.user.email} />
      <DefinitionRow
        label="Plan"
        value={auth.user.tier.charAt(0).toUpperCase() + auth.user.tier.slice(1)}
      />
      <DefinitionRow
        label="Member since"
        value={memberSinceFmt.format(new Date(auth.user.createdAt))}
      />
    </IdentityStrip>

    <Frame.Root>
      <Frame.Header>
        <Frame.Title class="text-base">Sign-in keys</Frame.Title>
        {#if showFraming}
          <Frame.Description class="mt-1 block">
            Sign-in keys are tied to this site — they can't be used to sign in
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
              Add a sign-in key to skip the email step next time. Sign-in keys
              are tied to this site — they can't be used to sign in anywhere
              else. Email sign-in stays available either way.
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
          <ul class="flex flex-col divide-y divide-border">
            {#each passkeys as p (p.id)}
              {@const isCurrent = auth.user?.currentAuthenticatorId === p.id}
              {@const meta = passkeyMeta(p)}
              {@const isRenamingThis = renamingId === p.id}
              {@const isConfirmingThis = deleteConfirmId === p.id}
              {@const showBelow =
                (isRenamingThis && renameError !== null) || isConfirmingThis}
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
                  {#if isRenamingThis && renameError}
                    <Alert tone="destructive">{renameError}</Alert>
                  {/if}

                  {#if isConfirmingThis}
                    {#if isCurrent}
                      <Alert tone="warning">
                        This is the sign-in key for your current session.
                        You'll stay signed in here, but you'll need to sign in
                        by email or another passkey next time.
                      </Alert>
                    {/if}
                    {#if deleteImpactCount !== null && deleteImpactCount > 0}
                      <Alert tone="warning">
                        {deleteImpactCount}
                        {deleteImpactCount === 1 ? "transfer" : "transfers"} will lose filename visibility after this. The files themselves stay downloadable to anyone with the share link.
                      </Alert>
                    {:else if deleteImpactError}
                      <Alert tone="warning">
                        Couldn't check whether transfers are saved under this
                        key. Removing it may make some filenames unreadable on
                        your dashboard.
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
            <div class="rounded-[calc(var(--radius-2xl)-1px)] bg-muted p-3.5 flex flex-col gap-3">
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

    <DividerRow
      title="Your data"
      body="Export everything we have on you as JSON, including your transfers and recent sign-in activity. File contents are never included — they were never readable to us."
    >
      {#snippet actions()}
        <Button
          variant="secondary"
          fullWidth={false}
          onclick={exportAccount}
          disabled={isExporting}
        >
          {#if isExporting}
            <Spinner aria-hidden="true" />
            Preparing export
          {:else}
            Export
          {/if}
        </Button>
      {/snippet}

      {#snippet expanded()}
        {#if exportError}
          <Alert tone="destructive">
            {exportError}
            {#snippet action()}
              <Button variant="secondary" fullWidth={false} onclick={exportAccount}>
                Retry
              </Button>
            {/snippet}
          </Alert>
        {/if}
      {/snippet}
    </DividerRow>

    <DividerRow
      title="Danger zone"
      body="Permanently delete your account and all transfers. This can't be undone."
    >
      {#snippet actions()}
        {#if !confirming}
          <Button variant="ghost" fullWidth={false} onclick={startConfirm}>
            Delete account
          </Button>
        {/if}
      {/snippet}

      {#snippet expanded()}
        {#if confirming && auth.user}
          <div class="flex flex-wrap items-end gap-2">
            <div class="flex-1 basis-64 min-w-0">
              <TextInput
                id="confirm-email"
                type="email"
                label={`Type ${auth.user.email} to confirm`}
                bind:value={confirmEmail}
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                error={errorMessage ?? undefined}
                disabled={isDeleting}
              />
            </div>
            <Button
              variant="secondary"
              fullWidth={false}
              onclick={cancelConfirm}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              fullWidth={false}
              onclick={deleteAccount}
              disabled={isDeleting || confirmEmail.trim() !== auth.user.email}
            >
              {#if isDeleting}
                <Spinner aria-hidden="true" />
                Deleting
              {:else}
                Permanently delete
              {/if}
            </Button>
          </div>
        {/if}
      {/snippet}
    </DividerRow>
  {/if}
</PageLayout>
