<script lang="ts">
  // Owner's side of a two-way portal: put files on it for the other side
  // to download, and take them off again.

  import { api } from "$lib/api/client";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import type { OpenedMemberPortal } from "$lib/portal/deposits";
  import type { PortalReturn } from "$lib/portal/keys";
  import {
    loadReturns,
    pruneReturns,
    removeReturn,
    removeReturnFile,
    sendReturn,
    type OpenedReturn,
  } from "$lib/portal/returns";
  import { holdWhileUploading } from "$lib/upload/keepAwake";
  import { formatSize } from "$lib/utils";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  interface Props {
    open: boolean;
    userId: string;
    portal: OpenedMemberPortal;
    onClose: () => void;
    /** The portal's list changed; the parent keeps the portal in step. */
    onChanged: (returns: PortalReturn[]) => void;
  }

  let { open, userId, portal, onClose, onChanged }: Props = $props();

  type RowStatus = "idle" | "uploading" | "complete" | "error";
  let rows = $state<{ file: File; status: RowStatus; percent: number }[]>([]);
  let sending = $state(false);
  let error = $state<string | null>(null);
  let controller: AbortController | null = null;

  let batches = $state<OpenedReturn[]>([]);
  let loading = $state(false);
  let removing = $state<string | null>(null);
  // The longest the owner's plan keeps a transfer.
  let expiresInHours = $state(24 * 7);
  let maxTotalSize = $state<number | undefined>(undefined);

  const locale = $derived(appLocale());
  const t = $derived(portalsAppMessages[locale].returns);
  const dayFmt = $derived(new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : undefined, { dateStyle: "medium" }));

  async function refresh() {
    loading = true;
    try {
      const res = await loadReturns(portal.returns);
      batches = res.returns;
      if (res.gone.length > 0) onChanged(await pruneReturns(portal, res.gone));
    } catch {
      // The list is a convenience; sending still works without it.
    } finally {
      loading = false;
    }
  }

  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) {
      error = null;
      void refresh();
      void api
        .getMyUsage()
        .then((u) => {
          expiresInHours = Math.max(...u.caps.allowedExpiryHours);
          maxTotalSize = u.caps.maxTransferSize;
        })
        .catch(() => {});
    }
    wasOpen = open;
  });

  $effect(() => {
    if (!sending) return;
    return holdWhileUploading();
  });

  async function send() {
    if (sending || rows.length === 0) return;
    sending = true;
    error = null;
    controller = new AbortController();
    rows = rows.map((r) => ({ ...r, status: "idle", percent: 0 }));
    try {
      const returns = await sendReturn(
        portal,
        userId,
        rows.map((r) => r.file),
        expiresInHours,
        {
          signal: controller.signal,
          onProgress: (i, status, percent) => {
            rows[i].status = status;
            rows[i].percent = percent;
          },
        },
      );
      rows = [];
      onChanged(returns);
      batches = (await loadReturns(returns)).returns;
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        error = err instanceof Error ? err.message : t.errors.send;
      }
    } finally {
      sending = false;
      controller = null;
    }
  }

  async function remove(id: string) {
    if (removing) return;
    removing = id;
    error = null;
    try {
      onChanged(await removeReturn(portal, id));
      batches = batches.filter((b) => b.id !== id);
    } catch (err) {
      error = err instanceof Error ? err.message : t.errors.remove;
    } finally {
      removing = null;
    }
  }

  async function removeFile(batchId: string, fileId: string) {
    if (removing) return;
    removing = fileId;
    error = null;
    try {
      onChanged(await removeReturnFile(portal, batchId, fileId));
      batches = batches
        .map((b) => (b.id === batchId ? { ...b, files: b.files.filter((f) => f.id !== fileId) } : b))
        .filter((b) => b.files.length > 0);
    } catch (err) {
      error = err instanceof Error ? err.message : t.errors.removeFile;
    } finally {
      removing = null;
    }
  }

  function close() {
    if (sending) return;
    rows = [];
    onClose();
  }
</script>

<Drawer {open} title={t.title} onClose={close}>
  <div class="space-y-3">
    <Alert tone="warning">
      {t.warning}
    </Alert>

    <DrawerSection
      title={t.addTitle}
      description={t.addBody}
    >
      <DropZone
        onFilesSelect={(files) => {
          error = null;
          rows = [...rows, ...files.map((file) => ({ file, status: "idle" as RowStatus, percent: 0 }))];
        }}
        disabled={sending}
        compact={rows.length > 0}
        {maxTotalSize}
      />
      {#if rows.length > 0}
        <ul class="space-y-2">
          {#each rows as row, index (row.file)}
            <li>
              <FileRow
                name={row.file.name}
                size={formatSize(row.file.size)}
                status={sending && row.status === "idle" ? "uploading" : row.status}
                kind="upload"
                percent={row.percent}
                onRemove={sending ? undefined : () => (rows = rows.filter((_, i) => i !== index))}
              />
            </li>
          {/each}
        </ul>
        {#if sending}
          <Button variant="secondary" onclick={() => controller?.abort()}>{t.cancel}</Button>
        {:else}
          <Button onclick={send}>
            {t.put(rows.length)}
          </Button>
        {/if}
      {/if}
      {#if error}
        <Alert tone="destructive">{error}</Alert>
      {/if}
    </DrawerSection>

    <DrawerSection title={t.onPortal}>
      {#if loading && batches.length === 0}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" />
          {t.loading}
        </div>
      {:else if batches.length === 0}
        <p class="text-sm text-muted-foreground">{t.nothing}</p>
      {:else}
        <ul class="space-y-3">
          {#each batches as batch (batch.id)}
            <li class="space-y-1 rounded-md border border-border p-3">
              {#each batch.files as file (file.id)}
                <p class="flex items-baseline justify-between gap-3 text-sm text-foreground">
                  <span class="min-w-0 break-words">{file.name}</span>
                  <span class="flex shrink-0 items-baseline gap-3 text-muted-foreground">
                    {formatSize(file.plainSize)}
                    <TextLink
                      class="text-xs"
                      onclick={() => removeFile(batch.id, file.id)}
                      disabled={removing !== null || sending}
                    >
                      {removing === file.id ? t.removing : t.remove}<span class="sr-only">
                        {file.name}</span
                      >
                    </TextLink>
                  </span>
                </p>
              {/each}
              <p class="flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
                <span>{t.deletedOn(dayFmt.format(new Date(batch.expiresAt)))}</span>
                {#if batch.files.length > 1}
                  <TextLink onclick={() => remove(batch.id)} disabled={removing !== null || sending}>
                    {removing === batch.id ? t.removing : t.removeAll(batch.files.length)}
                  </TextLink>
                {/if}
              </p>
            </li>
          {/each}
        </ul>
      {/if}
    </DrawerSection>
  </div>

  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={close} disabled={sending}>{t.close}</Button>
  {/snippet}
</Drawer>
