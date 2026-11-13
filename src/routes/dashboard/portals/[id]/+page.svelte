<script lang="ts">
  // What was sent through one portal. Deposits are decrypted here with the
  // portal's private key from the member's vault.

  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
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
        if (fileStates[file.id]?.status === "error") break;
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

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function daysLeft(iso: string): string {
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
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
        : "Files people sent through this portal. They are deleted automatically, so download what you need to keep."}
      align="left"
    >
      {#snippet actions()}
        <Button variant="secondary" fullWidth={false} class="whitespace-nowrap" onclick={copyLink}>
          {copied ? "Copied" : "Copy portal link"}
        </Button>
      {/snippet}
    </PageHeader>

    <div class="space-y-6">
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if portal.role === "owner"}
        <section class="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <h2 class="text-base font-medium text-foreground">What you ask for</h2>
            <p class="text-sm text-muted-foreground">
              People who open the link see this list and attach a file to each item, so you can
              see at a glance what is still missing. Leave it empty to accept anything.
            </p>
          </div>

          {#if draft.length > 0}
            <ul class="divide-y divide-border rounded-md border border-border">
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
            <form onsubmit={addItem} class="flex flex-col sm:flex-row sm:items-end gap-2">
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

          <div class="flex items-center gap-3">
            <Button fullWidth={false} onclick={saveList} disabled={!listChanged || isSavingList}>
              {#if isSavingList}
                <Spinner aria-hidden="true" />
                Saving…
              {:else}
                Save list
              {/if}
            </Button>
            {#if listSaved && !listChanged}
              <span class="text-sm text-muted-foreground" role="status">
                Saved. The link stays the same.
              </span>
            {/if}
          </div>
        </section>
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
        <ul class="space-y-4">
          {#each deposits as deposit (deposit.id)}
            {@const coverage = coverageOf(portal.checklist, deposit.files)}
            <li class="rounded-lg border border-border bg-card p-4 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="text-base font-medium text-foreground break-words">
                    {deposit.note ?? "No note"}
                  </h2>
                  <p class="text-xs text-muted-foreground">
                    Received {dateFmt.format(new Date(deposit.createdAt))} ·
                    {deposit.files.length}
                    {deposit.files.length === 1 ? "file" : "files"} · {formatSize(deposit.totalBytes)}
                    · deleted automatically {daysLeft(deposit.expiresAt)}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    Reference <span class="font-mono">{deposit.reference}</span>
                  </p>
                </div>
                {#if portal.checklist.length > 0}
                  <Badge tone={coverage.missing.length === 0 ? "success" : "warning"}>
                    {coverage.missing.length === 0
                      ? "Complete"
                      : `${coverage.provided.length} of ${portal.checklist.length}`}
                  </Badge>
                {/if}
              </div>

              {#if coverage.missing.length > 0}
                <p class="text-sm text-muted-foreground">
                  Not included: {coverage.missing.map((i) => i.label).join(", ")}
                </p>
              {/if}

              <ul class="space-y-2">
                {#each deposit.files as file (file.id)}
                  {@const state = fileStates[file.id]}
                  <li>
                    <FileRow
                      name={file.name}
                      size={(() => {
                        const label = portal?.checklist.find((i) => i.id === file.itemId)?.label;
                        return label
                          ? `${label} · ${formatSize(file.plainSize)}`
                          : formatSize(file.plainSize);
                      })()}
                      kind="download"
                      status={state?.status ?? "idle"}
                      percent={state?.percent ?? 0}
                      errorSub={state?.error}
                      onDownload={() => download(deposit, file.id)}
                      onRetry={() => download(deposit, file.id)}
                    />
                  </li>
                {/each}
              </ul>

              <div class="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="secondary"
                  fullWidth={false}
                  onclick={() => downloadAll(deposit)}
                  disabled={downloadingAll !== null}
                >
                  {downloadingAll === deposit.id
                    ? "Downloading…"
                    : deposit.files.length > 1
                      ? `Download all ${deposit.files.length}`
                      : "Download"}
                </Button>
                <Button variant="ghost" fullWidth={false} onclick={() => saveRecord(deposit)}>
                  Save record
                </Button>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  onclick={() => (confirmDeleteId = deposit.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          {/each}
        </ul>

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
