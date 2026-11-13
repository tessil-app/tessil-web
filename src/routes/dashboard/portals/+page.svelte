<script lang="ts">
  // Portals the signed-in user is a member of: create, copy the link,
  // switch off, delete. Titles and links are decrypted in the browser, so
  // they need an unlocked vault.

  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import * as Table from "$lib/components/table";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api, ApiError } from "$lib/api/client";
  import { DEFAULT_LOCALE, LOCALES, type Locale } from "$lib/i18n/locale";
  import { depositStrings } from "$lib/i18n/messages";
  import {
    PORTAL_TITLE_MAX,
    createMyPortal,
    loadMyPortals,
    type MyPortal,
  } from "$lib/portal/client";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import { isUnlocked, subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import IconDotsThreeRegular from "phosphor-icons-svelte/IconDotsThreeRegular.svelte";
  import { onDestroy } from "svelte";

  let portals = $state<MyPortal[]>([]);
  let maxPortals = $state(0);
  let isLoading = $state(true);
  let hasLoaded = $state(false);
  let errorMessage = $state<string | null>(null);
  let vaultUnlocked = $state(false);

  let createOpen = $state(false);
  let newTitle = $state("");
  // The language the owner's clients will read the page in.
  let newLang = $state<Locale>(DEFAULT_LOCALE);
  let isCreating = $state(false);
  let createError = $state<string | null>(null);

  let copiedId = $state<string | null>(null);
  let busyId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let isDeleting = $state(false);

  const ownedCount = $derived(portals.filter((p) => p.role === "owner").length);
  const canCreate = $derived(maxPortals > 0 && ownedCount < maxPortals);
  const trimmedTitle = $derived(newTitle.trim());
  const confirmDeletePortal = $derived(
    confirmDeleteId ? (portals.find((p) => p.id === confirmDeleteId) ?? null) : null,
  );

  let storage = $state<{ usedBytes: number; quotaBytes: number } | null>(null);

  async function load() {
    if (!auth.user) return;
    errorMessage = null;
    // Shown next to the list; the page works without it.
    void api
      .getMyUsage()
      .then((u) => (storage = u.storage ?? null))
      .catch(() => {});
    try {
      vaultUnlocked = await isUnlocked(auth.user.id);
      const res = await loadMyPortals(auth.user.id, window.location.origin);
      portals = res.portals;
      maxPortals = res.maxPortals;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't load your portals.";
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (!auth.loaded || !auth.user || hasLoaded) return;
    hasLoaded = true;
    void load();
  });

  // Titles and links appear as soon as the vault is unlocked, and are
  // dropped again when it locks.
  const unsubscribe = subscribeToVaultState(() => {
    if (hasLoaded) void load();
  });
  onDestroy(unsubscribe);

  function openCreate() {
    // Making a portal needs the vault: its keys are stored there.
    if (auth.needsVaultSetup) {
      goto("/setup/vault");
      return;
    }
    if (!vaultUnlocked) {
      unlockPrompt.request();
      return;
    }
    newTitle = "";
    const wanted = (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase().slice(0, 2));
    newLang = LOCALES.find((l) => wanted.includes(l)) ?? DEFAULT_LOCALE;
    createError = null;
    createOpen = true;
  }

  async function submitCreate(e?: Event) {
    e?.preventDefault();
    if (!auth.user || isCreating || trimmedTitle.length === 0) return;
    isCreating = true;
    createError = null;
    try {
      const result = await createMyPortal(auth.user.id, trimmedTitle, window.location.origin, newLang);
      if (!result.ok) {
        createError = "Your vault is locked. Unlock it and try again.";
        return;
      }
      portals = [result.portal, ...portals];
      createOpen = false;
    } catch (err) {
      if (err instanceof ApiError && err.code === "portal_limit_reached") {
        createError = err.message;
      } else if (err instanceof ApiError && err.code === "portals_require_paid_plan") {
        createError = "Portals are part of the paid plans.";
      } else if (err instanceof ApiError && err.code === "keypair_required") {
        createError = "Lock and unlock your vault once, then try again.";
      } else {
        createError = err instanceof Error ? err.message : "Couldn't create the portal.";
      }
    } finally {
      isCreating = false;
    }
  }

  async function copyLink(portal: MyPortal) {
    if (!portal.link) return;
    try {
      await navigator.clipboard.writeText(portal.link);
      copiedId = portal.id;
      setTimeout(() => {
        if (copiedId === portal.id) copiedId = null;
      }, 2000);
    } catch {
      errorMessage = "Couldn't copy. Select the link and copy it by hand.";
    }
  }

  async function toggleDisabled(portal: MyPortal) {
    if (busyId) return;
    busyId = portal.id;
    errorMessage = null;
    try {
      await api.updatePortal(portal.id, { isDisabled: !portal.isDisabled });
      portals = portals.map((p) =>
        p.id === portal.id ? { ...p, isDisabled: !portal.isDisabled } : p,
      );
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't update the portal.";
    } finally {
      busyId = null;
    }
  }

  async function confirmDelete() {
    if (!confirmDeleteId || isDeleting) return;
    isDeleting = true;
    errorMessage = null;
    try {
      await api.deletePortal(confirmDeleteId);
      portals = portals.filter((p) => p.id !== confirmDeleteId);
      confirmDeleteId = null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't delete the portal.";
      confirmDeleteId = null;
    } finally {
      isDeleting = false;
    }
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
</script>

<Seo title="Portals - Tessil" robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded || (auth.user && isLoading)}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if auth.user}
    <PageHeader
      title="Portals"
      tagline="A link where other people send you files. Only you can read them."
      align="left"
    >
      {#snippet actions()}
        <!-- The empty state has its own button; two would be one too many. -->
        {#if maxPortals > 0 && portals.length > 0}
          <Button
            fullWidth={false}
            class="whitespace-nowrap"
            onclick={openCreate}
            disabled={!canCreate}
          >
            New portal
          </Button>
        {/if}
      {/snippet}
    </PageHeader>

    <div class="space-y-6">
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if auth.needsVaultSetup && maxPortals > 0}
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-card p-4"
        >
          <p class="text-sm text-muted-foreground">
            Portals need a vault. It holds the keys that open what people send you, so only you
            can read it.
          </p>
          <div class="sm:shrink-0">
            <Button variant="secondary" fullWidth={false} href="/setup/vault">Set up vault</Button>
          </div>
        </div>
      {:else if !vaultUnlocked && maxPortals > 0}
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-card p-4"
        >
          <p class="text-sm text-muted-foreground">
            Your vault is locked. Portal names and links are encrypted, so unlock to see them
            or to create a portal.
          </p>
          <div class="sm:shrink-0">
            <Button variant="secondary" fullWidth={false} onclick={() => unlockPrompt.request()}>
              Unlock vault
            </Button>
          </div>
        </div>
      {/if}

      {#if maxPortals === 0 && portals.length === 0}
        <EmptyState title="Portals are part of the paid plans">
          <p>
            A portal is a link you hand out so clients or colleagues can send you files,
            encrypted in their browser so only you can open them.
          </p>
          {#snippet actions()}
            <Button href="/pricing" fullWidth={false}>See the plans</Button>
          {/snippet}
        </EmptyState>
      {:else if portals.length === 0}
        <EmptyState title="No portals yet">
          <p>
            Create one, share its link, and files people send through it appear here.
          </p>
          {#snippet actions()}
            <Button fullWidth={false} onclick={openCreate}>Create your first portal</Button>
          {/snippet}
        </EmptyState>
      {:else}
        {#snippet nameCell(portal: MyPortal)}
          <div class="min-w-0 flex-1">
            <div class="font-medium text-foreground truncate">
              {#if portal.state === "open"}
                {portal.title}
              {:else if portal.state === "locked"}
                Locked portal
              {:else}
                Unreadable portal
              {/if}
            </div>
            <div class="text-xs text-muted-foreground">
              {#if portal.state === "unreadable"}
                Its keys did not open with your vault. It can only be deleted.
              {:else}
                Created {dateFmt.format(new Date(portal.createdAt))}
                {#if portal.role === "member"}
                  · shared with you
                {/if}
              {/if}
            </div>
          </div>
        {/snippet}
        {#snippet statusBadge(portal: MyPortal)}
          <Badge tone={portal.isDisabled ? "muted" : "success"}>
            {portal.isDisabled ? "Switched off" : "Accepting files"}
          </Badge>
        {/snippet}

        <Table.Root cols="grid-cols-[minmax(0,1fr)_9rem]" actions="md">
          {#snippet header()}
            <div>Portal</div>
            <div>Status</div>
          {/snippet}

          {#each portals as portal (portal.id)}
            <Table.Row
              href={portal.state === "open" ? `/dashboard/portals/${portal.id}` : undefined}
              actionsOnPhone
            >
              {#snippet cells()}
                {@render nameCell(portal)}
                <div>{@render statusBadge(portal)}</div>
              {/snippet}
              {#snippet stacked()}
                <div class="flex items-center justify-between gap-3">
                  {@render nameCell(portal)}
                  {@render statusBadge(portal)}
                </div>
              {/snippet}
              {#snippet actions()}
                {#if portal.link}
                  <button
                    type="button"
                    onclick={() => copyLink(portal)}
                    aria-label="Copy link for {portal.title}"
                    class="hidden sm:inline-flex text-xs font-medium px-2 py-2 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:text-foreground hover:bg-background focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {copiedId === portal.id ? "Copied" : "Copy link"}
                  </button>
                {/if}
                {#if portal.link || portal.role === "owner"}
                  <DropdownMenu
                    label="More for {portal.title ?? 'this portal'}"
                    triggerClass="p-2 text-muted-foreground hover:text-foreground hover:bg-background"
                  >
                    {#snippet trigger()}
                      <IconDotsThreeRegular class="size-5" />
                    {/snippet}
                    {#snippet children(close)}
                      {#if portal.link}
                        <DropdownMenuItem
                          onSelect={() => {
                            close();
                            void copyLink(portal);
                          }}
                        >
                          Copy link
                        </DropdownMenuItem>
                      {/if}
                      {#if portal.role === "owner"}
                        <DropdownMenuItem
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            void toggleDisabled(portal);
                          }}
                        >
                          {portal.isDisabled ? "Switch on" : "Switch off"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            confirmDeleteId = portal.id;
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      {/if}
                    {/snippet}
                  </DropdownMenu>
                {/if}
              {/snippet}
            </Table.Row>
          {/each}
        </Table.Root>

        {#if maxPortals > 0}
          <p class="text-xs text-muted-foreground">
            {ownedCount} of {maxPortals} portals on your plan.
            {#if storage}
              {formatSize(storage.usedBytes)} of {formatSize(storage.quotaBytes)} storage used.
              <a
                href="/dashboard/settings/usage"
                class="underline underline-offset-2 hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
              >
                Details
              </a>
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</PageLayout>

<Modal
  open={createOpen}
  title="New portal"
  description="People who open the link see this name, so they know who they're sending to."
  onClose={() => (createOpen = false)}
>
  <form onsubmit={submitCreate} class="space-y-4" novalidate>
    <TextInput
      id="portal-title"
      label="Name"
      placeholder="For example: Documents for Jansen Administratie"
      maxlength={PORTAL_TITLE_MAX}
      required
      bind:value={newTitle}
      disabled={isCreating}
    />
    <p class="text-xs text-muted-foreground">
      The name is encrypted. We can't read it, and neither can anyone without the link.
    </p>

    <fieldset class="space-y-2" disabled={isCreating}>
      <legend class="text-sm font-medium text-foreground">Language of the page they see</legend>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        {#each LOCALES as option (option)}
          <label class="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="radio"
              name="portal-language"
              value={option}
              bind:group={newLang}
              class="size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            {depositStrings[option].languageName}
          </label>
        {/each}
      </div>
      <p class="text-xs text-muted-foreground">Visitors can still switch on the page itself.</p>
    </fieldset>
    {#if createError}
      <Alert tone="destructive">{createError}</Alert>
    {/if}
  </form>

  {#snippet footer()}
    <Button
      type="button"
      variant="ghost"
      fullWidth={false}
      onclick={() => (createOpen = false)}
      disabled={isCreating}
    >
      Cancel
    </Button>
    <Button
      type="button"
      fullWidth={false}
      onclick={() => submitCreate()}
      disabled={isCreating || trimmedTitle.length === 0}
    >
      {#if isCreating}
        <Spinner aria-hidden="true" />
        Creating…
      {:else}
        Create portal
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={confirmDeletePortal !== null}
  title="Delete this portal?"
  description="The link stops working and every file sent through it is deleted. This can't be undone."
  onClose={() => (confirmDeleteId = null)}
>
  {#snippet footer()}
    <Button
      type="button"
      variant="ghost"
      fullWidth={false}
      onclick={() => (confirmDeleteId = null)}
      disabled={isDeleting}
    >
      Keep it
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmDelete} disabled={isDeleting}>
      {#if isDeleting}
        <Spinner aria-hidden="true" />
        Deleting…
      {:else}
        Delete portal
      {/if}
    </Button>
  {/snippet}
</Modal>
