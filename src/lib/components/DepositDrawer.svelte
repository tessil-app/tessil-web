<script lang="ts">
  // One delivery to a portal: what was asked for, the files, and what can
  // be done with them. Download state lives in the page so it survives
  // closing the drawer.

  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import { coverageOf, type OpenedDeposit } from "$lib/portal/deposits";
  import type { ChecklistItem } from "$lib/portal/keys";
  import { formatSize } from "$lib/utils";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

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

  const locale = $derived(appLocale());
  const t = $derived(portalsAppMessages[locale].deposit);
  const tag = $derived(locale === "nl" ? "nl-NL" : undefined);
  const dateFmt = $derived(
    new Intl.DateTimeFormat(tag, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  );
  const dayFmt = $derived(new Intl.DateTimeFormat(tag, { year: "numeric", month: "short", day: "numeric" }));
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
        <p class="text-xs text-muted-foreground">{t.delivery}</p>
        <h2 class="font-semibold text-base leading-snug text-foreground font-mono">
          {deposit.reference}
        </h2>
      </div>
    {/if}
  {/snippet}

  {#if deposit && coverage}
    <div class="space-y-3">
      <DrawerSection>
        <DetailList>
          {#if deposit.answer}
            <DetailItem label={deposit.answer.label || t.from}>{deposit.answer.value}</DetailItem>
          {/if}
          <DetailItem label={t.received}>{dateFmt.format(new Date(deposit.createdAt))}</DetailItem>
          <DetailItem label={t.deletedOn}>{dayFmt.format(new Date(deposit.expiresAt))}</DetailItem>
          <DetailItem label={t.size}>
            {t.files(deposit.files.length, formatSize(deposit.totalBytes))}
          </DetailItem>
        </DetailList>
      </DrawerSection>

      {#if deposit.note}
        <DrawerSection title={t.note}>
          <p class="text-sm text-foreground whitespace-pre-wrap break-words">{deposit.note}</p>
        </DrawerSection>
      {/if}

      {#if checklist.length > 0}
        <DrawerSection title={t.askedFor}>
          {#snippet aside()}
            <Badge tone={coverage.missing.length === 0 ? "success" : "warning"}>
              {coverage.missing.length === 0
                ? t.complete
                : t.of(coverage.provided.length, checklist.length)}
            </Badge>
          {/snippet}
          <ul class="space-y-4">
            {#each checklist as item (item.id)}
              {@const files = deposit.files.filter((f) => f.itemId === item.id)}
              <li class="space-y-2">
                <p class="text-sm text-foreground break-words">{item.label}</p>
                {#if files.length === 0}
                  <p class="text-sm text-warning-foreground">{t.notIncluded}</p>
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
        </DrawerSection>
      {/if}

      {#if extras.length > 0}
        <DrawerSection title={checklist.length > 0 ? t.alsoSent : t.filesTitle}>
          <ul class="space-y-2">
            {#each extras as file (file.id)}
              <li>{@render fileRow(file)}</li>
            {/each}
          </ul>
        </DrawerSection>
      {/if}

      <DrawerSection
        title={t.recordTitle}
        description={t.recordBody}
      >
        <Button variant="secondary" fullWidth={false} onclick={onSaveRecord}>{t.saveRecord}</Button>
      </DrawerSection>
    </div>
  {/if}

  {#snippet footer()}
    {#if deposit}
      <Button type="button" variant="destructive" fullWidth={false} onclick={onDelete}>
        {t.delete}
      </Button>
      <Button type="button" fullWidth={false} onclick={onDownloadAll} disabled={busy}>
        {busy
          ? t.downloading
          : deposit.files.length > 1
            ? t.downloadAll(deposit.files.length)
            : t.download}
      </Button>
    {/if}
  {/snippet}
</Drawer>
