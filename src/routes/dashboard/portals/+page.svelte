<script lang="ts">
  // Portals the signed-in user is a member of: create, copy the link,
  // switch off, delete. Titles and links are decrypted in the browser, so
  // they need an unlocked vault.

  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api, ApiError } from "$lib/api/client";
  import {
    PORTAL_TITLE_MAX,
    createMyPortal,
    loadMyPortals,
    type MyPortal,
  } from "$lib/portal/client";
  import { auth } from "$lib/stores/auth.svelte";
  import { isUnlocked, subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy } from "svelte";

  let portals = $state<MyPortal[]>([]);
  let maxPortals = $state(0);
  let isLoading = $state(true);
  let hasLoaded = $state(false);
  let errorMessage = $state<string | null>(null);
  let vaultUnlocked = $state(false);

  let createOpen = $state(false);
  let newTitle = $state("");
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

  async function load() {
    if (!auth.user) return;
    errorMessage = null;
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
    if (!vaultUnlocked) {
      unlockPrompt.request();
      return;
    }
    newTitle = "";
    createError = null;
    createOpen = true;
  }

  async function submitCreate(e?: Event) {
    e?.preventDefault();
    if (!auth.user || isCreating || trimmedTitle.length === 0) return;
    isCreating = true;
    createError = null;
    try {
      const result = await createMyPortal(auth.user.id, trimmedTitle, window.location.origin);
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

      {#if !vaultUnlocked && maxPortals > 0}
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
        <Frame.Root>
          <Frame.Panel>
            <div class="text-center space-y-3">
              <h2 class="text-lg font-medium text-foreground">Portals are part of the paid plans</h2>
              <p class="text-sm text-muted-foreground">
                A portal is a link you hand out so clients or colleagues can send you files,
                encrypted in their browser so only you can open them.
              </p>
              <div class="flex justify-center pt-2">
                <Button href="/pricing" fullWidth={false}>See the plans</Button>
              </div>
            </div>
          </Frame.Panel>
        </Frame.Root>
      {:else if portals.length === 0}
        <Frame.Root>
          <Frame.Panel>
            <div class="text-center space-y-3">
              <h2 class="text-lg font-medium text-foreground">No portals yet</h2>
              <p class="text-sm text-muted-foreground">
                Create one, share its link, and files people send through it appear here.
              </p>
              <div class="flex justify-center pt-2">
                <Button fullWidth={false} onclick={openCreate}>Create your first portal</Button>
              </div>
            </div>
          </Frame.Panel>
        </Frame.Root>
      {:else}
        <ul class="space-y-3">
          {#each portals as portal (portal.id)}
            <li class="rounded-lg border border-border bg-card p-4 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="text-base font-medium text-foreground truncate">
                    {#if portal.state === "open"}
                      {portal.title}
                    {:else if portal.state === "locked"}
                      Locked portal
                    {:else}
                      Unreadable portal
                    {/if}
                  </h2>
                  <p class="text-xs text-muted-foreground">
                    Created {dateFmt.format(new Date(portal.createdAt))}
                    {#if portal.role === "member"}
                      · shared with you
                    {/if}
                  </p>
                </div>
                <Badge tone={portal.isDisabled ? "muted" : "success"}>
                  {portal.isDisabled ? "Switched off" : "Accepting files"}
                </Badge>
              </div>

              {#if portal.state === "unreadable"}
                <p class="text-sm text-muted-foreground">
                  This portal's keys did not open with your vault, so its name and link can't be
                  shown. Deleting it is the only thing that can be done with it.
                </p>
              {/if}

              {#if portal.link}
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readonly
                    value={portal.link}
                    aria-label="Link for {portal.title}"
                    onfocus={(e) => e.currentTarget.select()}
                    class="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <div class="sm:shrink-0">
                    <Button variant="secondary" fullWidth={false} onclick={() => copyLink(portal)}>
                      {copiedId === portal.id ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                </div>
              {/if}

              {#if portal.role === "owner"}
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    fullWidth={false}
                    onclick={() => toggleDisabled(portal)}
                    disabled={busyId === portal.id}
                  >
                    {portal.isDisabled ? "Switch on" : "Switch off"}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth={false}
                    onclick={() => (confirmDeleteId = portal.id)}
                    disabled={busyId === portal.id}
                  >
                    Delete
                  </Button>
                </div>
              {/if}
            </li>
          {/each}
        </ul>

        {#if maxPortals > 0}
          <p class="text-xs text-muted-foreground">
            {ownedCount} of {maxPortals} portals on your plan.
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
