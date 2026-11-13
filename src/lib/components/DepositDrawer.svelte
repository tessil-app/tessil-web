<script lang="ts">
  // One delivery to a portal: what was asked for, the files, and what can
  // be done with them. Download state lives in the page so it survives
  // closing the drawer.

  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import { coverageOf, type OpenedDeposit } from "$lib/portal/deposits";
  import type { ChecklistItem } from "$lib/portal/keys";
  import { formatSize } from "$lib/utils";

  export type DepositFileState = {
    status: "idle" | "downloading" | "complete" | "error";
    percent: number;
    error?: string;
  };

  interface Props {
    open: boolean;
    deposit: OpenedDeposit | null;
    checklist: ChecklistItem[];
    fileStates: Record<string, DepositFileState>;
    /** A "download all" is running somewhere on the page. */
    busy: boolean;
    onClose: () => void;
    onDownload: (fileId: string) => void;
    onDownloadAll: () => void;
    onSaveRecord: () => void;
    onDelete: () => void;
  }

  let {
    open,
    deposit,
    checklist,
    fileStates,
    busy,
    onClose,
    onDownload,
    onDownloadAll,
    onSaveRecord,
    onDelete,
  }: Props = $props();

  const coverage = $derived(deposit ? coverageOf(checklist, deposit.files) : null);
  const extras = $derived(
    deposit ? deposit.files.filter((f) => !checklist.some((i) => i.id === f.itemId)) : [],
  );

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
</script>

{#snippet fileRow(file: OpenedDeposit["files"][number])}
  {@const state = fileStates[file.id]}
  <FileRow
    name={file.name}
    size={formatSize(file.plainSize)}
    kind="download"
    status={state?.status ?? "idle"}
    percent={state?.percent ?? 0}
    errorSub={state?.error}
    onDownload={() => onDownload(file.id)}
    onRetry={() => onDownload(file.id)}
  />
{/snippet}

<Drawer {open} {onClose}>
  {#snippet header()}
    {#if deposit}
      <div class="space-y-1">
        <h2 class="font-semibold text-base leading-snug text-foreground break-words">
          {deposit.note ?? "No note"}
        </h2>
        <p class="text-xs text-muted-foreground">
          Reference <span class="font-mono">{deposit.reference}</span>
        </p>
      </div>
    {/if}
  {/snippet}

  {#if deposit && coverage}
    <div class="space-y-3">
      <section class="rounded-lg bg-card p-4">
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-y-2 gap-x-4 text-sm">
          <dt class="text-muted-foreground">Received</dt>
          <dd class="text-foreground">{dateFmt.format(new Date(deposit.createdAt))}</dd>
          <dt class="text-muted-foreground">Deleted on</dt>
          <dd class="text-foreground">{dayFmt.format(new Date(deposit.expiresAt))}</dd>
          <dt class="text-muted-foreground">Size</dt>
          <dd class="text-foreground">
            {deposit.files.length}
            {deposit.files.length === 1 ? "file" : "files"}, {formatSize(deposit.totalBytes)}
          </dd>
        </dl>
      </section>

      {#if checklist.length > 0}
        <section class="space-y-3 rounded-lg bg-card p-4">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-medium text-foreground">What you asked for</h3>
            <Badge tone={coverage.missing.length === 0 ? "success" : "warning"}>
              {coverage.missing.length === 0
                ? "Complete"
                : `${coverage.provided.length} of ${checklist.length}`}
            </Badge>
          </div>
          <ul class="space-y-4">
            {#each checklist as item (item.id)}
              {@const files = deposit.files.filter((f) => f.itemId === item.id)}
              <li class="space-y-2">
                <p class="text-sm text-foreground break-words">{item.label}</p>
                {#if files.length === 0}
                  <p class="text-sm text-warning-foreground">Not included</p>
                {:else}
                  <ul class="space-y-2">
                    {#each files as file (file.id)}
                      <li>{@render fileRow(file)}</li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if extras.length > 0}
        <section class="space-y-3 rounded-lg bg-card p-4">
          <h3 class="text-sm font-medium text-foreground">
            {checklist.length > 0 ? "Also sent" : "Files"}
          </h3>
          <ul class="space-y-2">
            {#each extras as file (file.id)}
              <li>{@render fileRow(file)}</li>
            {/each}
          </ul>
        </section>
      {/if}

      <section class="space-y-2 rounded-lg bg-card p-4">
        <h3 class="text-sm font-medium text-foreground">Keep a record</h3>
        <p class="text-xs text-muted-foreground">
          A text file with the reference, the note, the file names and the deletion date. The
          sender has the same reference on their confirmation.
        </p>
        <Button variant="secondary" fullWidth={false} onclick={onSaveRecord}>Save record</Button>
      </section>
    </div>
  {/if}

  {#snippet footer()}
    {#if deposit}
      <Button type="button" variant="destructive" fullWidth={false} onclick={onDelete}>
        Delete
      </Button>
      <Button type="button" fullWidth={false} onclick={onDownloadAll} disabled={busy}>
        {busy
          ? "Downloading…"
          : deposit.files.length > 1
            ? `Download all ${deposit.files.length}`
            : "Download"}
      </Button>
    {/if}
  {/snippet}
</Drawer>
