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
  import { appLocale } from "$lib/i18n/app.svelte";
  import { hrefFor } from "$lib/i18n/paths";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  const locale = $derived(appLocale());
  const t = $derived(portalsAppMessages[locale].list);

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
      portals = res.portals.filter((p) => p.kind === "portal");
      maxPortals = res.maxPortals;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.load;
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
      errorMessage = t.errors.copy;
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
      errorMessage = err instanceof Error ? err.message : t.errors.update;
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
            ? t.errors.locked
            : t.errors.notSealed;
        return;
      }
      acceptId = null;
      await load();
    } catch (err) {
      acceptError = err instanceof Error ? err.message : t.errors.accept;
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
      errorMessage = err instanceof Error ? err.message : t.errors.leave;
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
      errorMessage = err instanceof Error ? err.message : t.errors.delete;
      confirmDeleteId = null;
    } finally {
      isDeleting = false;
    }
  }

  const dateFmt = $derived(
    new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : undefined, { year: "numeric", month: "short", day: "numeric" }),
  );
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded || (auth.user && isLoading)}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
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
        {#if maxPortals > 0 && portals.length > 0}
          <Button
            fullWidth={false}
            class="whitespace-nowrap"
            href="/dashboard/portals/new"
          >
            {t.newPortal}
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
          {t.needsVault}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/setup/vault">{t.setUpVault}</Button>
          {/snippet}
        </Notice>
      {:else if !vaultUnlocked && maxPortals > 0}
        <Notice>
          {t.vaultLocked}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} onclick={() => unlockPrompt.request()}>
              {t.unlockVault}
            </Button>
          {/snippet}
        </Notice>
      {/if}

      {#if maxPortals === 0 && portals.length === 0}
        <EmptyState title={t.paidTitle}>
          <p>{t.paidBody}</p>
          {#snippet actions()}
            <Button href={hrefFor("/pricing", locale)} fullWidth={false}>{t.seePlans}</Button>
          {/snippet}
        </EmptyState>
      {:else if portals.length === 0}
        <EmptyState title={t.emptyTitle}>
          <p>{t.emptyBody}</p>
          {#snippet actions()}
            <Button fullWidth={false} href="/dashboard/portals/new">{t.createFirst}</Button>
          {/snippet}
        </EmptyState>
      {:else}
        {#snippet nameCell(portal: MyPortal)}
          <div class="min-w-0 flex-1">
            <div class="font-medium text-foreground truncate">
              {#if portal.state === "open"}
                {portal.title}
              {:else if portal.state === "invited"}
                {t.from(portal.sharedBy?.email ?? t.someone)}
              {:else if portal.state === "locked"}
                {t.locked}
              {:else}
                {t.unreadable}
              {/if}
            </div>
            <div class="text-xs text-muted-foreground">
              {#if portal.state === "unreadable"}
                {t.unreadableNote(portal.role === "owner")}
              {:else if portal.state === "invited"}
                {t.invitedNote}
              {:else}
                {t.created(dateFmt.format(new Date(portal.createdAt)))}
                {#if portal.role === "member"}
                  · {t.sharedBy(portal.sharedBy?.email ?? t.someoneElse)}
                {/if}
                <span class="sm:hidden">
                  · {t.deliveries(portal.deliveries)}{portal.unseen > 0
                    ? `, ${t.newCount(portal.unseen)}`
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
              ? t.waiting
              : portal.isDisabled
                ? t.off
                : closed
                  ? t.closed
                  : t.accepting}
          </Badge>
        {/snippet}

        <Table.Root
          cols="grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_9rem]"
          actions="md"
        >
          {#snippet header()}
            <div>{t.colPortal}</div>
            <div>{t.colDeliveries}</div>
            <div>{t.colLast}</div>
            <div>{t.colStored}</div>
            <div>{t.colStatus}</div>
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
                    <Badge tone="info">{t.newCount(portal.unseen)}</Badge>
                  {/if}
                </div>
                <div class="text-muted-foreground">
                  {portal.lastDeliveryAt ? dateFmt.format(new Date(portal.lastDeliveryAt)) : t.noneYet}
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
                    {t.accept}
                  </Button>
                {/if}
                {#if portal.link}
                  <button
                    type="button"
                    onclick={() => copyLink(portal)}
                    aria-label={t.copyLinkFor(portal.title ?? "")}
                    class="hidden sm:inline-flex text-xs font-medium px-2 py-2 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:text-foreground hover:bg-background focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {copiedId === portal.id ? t.copied : t.copyLink}
                  </button>
                {/if}
                {#if portal.link || portal.role === "owner" || portal.role === "member"}
                  <DropdownMenu
                    label={t.moreFor(portal.title)}
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
                          {t.copyLink}
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
                          {portal.state === "invited" ? t.decline : t.leave}
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
                            {t.settings}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              close();
                              void goto(`/dashboard/portals/new?from=${portal.id}`);
                            }}
                          >
                            {t.duplicate}
                          </DropdownMenuItem>
                        {/if}
                        <DropdownMenuItem
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            void toggleDisabled(portal);
                          }}
                        >
                          {portal.isDisabled ? t.switchOn : t.switchOff}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            confirmDeleteId = portal.id;
                          }}
                        >
                          {t.delete}
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
            {t.onPlan(ownedCount, maxPortals)}
            {#if storage}
              {t.storage(formatSize(storage.usedBytes), formatSize(storage.quotaBytes))}
              <TextLink
                href="/dashboard/settings/usage"
              >
                {t.details}
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
  title={t.deleteTitle}
  description={t.deleteBody}
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
      {t.keep}
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmDelete} disabled={isDeleting}>
      {#if isDeleting}
        <Spinner aria-hidden="true" />
        {t.deleting}
      {:else}
        {t.deletePortal}
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={acceptPortal !== null}
  title={t.acceptTitle}
  description={t.acceptBody(acceptPortal?.sharedBy?.email ?? null)}
  onClose={() => (acceptId = null)}
>
  <div class="space-y-3">
    <DetailList>
      <DetailItem label={t.theirKey}>
        <span class="font-mono text-xs">{acceptPortal?.sharedBy?.fingerprint ?? t.unknown}</span>
      </DetailItem>
      <DetailItem label={t.yourKey}>
        <span class="font-mono text-xs">{ownFingerprint ?? t.unknown}</span>
      </DetailItem>
    </DetailList>
    <p class="text-xs text-muted-foreground">
      {t.compare}
    </p>
    {#if acceptError}
      <Alert tone="destructive">{acceptError}</Alert>
    {/if}
  </div>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (acceptId = null)} disabled={isAccepting}>
      {t.notNow}
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmAccept} disabled={isAccepting}>
      {#if isAccepting}
        <Spinner aria-hidden="true" />
        {t.accepting2}
      {:else}
        {t.accept}
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={leavePortal !== null}
  title={leavePortal?.state === "invited" ? t.declineTitle : t.leaveTitle}
  description={t.leaveBody}
  onClose={() => (leaveId = null)}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (leaveId = null)} disabled={isLeaving}>
      {t.cancel}
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmLeave} disabled={isLeaving}>
      {isLeaving ? t.leaving : leavePortal?.state === "invited" ? t.decline : t.leave}
    </Button>
  {/snippet}
</Modal>
