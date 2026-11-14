<script lang="ts">
  // Portals the signed-in user is a member of: copy the link,
  // switch off, delete. Titles and links are decrypted in the browser, so
  // they need an unlocked vault.

  import TextLink from "$lib/components/TextLink.svelte";
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Notice from "$lib/components/Notice.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import * as Table from "$lib/components/table";
  import { api } from "$lib/api/client";
  import { loadMyPortals, type MyPortal } from "$lib/portal/client";
  import { hasClosed } from "$lib/portal/keys";
  import { acceptShare, myFingerprint } from "$lib/portal/sharing";
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

  let copiedId = $state<string | null>(null);
  let busyId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let isDeleting = $state(false);

  const ownedCount = $derived(portals.filter((p) => p.role === "owner").length);
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

  // ─── portals shared with this account ─────────────────────────────────────
  let acceptId = $state<string | null>(null);
  let isAccepting = $state(false);
  let acceptError = $state<string | null>(null);
  let ownFingerprint = $state<string | null>(null);
  let leaveId = $state<string | null>(null);
  let isLeaving = $state(false);

  const acceptPortal = $derived(acceptId ? (portals.find((p) => p.id === acceptId) ?? null) : null);
  const leavePortal = $derived(leaveId ? (portals.find((p) => p.id === leaveId) ?? null) : null);

  async function openAccept(portal: MyPortal) {
    // Accepting stores the keys in the vault.
    if (auth.needsVaultSetup) {
      goto("/setup/vault");
      return;
    }
    if (!vaultUnlocked) {
      unlockPrompt.request();
      return;
    }
    acceptError = null;
    ownFingerprint = await myFingerprint();
    acceptId = portal.id;
  }

  async function confirmAccept() {
    if (!auth.user || !acceptId || isAccepting) return;
    isAccepting = true;
    acceptError = null;
    try {
      const result = await acceptShare(auth.user.id, acceptId);
      if (!result.ok) {
        acceptError =
          result.reason === "locked"
            ? "Your vault is locked. Unlock it and try again."
            : "These keys were not sealed by the person who shared the portal, so they were refused. Ask them to remove you and invite you again.";
        return;
      }
      acceptId = null;
      await load();
    } catch (err) {
      acceptError = err instanceof Error ? err.message : "Couldn't accept. Try again.";
    } finally {
      isAccepting = false;
    }
  }

  async function confirmLeave() {
    if (!auth.user || !leaveId || isLeaving) return;
    isLeaving = true;
    errorMessage = null;
    try {
      await api.removePortalMember(leaveId, auth.user.id);
      portals = portals.filter((p) => p.id !== leaveId);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't leave the portal.";
    } finally {
      leaveId = null;
      isLeaving = false;
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
            href="/dashboard/portals/new"
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
        <Notice>
          Portals need a vault. It holds the keys that open what people send you, so only you
          can read it.
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/setup/vault">Set up vault</Button>
          {/snippet}
        </Notice>
      {:else if !vaultUnlocked && maxPortals > 0}
        <Notice>
          Your vault is locked. Portal names and links are encrypted, so unlock to see them
          or to create a portal.
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} onclick={() => unlockPrompt.request()}>
              Unlock vault
            </Button>
          {/snippet}
        </Notice>
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
            <Button fullWidth={false} href="/dashboard/portals/new">Create your first portal</Button>
          {/snippet}
        </EmptyState>
      {:else}
        {#snippet nameCell(portal: MyPortal)}
          <div class="min-w-0 flex-1">
            <div class="font-medium text-foreground truncate">
              {#if portal.state === "open"}
                {portal.title}
              {:else if portal.state === "invited"}
                Portal from {portal.sharedBy?.email ?? "someone"}
              {:else if portal.state === "locked"}
                Locked portal
              {:else}
                Unreadable portal
              {/if}
            </div>
            <div class="text-xs text-muted-foreground">
              {#if portal.state === "unreadable"}
                Its keys did not open with your vault. It can only be {portal.role === "owner"
                  ? "deleted"
                  : "left"}.
              {:else if portal.state === "invited"}
                Shared with you. Accept to open it.
              {:else}
                Created {dateFmt.format(new Date(portal.createdAt))}
                {#if portal.role === "member"}
                  · shared by {portal.sharedBy?.email ?? "someone else"}
                {/if}
                <span class="sm:hidden">
                  · {portal.deliveries}
                  {portal.deliveries === 1 ? "delivery" : "deliveries"}{portal.unseen > 0
                    ? `, ${portal.unseen} new`
                    : ""}
                </span>
              {/if}
            </div>
          </div>
        {/snippet}
        {#snippet statusBadge(portal: MyPortal)}
          {@const closed = hasClosed(portal.closesAt)}
          <Badge
            tone={portal.state === "invited" ? "info" : portal.isDisabled || closed ? "muted" : "success"}
          >
            {portal.state === "invited"
              ? "Waiting for you"
              : portal.isDisabled
                ? "Switched off"
                : closed
                  ? "Closed"
                  : "Accepting files"}
          </Badge>
        {/snippet}

        <Table.Root
          cols="grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_9rem]"
          actions="md"
        >
          {#snippet header()}
            <div>Portal</div>
            <div>Deliveries</div>
            <div>Last delivery</div>
            <div>Stored</div>
            <div>Status</div>
          {/snippet}

          {#each portals as portal (portal.id)}
            <Table.Row
              href={portal.state === "open" ? `/dashboard/portals/${portal.id}` : undefined}
              actionsOnPhone
            >
              {#snippet cells()}
                {@render nameCell(portal)}
                <div class="flex items-center gap-2 text-muted-foreground">
                  {portal.deliveries}
                  {#if portal.unseen > 0}
                    <Badge tone="info">{portal.unseen} new</Badge>
                  {/if}
                </div>
                <div class="text-muted-foreground">
                  {portal.lastDeliveryAt ? dateFmt.format(new Date(portal.lastDeliveryAt)) : "None yet"}
                </div>
                <div class="text-muted-foreground">
                  {portal.storedBytes > 0 ? formatSize(portal.storedBytes) : "0"}
                </div>
                <div>{@render statusBadge(portal)}</div>
              {/snippet}
              {#snippet stacked()}
                <div class="flex items-center justify-between gap-3">
                  {@render nameCell(portal)}
                  {@render statusBadge(portal)}
                </div>
              {/snippet}
              {#snippet actions()}
                {#if portal.state === "invited"}
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    class="py-2 px-3 text-sm"
                    onclick={() => openAccept(portal)}
                  >
                    Accept
                  </Button>
                {/if}
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
                {#if portal.link || portal.role === "owner" || portal.role === "member"}
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
                      {#if portal.role === "member"}
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            leaveId = portal.id;
                          }}
                        >
                          {portal.state === "invited" ? "Decline" : "Leave"}
                        </DropdownMenuItem>
                      {/if}
                      {#if portal.role === "owner"}
                        {#if portal.state === "open"}
                          <DropdownMenuItem
                            onSelect={() => {
                              close();
                              void goto(`/dashboard/portals/${portal.id}/settings`);
                            }}
                          >
                            Settings
                          </DropdownMenuItem>
                        {/if}
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
              <TextLink
                href="/dashboard/settings/usage"
              >
                Details
              </TextLink>
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</PageLayout>

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

<Modal
  open={acceptPortal !== null}
  title="Accept this portal?"
  description="{acceptPortal?.sharedBy?.email ?? 'Someone'} shared a portal with you. You will be able to see, download and delete the files people send to it."
  onClose={() => (acceptId = null)}
>
  <div class="space-y-3">
    <DetailList>
      <DetailItem label="Their key">
        <span class="font-mono text-xs">{acceptPortal?.sharedBy?.fingerprint ?? "unknown"}</span>
      </DetailItem>
      <DetailItem label="Your key">
        <span class="font-mono text-xs">{ownFingerprint ?? "unknown"}</span>
      </DetailItem>
    </DetailList>
    <p class="text-xs text-muted-foreground">
      To be certain nobody sits in between, compare these two codes with them by phone or in
      person. They see the same two on their side. If you skip this, you trust our server for
      this one step.
    </p>
    {#if acceptError}
      <Alert tone="destructive">{acceptError}</Alert>
    {/if}
  </div>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (acceptId = null)} disabled={isAccepting}>
      Not now
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmAccept} disabled={isAccepting}>
      {#if isAccepting}
        <Spinner aria-hidden="true" />
        Accepting…
      {:else}
        Accept
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={leavePortal !== null}
  title={leavePortal?.state === "invited" ? "Decline this portal?" : "Leave this portal?"}
  description="You will no longer see it or the files sent to it. Its owner can invite you again."
  onClose={() => (leaveId = null)}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (leaveId = null)} disabled={isLeaving}>
      Cancel
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmLeave} disabled={isLeaving}>
      {isLeaving ? "Leaving…" : leavePortal?.state === "invited" ? "Decline" : "Leave"}
    </Button>
  {/snippet}
</Modal>
