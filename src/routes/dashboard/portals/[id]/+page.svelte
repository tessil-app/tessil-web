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
  import {
    loadDeposits,
    openMemberPortal,
    type OpenedDeposit,
    type OpenedMemberPortal,
  } from "$lib/portal/deposits";
  import { auth } from "$lib/stores/auth.svelte";
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
        : "Files people sent through this portal."}
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
                </div>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  class="shrink-0"
                  onclick={() => (confirmDeleteId = deposit.id)}
                >
                  Delete
                </Button>
              </div>

              <ul class="space-y-2">
                {#each deposit.files as file (file.id)}
                  {@const state = fileStates[file.id]}
                  <li>
                    <FileRow
                      name={file.name}
                      size={formatSize(file.plainSize)}
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
