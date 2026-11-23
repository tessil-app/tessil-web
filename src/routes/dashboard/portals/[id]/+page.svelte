<script lang="ts">
  // What was sent through one portal. Deposits are decrypted here with the
  // portal's private key from the member's vault.

  import TextLink from "$lib/components/TextLink.svelte";
  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DepositDrawer from "$lib/components/DepositDrawer.svelte";
  import FilterChips from "$lib/components/FilterChips.svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import SearchField from "$lib/components/SearchField.svelte";
  import * as Table from "$lib/components/table";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import Notice from "$lib/components/Notice.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PortalReturnsDrawer from "$lib/components/PortalReturnsDrawer.svelte";
  import PortalSharingDrawer from "$lib/components/PortalSharingDrawer.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api } from "$lib/api/client";
  import { saveDecryptedFile, StreamInterruptedError } from "$lib/download/saveFile";
  import BackLink from "$lib/components/BackLink.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import {
    coverageOf,
    loadDeposits,
    openMemberPortal,
    type OpenedDeposit,
    type OpenedMemberPortal,
  } from "$lib/portal/deposits";
  import { hasClosed } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { buildReceiptText } from "$lib/portal/receipt";
  import { saveTextFile } from "$lib/download/saveTextFile";
  import { loadSharing, type PortalSharing } from "$lib/portal/sharing";
  import { formatSize } from "$lib/utils";
  import { subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
  import { onDestroy } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  const locale = $derived(appLocale());
  const t = $derived(portalsAppMessages[locale].detail);

  type Phase = "loading" | "locked" | "missing" | "unreadable" | "ready";
  type FileStatus = "idle" | "downloading" | "complete" | "error";

  const portalId = $derived($page.params.id ?? "");

  let phase = $state<Phase>("loading");
  let portal = $state<OpenedMemberPortal | null>(null);
  let deposits = $state<OpenedDeposit[]>([]);
  let unreadable = $state(0);
  let nextCursor = $state<string | null>(null);
  let isLoadingMore = $state(false);
  let errorMessage = $state<string | null>(null);
  let hasLoaded = $state(false);

  let fileStates = $state<Record<string, { status: FileStatus; percent: number; error?: string }>>({});
  let confirmDeleteId = $state<string | null>(null);
  let isDeleting = $state(false);
  let copied = $state(false);

  // ─── finding a delivery ───────────────────────────────────────────────────
  type Filter = "all" | "new" | "incomplete" | "soon";
  const SOON_DAYS = 7;

  let query = $state("");
  let filter = $state<Filter>("all");
  let openDepositId = $state<string | null>(null);
  // When this account last looked, as it was before this visit. Kept for
  // the whole visit so the markers do not vanish under the reader.
  let seenBefore = $state<string | null>(null);
  let selected = $state<Set<string>>(new Set());

  function daysUntil(iso: string): number {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  }

  const checklist = $derived(portal?.checklist ?? []);
  const rows = $derived(
    deposits.map((deposit) => {
      const coverage = coverageOf(checklist, deposit.files);
      return {
        deposit,
        coverage,
        complete: coverage.missing.length === 0,
        soon: daysUntil(deposit.expiresAt) <= SOON_DAYS,
        isNew: seenBefore !== null && deposit.createdAt > seenBefore,
        haystack: [deposit.answer?.value ?? "", deposit.note ?? "", deposit.reference, ...deposit.files.map((f) => f.name)]
          .join("\n")
          .toLowerCase(),
      };
    }),
  );
  const counts = $derived({
    all: rows.length,
    new: rows.filter((r) => r.isNew).length,
    incomplete: rows.filter((r) => !r.complete).length,
    soon: rows.filter((r) => r.soon).length,
  });
  const filters = $derived<{ id: Filter; label: string }[]>([
    { id: "all", label: t.filters.all },
    ...(rows.some((r) => r.isNew) ? [{ id: "new" as const, label: t.filters.new }] : []),
    ...(checklist.length > 0 ? [{ id: "incomplete" as const, label: t.filters.incomplete }] : []),
    { id: "soon", label: t.filters.soon },
  ]);
  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" ||
          (filter === "new" ? r.isNew : filter === "incomplete" ? !r.complete : r.soon)) &&
        (needle === "" || r.haystack.includes(needle)),
    );
  });
  const openDeposit = $derived(deposits.find((d) => d.id === openDepositId) ?? null);

  function allSaved(deposit: OpenedDeposit): boolean {
    return deposit.files.every((f) => fileStates[f.id]?.status === "complete");
  }

  const selectedVisible = $derived(visible.filter((r) => selected.has(r.deposit.id)));
  const allVisibleSelected = $derived(
    visible.length > 0 && selectedVisible.length === visible.length,
  );

  function toggleSelected(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function toggleAllVisible() {
    selected = allVisibleSelected ? new Set() : new Set(visible.map((r) => r.deposit.id));
  }

  let downloadingSelected = $state(false);

  // One delivery after another, like "Download all" on each of them.
  async function downloadSelected() {
    if (downloadingSelected || downloadingAll) return;
    downloadingSelected = true;
    try {
      for (const row of selectedVisible) {
        await downloadAll(row.deposit);
        if (row.deposit.files.some((f) => fileStates[f.id]?.status === "error")) break;
      }
    } finally {
      downloadingSelected = false;
    }
  }

  // ─── sharing with one other account ───────────────────────────────────────
  let sharing = $state<PortalSharing | null>(null);
  let sharingOpen = $state(false);
  let returnsOpen = $state(false);

  const readyInvite = $derived(sharing?.invites.find((i) => i.ready) ?? null);
  const sharingLabel = $derived(
    sharing?.guests.length ? t.sharedWithOne : sharing?.invites.length ? t.sharingInvited : t.sharing,
  );

  async function reloadSharing() {
    if (portal?.role !== "owner") return;
    try {
      sharing = await loadSharing(portal.id);
    } catch {
      // The drawer shows its own loading state; the page works without it.
      sharing = null;
    }
  }

  async function load() {
    if (!auth.user) return;
    errorMessage = null;
    try {
      const opened = await openMemberPortal(auth.user.id, portalId, window.location.origin);
      if (!opened.ok) {
        portal = null;
        phase =
          opened.reason === "locked" ? "locked" : opened.reason === "not_found" ? "missing" : "unreadable";
        return;
      }
      portal = opened.portal;
      void reloadSharing();
      const first = await loadDeposits(opened.portal);
      if (seenBefore === null) {
        seenBefore = first.lastSeenAt;
        // They are on screen now; the next visit starts clean.
        void api.markPortalSeen(opened.portal.id).catch(() => {});
      }
      deposits = first.deposits;
      unreadable = first.unreadable;
      nextCursor = first.nextCursor;
      phase = "ready";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.load;
      phase = portal ? "ready" : "missing";
    }
  }

  $effect(() => {
    if (!auth.loaded || !auth.user || hasLoaded) return;
    hasLoaded = true;
    void load();
  });

  const unsubscribe = subscribeToVaultState(() => {
    if (hasLoaded) void load();
  });
  onDestroy(unsubscribe);

  async function loadMore() {
    if (!portal || !nextCursor || isLoadingMore) return;
    isLoadingMore = true;
    try {
      const more = await loadDeposits(portal, nextCursor);
      deposits = [...deposits, ...more.deposits];
      unreadable += more.unreadable;
      nextCursor = more.nextCursor;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.more;
    } finally {
      isLoadingMore = false;
    }
  }

  async function download(deposit: OpenedDeposit, fileId: string) {
    if (!portal) return;
    const file = deposit.files.find((f) => f.id === fileId);
    if (!file || fileStates[fileId]?.status === "downloading") return;
    fileStates[fileId] = { status: "downloading", percent: 0 };
    try {
      const { downloadUrl } = await api.getDepositFileUrl(portal.id, fileId);
      await saveDecryptedFile({
        downloadUrl,
        key: deposit.key,
        fileIv: file.fileIv,
        size: file.size,
        name: file.name,
        mimeType: file.mimeType,
        onProgress: (percent) => {
          fileStates[fileId] = { status: "downloading", percent };
        },
      });
      fileStates[fileId] = { status: "complete", percent: 100 };
    } catch (err) {
      fileStates[fileId] = {
        status: "error",
        percent: 0,
        error:
          err instanceof StreamInterruptedError
            ? t.errors.interrupted
            : t.errors.download,
      };
    }
  }

  // One file after another: browsers allow a page to save several files
  // once the first has been allowed, and each still streams to disk.
  let downloadingAll = $state<string | null>(null);

  async function downloadAll(deposit: OpenedDeposit) {
    if (downloadingAll) return;
    downloadingAll = deposit.id;
    try {
      for (const file of deposit.files) {
        if (fileStates[file.id]?.status === "complete") continue;
        await download(deposit, file.id);
        if (fileStates[file.id]?.status === "error") {
          // The reason is shown on the file itself.
          openDepositId = deposit.id;
          break;
        }
      }
    } finally {
      downloadingAll = null;
    }
  }

  function saveRecord(deposit: OpenedDeposit) {
    if (!portal) return;
    saveTextFile(
      `tessil-${deposit.reference}.txt`,
      buildReceiptText({
        kind: "received",
        locale,
        portalTitle: portal.title,
        reference: deposit.reference,
        at: new Date(deposit.createdAt),
        note: deposit.note,
        answer: deposit.answer,
        files: deposit.files.map((f) => ({ name: f.name, size: formatSize(f.plainSize) })),
        deletedOn: new Date(deposit.expiresAt),
      }),
    );
  }

  async function confirmDelete() {
    if (!portal || !confirmDeleteId || isDeleting) return;
    isDeleting = true;
    try {
      await api.deleteDeposit(portal.id, confirmDeleteId);
      deposits = deposits.filter((d) => d.id !== confirmDeleteId);
      if (selected.has(confirmDeleteId)) toggleSelected(confirmDeleteId);
      if (openDepositId === confirmDeleteId) openDepositId = null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.delete;
    } finally {
      confirmDeleteId = null;
      isDeleting = false;
    }
  }

  async function copyLink() {
    if (!portal) return;
    try {
      await navigator.clipboard.writeText(portal.link);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      errorMessage = t.errors.copy;
    }
  }

  // Tailwind needs both column sets spelled out in full.
  const cols = $derived(
    checklist.length > 0
      ? "grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]"
      : "grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]",
  );

  const checkbox =
    "size-4 rounded border-input bg-card accent-primary cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  const shortFmt = $derived(
    new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  function daysLeft(iso: string): string {
    const days = daysUntil(iso);
    if (days <= 0) return t.today;
    return t.inDays(days);
  }
</script>

<Seo title={t.seoTitle(portal?.title ?? null)} robots="noindex" />

<PageLayout width="5xl">
  {#if phase !== "ready"}
    <BackLink href="/dashboard/portals" label={t.allPortals} />
  {/if}

  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{t.loading}</p>
    </div>
  {:else if phase === "locked"}
    <EmptyState title={auth.needsVaultSetup ? t.needsVault : t.vaultLocked} level={1}>
      <p>{t.lockedBody}</p>
      {#snippet actions()}
        {#if auth.needsVaultSetup}
          <Button fullWidth={false} href="/setup/vault">{t.setUpVault}</Button>
        {:else}
          <Button fullWidth={false} onclick={() => unlockPrompt.request()}>{t.unlockVault}</Button>
        {/if}
      {/snippet}
    </EmptyState>
  {:else if phase === "missing" || phase === "unreadable"}
    <EmptyState title={phase === "missing" ? t.notFound : t.cantOpen} level={1}>
      <p>
        {phase === "missing"
          ? t.notFoundBody
          : t.cantOpenBody}
      </p>
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}
    </EmptyState>
  {:else if portal}
    <PageHeader
      title={portal.title}
      tagline={portal.role === "member"
        ? t.taglineMember
        : t.taglineOwner}
      back={{ href: "/dashboard/portals", label: t.allPortals }}
      align="left"
    >
      {#snippet badge()}
        <Badge tone={portal?.isDisabled || hasClosed(portal?.closesAt) ? "muted" : "success"}>
          {portal?.isDisabled
            ? t.off
            : hasClosed(portal?.closesAt)
              ? t.closed
              : t.accepting}
        </Badge>
      {/snippet}
      {#snippet actions()}
        {#if portal?.role === "owner"}
          <Button
            variant="secondary"
            fullWidth={false}
            class="whitespace-nowrap"
            href="/dashboard/portals/{portal.id}/settings"
          >
            {t.settings}
          </Button>
          {#if portal.twoWay}
            <Button
              variant="secondary"
              fullWidth={false}
              class="whitespace-nowrap"
              onclick={() => (returnsOpen = true)}
            >
              {t.sendFiles(portal.returns.length)}
            </Button>
          {/if}
          <Button
            variant="secondary"
            fullWidth={false}
            class="whitespace-nowrap"
            onclick={() => (sharingOpen = true)}
          >
            {sharingLabel}
          </Button>
        {/if}
        <Button fullWidth={false} class="whitespace-nowrap" onclick={copyLink}>
          {copied ? t.copied : t.copyLink}
        </Button>
      {/snippet}
    </PageHeader>

    <div class="space-y-4">
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if readyInvite}
        <Notice>
          {t.readyInvite(readyInvite.email)}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} onclick={() => (sharingOpen = true)}>
              {t.giveAccess}
            </Button>
          {/snippet}
        </Notice>
      {/if}

      {#if unreadable > 0}
        <Alert tone="warning">
          {t.unreadable(unreadable)}
        </Alert>
      {/if}

      {#if deposits.length === 0}
        <EmptyState title={t.emptyTitle}>
          <p>{t.emptyBody}</p>
        </EmptyState>
      {:else}
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchField
            bind:value={query}
            label={t.search}
            placeholder={t.searchPlaceholder}
            class="sm:w-80"
          />
          <FilterChips
            label={t.show}
            options={filters.map((f) => ({ value: f.id, label: f.label, count: counts[f.id] }))}
            value={filter}
            onChange={(v) => (filter = v)}
          />
          {#if selectedVisible.length > 0}
            <div class="hidden sm:flex items-center gap-2 sm:ml-auto">
              <Button
                variant="secondary"
                fullWidth={false}
                class="py-2 px-3 text-sm whitespace-nowrap"
                onclick={downloadSelected}
                disabled={downloadingSelected || downloadingAll !== null}
              >
                {downloadingSelected ? t.downloading : t.downloadSelected(selectedVisible.length)}
              </Button>
              <TextLink class="text-sm text-muted-foreground" onclick={() => (selected = new Set())}>
                {t.clear}
              </TextLink>
            </div>
          {/if}
        </div>

        {#if visible.length === 0}
          <div class="rounded-lg bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {t.noMatch}
          </div>
        {:else}
          <!-- What the sender filled in leads when the portal has an extra field; the reference otherwise. -->
          {#snippet who(deposit: OpenedDeposit, isNew: boolean)}
            <div
              class="flex min-w-0 items-center gap-2 font-medium text-foreground {deposit.answer
                ? ''
                : 'font-mono'}"
            >
              <span class="truncate">{deposit.answer?.value ?? deposit.reference}</span>
              {#if isNew}
                <Badge tone="info" class="font-sans">{t.newBadge}</Badge>
              {/if}
            </div>
          {/snippet}
          {#snippet about(deposit: OpenedDeposit)}
            {#if deposit.answer || deposit.note}
              <div class="truncate text-xs text-muted-foreground" title={deposit.note ?? undefined}>
                {#if deposit.answer}<span class="font-mono">{deposit.reference}</span>{/if}
                {#if deposit.answer && deposit.note}<span aria-hidden="true"> · </span>{/if}
                {deposit.note ?? ""}
              </div>
            {/if}
          {/snippet}

          <Table.Root {cols} actions="sm" selectable>
            {#snippet headerLeading()}
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onchange={toggleAllVisible}
                aria-label={t.selectAll}
                class={checkbox}
              />
            {/snippet}
            {#snippet header()}
              <div>{t.colDelivery}</div>
              <div>{t.colReceived}</div>
              <div>{t.colFiles}</div>
              {#if checklist.length > 0}
                <div>{t.colAskedFor}</div>
              {/if}
              <div>{t.colDeleted}</div>
            {/snippet}

            {#each visible as row (row.deposit.id)}
              {@const deposit = row.deposit}
              <Table.Row onclick={() => (openDepositId = deposit.id)}>
                {#snippet leading()}
                  <input
                    type="checkbox"
                    checked={selected.has(deposit.id)}
                    onchange={() => toggleSelected(deposit.id)}
                    aria-label={t.select(deposit.reference)}
                    class={checkbox}
                  />
                {/snippet}
                {#snippet cells()}
                  <div class="min-w-0">
                    {@render who(deposit, row.isNew)}
                    {@render about(deposit)}
                  </div>
                  <div class="text-muted-foreground">
                    {shortFmt.format(new Date(deposit.createdAt))}
                  </div>
                  <div class="text-muted-foreground">
                    {deposit.files.length} · {formatSize(deposit.totalBytes)}
                  </div>
                  {#if checklist.length > 0}
                    <div>
                      <Badge tone={row.complete ? "success" : "warning"}>
                        {row.complete
                          ? t.complete
                          : t.of(row.coverage.provided.length, checklist.length)}
                      </Badge>
                    </div>
                  {/if}
                  <div class={row.soon ? "text-destructive-foreground" : "text-muted-foreground"}>
                    {daysLeft(deposit.expiresAt)}
                  </div>
                {/snippet}

                {#snippet stacked()}
                  <div class="space-y-2">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        {@render who(deposit, row.isNew)}
                        {@render about(deposit)}
                      </div>
                      {#if checklist.length > 0}
                        <Badge tone={row.complete ? "success" : "warning"}>
                          {row.complete
                            ? t.complete
                            : t.of(row.coverage.provided.length, checklist.length)}
                        </Badge>
                      {/if}
                    </div>
                    <p class="text-xs text-muted-foreground">
                      {shortFmt.format(new Date(deposit.createdAt))} ·
                      {t.files(deposit.files.length)} · {formatSize(deposit.totalBytes)}
                      ·
                      <span class={row.soon ? "text-destructive-foreground" : ""}>
                        {t.deletedWhen(daysLeft(deposit.expiresAt))}
                      </span>
                    </p>
                  </div>
                {/snippet}

                {#snippet actions()}
                  <IconButton
                    label={t.downloadAllOf(deposit.reference)}
                    onclick={() => downloadAll(deposit)}
                    disabled={downloadingAll !== null}
                  >
                    {#if downloadingAll === deposit.id}
                      <Spinner class="size-4" aria-hidden="true" />
                    {:else if allSaved(deposit)}
                      <IconCheckRegular class="size-4 text-success-foreground" />
                    {:else}
                      <IconDownloadRegular class="size-4" />
                    {/if}
                  </IconButton>
                  <IconButton
                    label={t.deleteRef(deposit.reference)}
                    tone="destructive"
                    onclick={() => (confirmDeleteId = deposit.id)}
                  >
                    <IconTrashRegular class="size-4" />
                  </IconButton>
                {/snippet}
              </Table.Row>
            {/each}
          </Table.Root>
        {/if}

        <p class="text-xs text-muted-foreground" role="status">
          {t.showing(visible.length, deposits.length, nextCursor !== null)}
        </p>

        {#if nextCursor}
          <div class="flex justify-center">
            <Button variant="secondary" fullWidth={false} onclick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? t.loading : t.showOlder}
            </Button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</PageLayout>

<DepositDrawer
  open={openDeposit !== null}
  deposit={openDeposit}
  {checklist}
  {fileStates}
  busy={downloadingAll !== null}
  onClose={() => (openDepositId = null)}
  onDownload={(fileId) => openDeposit && download(openDeposit, fileId)}
  onDownloadAll={() => openDeposit && downloadAll(openDeposit)}
  onSaveRecord={() => openDeposit && saveRecord(openDeposit)}
  onDelete={() => (confirmDeleteId = openDepositId)}
/>

{#if auth.user && portal?.role === "owner"}
  <PortalSharingDrawer
    open={sharingOpen}
    userId={auth.user.id}
    portalId={portal.id}
    {sharing}
    onClose={() => (sharingOpen = false)}
    onChanged={reloadSharing}
  />
  <PortalReturnsDrawer
    open={returnsOpen}
    userId={auth.user.id}
    {portal}
    onClose={() => (returnsOpen = false)}
    onChanged={(returns) => {
      if (portal) portal = { ...portal, returns };
    }}
  />
{/if}

<Modal
  open={confirmDeleteId !== null}
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
        {t.deleteFiles}
      {/if}
    </Button>
  {/snippet}
</Modal>
