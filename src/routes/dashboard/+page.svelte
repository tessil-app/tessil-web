<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api, type OwnedTransferSummary } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import { onMount } from "svelte";

  let transfers = $state<OwnedTransferSummary[]>([]);
  let nextCursor = $state<string | null>(null);
  let isLoading = $state(false);
  let isLoadingMore = $state(false);
  let errorMessage = $state<string | null>(null);
  let confirmingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);

  onMount(() => {
    if (auth.loaded && !auth.isAuthenticated) {
      goto("/login", { replaceState: true });
      return;
    }
    if (auth.isAuthenticated) {
      void loadFirstPage();
    }
  });

  // Once auth finishes loading (e.g. on a hard refresh), kick off the fetch.
  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
      return;
    }
    if (transfers.length === 0 && !isLoading && !errorMessage) {
      void loadFirstPage();
    }
  });

  async function loadFirstPage() {
    isLoading = true;
    errorMessage = null;
    try {
      const res = await api.listMyTransfers();
      transfers = res.transfers;
      nextCursor = res.nextCursor;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't load your transfers.";
    } finally {
      isLoading = false;
    }
  }

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    isLoadingMore = true;
    try {
      const res = await api.listMyTransfers(nextCursor);
      transfers = [...transfers, ...res.transfers];
      nextCursor = res.nextCursor;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't load more transfers.";
    } finally {
      isLoadingMore = false;
    }
  }

  async function confirmDelete(id: string) {
    if (deletingId) return;
    deletingId = id;
    try {
      await api.deleteMyTransfer(id);
      transfers = transfers.filter((t) => t.id !== id);
      confirmingId = null;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Couldn't delete that transfer.";
      // If the row already vanished server-side, drop it from the UI too.
      if (errorMessage === "Transfer not found.") {
        transfers = transfers.filter((t) => t.id !== id);
        confirmingId = null;
      }
    } finally {
      deletingId = null;
    }
  }

  function cancelConfirm() {
    confirmingId = null;
  }

  function statusOf(t: OwnedTransferSummary): { label: string; tone: "success" | "warning" | "muted" } {
    const expired = new Date(t.expiresAt) < new Date();
    if (expired) return { label: "Expired", tone: "muted" };
    if (!t.isCompleted) return { label: "In progress", tone: "warning" };
    return { label: "Active", tone: "success" };
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatDate(iso: string) {
    return dateFmt.format(new Date(iso));
  }

  function relativeExpiry(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "expired";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `in ${hours}h`;
    const days = Math.round(hours / 24);
    return `in ${days}d`;
  }
</script>

<svelte:head>
  <title>Dashboard — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
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
    {@const userEmail = auth.user.email}
    <PageHeader title="Your transfers" align="left">
      {#snippet actions()}
        <span class="text-sm text-muted-foreground">
          Signed in as <span class="text-foreground">{userEmail}</span>
        </span>
        <a
          href="/dashboard/settings"
          class="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        >
          Settings
        </a>
      {/snippet}
    </PageHeader>

    <div class="space-y-6">
      <p class="text-sm text-muted-foreground">
        Transfers you create while signed in appear here. File contents stay
        end-to-end encrypted — only the original share link (with its key) can
        decrypt them.
      </p>

      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}

      {#if isLoading}
        <div
          role="status"
          aria-live="polite"
          class="flex flex-col items-center gap-4 py-12 text-info"
        >
          <Spinner class="size-8" aria-hidden="true" />
          <p class="text-muted-foreground">Loading your transfers…</p>
        </div>
      {:else if transfers.length === 0}
        <Frame.Root>
          <Frame.Panel>
            <div class="text-center space-y-3">
              <h2 class="text-lg font-medium text-foreground">No transfers yet</h2>
              <p class="text-sm text-muted-foreground">
                When you upload a file while signed in, it'll show up here so
                you can manage it.
              </p>
              <div class="flex justify-center pt-2">
                <Button href="/" fullWidth={false}>Create a transfer</Button>
              </div>
            </div>
          </Frame.Panel>
        </Frame.Root>
      {:else}
        <ul class="space-y-3">
          {#each transfers as t (t.id)}
            {@const status = statusOf(t)}
            <li
              class="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-foreground">
                    {t.fileCount} {t.fileCount === 1 ? "file" : "files"}
                  </span>
                  <span class="text-sm text-muted-foreground">·</span>
                  <span class="text-sm text-muted-foreground">{formatSize(t.totalBytes)}</span>
                  {#if t.hasPassword}
                    <span class="text-sm text-muted-foreground">·</span>
                    <span class="text-xs text-muted-foreground">password-protected</span>
                  {/if}
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <p class="text-xs text-muted-foreground">
                  Created {formatDate(t.createdAt)} · Expires {relativeExpiry(t.expiresAt)}
                  · {t.downloadCount} {t.downloadCount === 1 ? "download" : "downloads"}
                </p>
              </div>
              <div class="flex items-center gap-2 sm:shrink-0">
                {#if confirmingId === t.id}
                  <span class="text-sm text-muted-foreground" aria-live="polite">
                    Delete?
                  </span>
                  <Button
                    variant="destructive"
                    fullWidth={false}
                    onclick={() => confirmDelete(t.id)}
                    disabled={deletingId === t.id}
                  >
                    {#if deletingId === t.id}
                      <Spinner aria-hidden="true" />
                      Deleting…
                    {:else}
                      Confirm
                    {/if}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth={false}
                    onclick={cancelConfirm}
                    disabled={deletingId === t.id}
                  >
                    Cancel
                  </Button>
                {:else}
                  <Button
                    variant="ghost"
                    fullWidth={false}
                    onclick={() => (confirmingId = t.id)}
                  >
                    Delete
                  </Button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>

        {#if nextCursor}
          <div class="flex justify-center">
            <Button
              variant="secondary"
              fullWidth={false}
              onclick={loadMore}
              disabled={isLoadingMore}
            >
              {#if isLoadingMore}
                <Spinner aria-hidden="true" />
                Loading…
              {:else}
                Load more
              {/if}
            </Button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</PageLayout>
