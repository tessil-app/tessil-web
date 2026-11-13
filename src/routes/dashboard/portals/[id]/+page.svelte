<script lang="ts">
  // What was sent through one portal. Deposits are decrypted here with the
  // portal's private key from the member's vault.

  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DepositDrawer from "$lib/components/DepositDrawer.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api } from "$lib/api/client";
  import { saveDecryptedFile, StreamInterruptedError } from "$lib/download/saveFile";
  import Badge from "$lib/components/Badge.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import {
    coverageOf,
    loadDeposits,
    openMemberPortal,
    saveChecklist,
    type OpenedDeposit,
    type OpenedMemberPortal,
  } from "$lib/portal/deposits";
  import {
    CHECKLIST_LABEL_MAX,
    CHECKLIST_MAX_ITEMS,
    newChecklistItemId,
    type ChecklistItem,
  } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { buildReceiptText, saveTextFile } from "$lib/portal/receipt";
  import { formatSize } from "$lib/utils";
  import { subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconMagnifyingGlassRegular from "phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
  import { onDestroy } from "svelte";

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
  type Filter = "all" | "incomplete" | "soon";
  const SOON_DAYS = 7;

  let query = $state("");
  let filter = $state<Filter>("all");
  let openDepositId = $state<string | null>(null);
  let listOpen = $state(false);

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
        haystack: [deposit.note ?? "", deposit.reference, ...deposit.files.map((f) => f.name)]
          .join("\n")
          .toLowerCase(),
      };
    }),
  );
  const counts = $derived({
    all: rows.length,
    incomplete: rows.filter((r) => !r.complete).length,
    soon: rows.filter((r) => r.soon).length,
  });
  const filters = $derived<{ id: Filter; label: string }[]>([
    { id: "all", label: "All" },
    ...(checklist.length > 0 ? [{ id: "incomplete" as const, label: "Incomplete" }] : []),
    { id: "soon", label: "Deleted soon" },
  ]);
  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || (filter === "incomplete" ? !r.complete : r.soon)) &&
        (needle === "" || r.haystack.includes(needle)),
    );
  });
  const openDeposit = $derived(deposits.find((d) => d.id === openDepositId) ?? null);

  function allSaved(deposit: OpenedDeposit): boolean {
    return deposit.files.every((f) => fileStates[f.id]?.status === "complete");
  }

  function closeList() {
    listOpen = false;
    if (portal) draft = portal.checklist;
    newLabel = "";
    listError = null;
  }

  // ─── what the portal asks for ─────────────────────────────────────────────
  let draft = $state<ChecklistItem[]>([]);
  let newLabel = $state("");
  let isSavingList = $state(false);
  let listError = $state<string | null>(null);
  let listSaved = $state(false);

  const listChanged = $derived(
    portal !== null && JSON.stringify(draft) !== JSON.stringify(portal.checklist),
  );

  function addItem(e?: Event) {
    e?.preventDefault();
    const label = newLabel.trim().slice(0, CHECKLIST_LABEL_MAX);
    if (!label || draft.length >= CHECKLIST_MAX_ITEMS) return;
    draft = [...draft, { id: newChecklistItemId(), label }];
    newLabel = "";
    listSaved = false;
  }

  function removeItem(id: string) {
    draft = draft.filter((item) => item.id !== id);
    listSaved = false;
  }

  async function saveList() {
    if (!portal || isSavingList || !listChanged) return;
    isSavingList = true;
    listError = null;
    try {
      await saveChecklist(portal, draft);
      portal = { ...portal, checklist: draft };
      listSaved = true;
    } catch (err) {
      listError = err instanceof Error ? err.message : "Couldn't save the list.";
    } finally {
      isSavingList = false;
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
      draft = opened.portal.checklist;
      const first = await loadDeposits(opened.portal);
      deposits = first.deposits;
      unreadable = first.unreadable;
      nextCursor = first.nextCursor;
      phase = "ready";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't load this portal.";
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
      errorMessage = err instanceof Error ? err.message : "Couldn't load more.";
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
            ? "Interrupted. Delete the partial file and try again."
            : "Couldn't download this file. Try again.",
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
        locale: "en",
        portalTitle: portal.title,
        reference: deposit.reference,
        at: new Date(deposit.createdAt),
        note: deposit.note,
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
      if (openDepositId === confirmDeleteId) openDepositId = null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't delete these files.";
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
      errorMessage = "Couldn't copy the link.";
    }
  }

  // Tailwind needs both column sets spelled out in full.
  const cols = $derived(
    checklist.length > 0
      ? "grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]"
      : "grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]",
  );
  const iconButton =
    "p-2 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  const shortFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function daysLeft(iso: string): string {
    const days = daysUntil(iso);
    if (days <= 0) return "today";
    return days === 1 ? "in 1 day" : `in ${days} days`;
  }
</script>

<Seo title="{portal?.title ?? 'Portal'} - Tessil" robots="noindex" />

<PageLayout width="5xl">
  <p class="mb-4 text-sm">
    <a
      href="/dashboard/portals"
      class="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
    >
      ← All portals
    </a>
  </p>

  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if phase === "locked"}
    <Frame.Root>
      <Frame.Panel>
        <div class="text-center space-y-3">
          <h1 class="text-lg font-medium text-foreground">
            {auth.needsVaultSetup ? "This needs a vault" : "Your vault is locked"}
          </h1>
          <p class="text-sm text-muted-foreground">
            The files sent to this portal are opened with a key kept in your vault.
          </p>
          <div class="flex justify-center pt-2">
            {#if auth.needsVaultSetup}
              <Button fullWidth={false} href="/setup/vault">Set up vault</Button>
            {:else}
              <Button fullWidth={false} onclick={() => unlockPrompt.request()}>Unlock vault</Button>
            {/if}
          </div>
        </div>
      </Frame.Panel>
    </Frame.Root>
  {:else if phase === "missing" || phase === "unreadable"}
    <Frame.Root>
      <Frame.Panel>
        <div class="text-center space-y-3">
          <h1 class="text-lg font-medium text-foreground">
            {phase === "missing" ? "Portal not found" : "This portal can't be opened"}
          </h1>
          <p class="text-sm text-muted-foreground">
            {phase === "missing"
              ? "It may have been deleted, or you may not be a member of it."
              : "Its keys did not open with your vault."}
          </p>
          {#if errorMessage}
            <Alert tone="destructive">{errorMessage}</Alert>
          {/if}
        </div>
      </Frame.Panel>
    </Frame.Root>
  {:else if portal}
    <PageHeader
      title={portal.title}
      tagline={portal.isDisabled
        ? "Switched off. Nobody can send files here until you switch it back on."
        : "Files are deleted automatically, so download what you need to keep."}
      align="left"
      class="mb-8 flex-wrap"
    >
      {#snippet actions()}
        {#if portal?.role === "owner"}
          <Button
            variant="secondary"
            fullWidth={false}
            class="whitespace-nowrap"
            onclick={() => (listOpen = true)}
          >
            What you ask for{checklist.length > 0 ? ` (${checklist.length})` : ""}
          </Button>
        {/if}
        <Button fullWidth={false} class="whitespace-nowrap" onclick={copyLink}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      {/snippet}
    </PageHeader>

    <div class="space-y-4">
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if unreadable > 0}
        <Alert tone="warning">
          {unreadable}
          {unreadable === 1 ? "deposit" : "deposits"} could not be opened with this portal's key and
          {unreadable === 1 ? "is" : "are"} not shown.
        </Alert>
      {/if}

      {#if deposits.length === 0}
        <Frame.Root>
          <Frame.Panel>
            <div class="text-center space-y-3">
              <h2 class="text-lg font-medium text-foreground">Nothing has been sent yet</h2>
              <p class="text-sm text-muted-foreground">
                Share the portal link. Files appear here as soon as someone sends them.
              </p>
            </div>
          </Frame.Panel>
        </Frame.Root>
      {:else}
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            class="flex items-center gap-2 sm:w-80 rounded-md border border-border bg-card px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          >
            <IconMagnifyingGlassRegular class="size-4 shrink-0 text-muted-foreground" />
            <span class="sr-only">Search deliveries</span>
            <input
              type="search"
              bind:value={query}
              placeholder="Search note, reference or file name"
              class="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Show">
            {#each filters as f (f.id)}
              <button
                type="button"
                aria-pressed={filter === f.id}
                onclick={() => (filter = f.id)}
                class="rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {filter ===
                f.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-foreground hover:bg-accent'}"
              >
                {f.label}
                <span class="opacity-70">{counts[f.id]}</span>
              </button>
            {/each}
          </div>
        </div>

        {#if visible.length === 0}
          <div class="rounded-lg bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing matches. Search looks at notes, references and file names.
          </div>
        {:else}
          <!-- Desktop table (sm+) -->
          <div class="hidden sm:block overflow-hidden rounded-lg bg-card">
            <div class="flex items-center bg-muted/40">
              <div
                class="grid flex-1 min-w-0 {cols} gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                <div>Note</div>
                <div>Received</div>
                <div>Files</div>
                {#if checklist.length > 0}
                  <div>Asked for</div>
                {/if}
                <div>Deleted</div>
              </div>
              <div class="w-24 shrink-0"></div>
            </div>
            <ul class="divide-y divide-border">
              {#each visible as row (row.deposit.id)}
                {@const deposit = row.deposit}
                <li
                  class="flex items-center transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-accent"
                >
                  <button
                    type="button"
                    onclick={() => (openDepositId = deposit.id)}
                    class="grid flex-1 min-w-0 {cols} gap-4 items-center px-4 py-3 text-left text-sm hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <div class="min-w-0">
                      <div
                        class="truncate font-medium {deposit.note
                          ? 'text-foreground'
                          : 'text-muted-foreground'}"
                        title={deposit.note ?? undefined}
                      >
                        {deposit.note ?? "No note"}
                      </div>
                      <div class="text-xs text-muted-foreground font-mono">{deposit.reference}</div>
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
                            ? "Complete"
                            : `${row.coverage.provided.length} of ${checklist.length}`}
                        </Badge>
                      </div>
                    {/if}
                    <div class={row.soon ? "text-destructive-foreground" : "text-muted-foreground"}>
                      {daysLeft(deposit.expiresAt)}
                    </div>
                  </button>
                  <div class="flex w-24 shrink-0 items-center justify-end gap-1 pr-3">
                    <button
                      type="button"
                      onclick={() => downloadAll(deposit)}
                      disabled={downloadingAll !== null}
                      aria-label="Download all files of {deposit.reference}"
                      title="Download all"
                      class={iconButton}
                    >
                      {#if downloadingAll === deposit.id}
                        <Spinner class="size-4" aria-hidden="true" />
                      {:else if allSaved(deposit)}
                        <IconCheckRegular class="size-4 text-success-foreground" />
                      {:else}
                        <IconDownloadRegular class="size-4" />
                      {/if}
                    </button>
                    <button
                      type="button"
                      onclick={() => (confirmDeleteId = deposit.id)}
                      aria-label="Delete {deposit.reference}"
                      title="Delete"
                      class={iconButton}
                    >
                      <IconTrashRegular class="size-4" />
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          </div>

          <!-- Mobile stack (<sm): actions live in the drawer. -->
          <ul class="space-y-3 sm:hidden">
            {#each visible as row (row.deposit.id)}
              {@const deposit = row.deposit}
              <li>
                <button
                  type="button"
                  onclick={() => (openDepositId = deposit.id)}
                  class="block w-full text-left bg-card rounded-lg p-4 space-y-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p
                        class="text-sm font-medium truncate {deposit.note
                          ? 'text-foreground'
                          : 'text-muted-foreground'}"
                      >
                        {deposit.note ?? "No note"}
                      </p>
                      <p class="text-xs text-muted-foreground font-mono">{deposit.reference}</p>
                    </div>
                    {#if checklist.length > 0}
                      <Badge tone={row.complete ? "success" : "warning"}>
                        {row.complete
                          ? "Complete"
                          : `${row.coverage.provided.length} of ${checklist.length}`}
                      </Badge>
                    {/if}
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {shortFmt.format(new Date(deposit.createdAt))} ·
                    {deposit.files.length}
                    {deposit.files.length === 1 ? "file" : "files"} · {formatSize(deposit.totalBytes)}
                    ·
                    <span class={row.soon ? "text-destructive-foreground" : ""}>
                      deleted {daysLeft(deposit.expiresAt)}
                    </span>
                  </p>
                </button>
              </li>
            {/each}
          </ul>
        {/if}

        <p class="text-xs text-muted-foreground" role="status">
          Showing {visible.length} of {deposits.length}
          {deposits.length === 1 ? "delivery" : "deliveries"}{nextCursor
            ? ". Older ones are not loaded yet, so search does not cover them."
            : "."}
        </p>

        {#if nextCursor}
          <div class="flex justify-center">
            <Button variant="secondary" fullWidth={false} onclick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? "Loading…" : "Show older"}
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

<Drawer open={listOpen} title="What you ask for" onClose={closeList}>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">
      People who open the link see this list and attach a file to each item, so you can see at
      a glance what is still missing. Leave it empty to accept anything.
    </p>

    {#if draft.length > 0}
      <ul class="divide-y divide-border rounded-lg bg-card">
        {#each draft as item (item.id)}
          <li class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="min-w-0 break-words text-sm text-foreground">{item.label}</span>
            <button
              type="button"
              onclick={() => removeItem(item.id)}
              disabled={isSavingList}
              class="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
            >
              Remove<span class="sr-only"> {item.label}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if draft.length < CHECKLIST_MAX_ITEMS}
      <form onsubmit={addItem} class="flex items-end gap-2">
        <div class="min-w-0 flex-1">
          <TextInput
            id="checklist-new"
            label="Add an item"
            placeholder="For example: Copy of your ID"
            maxlength={CHECKLIST_LABEL_MAX}
            bind:value={newLabel}
            disabled={isSavingList}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          fullWidth={false}
          class="whitespace-nowrap"
          disabled={isSavingList || newLabel.trim().length === 0}
        >
          Add
        </Button>
      </form>
    {/if}

    {#if listError}
      <Alert tone="destructive">{listError}</Alert>
    {/if}
    {#if listSaved && !listChanged}
      <p class="text-sm text-muted-foreground" role="status">Saved. The link stays the same.</p>
    {/if}
  </div>

  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={closeList} disabled={isSavingList}>
      {listChanged ? "Cancel" : "Close"}
    </Button>
    <Button type="button" fullWidth={false} onclick={saveList} disabled={!listChanged || isSavingList}>
      {#if isSavingList}
        <Spinner aria-hidden="true" />
        Saving…
      {:else}
        Save list
      {/if}
    </Button>
  {/snippet}
</Drawer>

<Modal
  open={confirmDeleteId !== null}
  title="Delete these files?"
  description="They are removed for everyone with access to this portal. This can't be undone."
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
      Keep them
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmDelete} disabled={isDeleting}>
      {#if isDeleting}
        <Spinner aria-hidden="true" />
        Deleting…
      {:else}
        Delete files
      {/if}
    </Button>
  {/snippet}
</Modal>
