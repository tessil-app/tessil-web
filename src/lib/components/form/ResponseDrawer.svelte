<script lang="ts">
  // One response to a form: the answers, the files that came with them,
  // and what can be done with it. Download state lives in the page so it
  // survives closing the drawer.

  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import type { DepositFileState } from "$lib/components/DepositDrawer.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import { answerText } from "$lib/form/answers";
  import type { Question } from "$lib/form/questions";
  import type { OpenedDeposit } from "$lib/portal/deposits";
  import { formatSize } from "$lib/utils";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { formsAppMessages } from "$lib/i18n/messages/formsApp";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  interface Props {
    open: boolean;
    response: OpenedDeposit | null;
    /** The form's questions now, to tell when a response words one differently. */
    questions: Question[];
    fileStates: Record<string, DepositFileState>;
    /** A "download all" is running somewhere on the page. */
    busy: boolean;
    onClose: () => void;
    onDownload: (fileId: string) => void;
    onDownloadAll: () => void;
    onSaveRecord: () => void;
    onDelete: () => void;
  }

  let { open, response, questions, fileStates, busy, onClose, onDownload, onDownloadAll, onSaveRecord, onDelete }: Props =
    $props();

  // Files whose question is gone from the answers, so they show somewhere.
  const loose = $derived(
    response
      ? response.files.filter((f) => !(response.answers ?? []).some((a) => a.type === "file" && a.id === f.itemId))
      : [],
  );

  const locale = $derived(appLocale());
  const f = $derived(formsAppMessages[locale]);
  const t = $derived(f.drawer);
  const r = $derived(f.responses);
  const p = $derived(portalsAppMessages[locale].deposit);
  const tag = $derived(locale === "nl" ? "nl-NL" : undefined);
  const dateFmt = $derived(
    new Intl.DateTimeFormat(tag, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  );
  const dayFmt = $derived(new Intl.DateTimeFormat(tag, { year: "numeric", month: "short", day: "numeric" }));

  function showDate(value: string): string {
    const [y, m, d] = value.split("-").map(Number);
    return y && m && d ? dayFmt.format(new Date(y, m - 1, d)) : value;
  }
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
    {#if response}
      <div class="space-y-1">
        <p class="text-xs text-muted-foreground">{t.response}</p>
        <h2 class="font-semibold text-base leading-snug text-foreground font-mono">{response.reference}</h2>
      </div>
    {/if}
  {/snippet}

  {#if response}
    <div class="space-y-3">
      <DrawerSection>
        <DetailList>
          <DetailItem label={p.received}>{dateFmt.format(new Date(response.createdAt))}</DetailItem>
          <DetailItem label={p.deletedOn}>{dayFmt.format(new Date(response.expiresAt))}</DetailItem>
          {#if response.files.length > 0}
            <DetailItem label={t.files}>
              {p.files(response.files.length, formatSize(response.totalBytes))}
            </DetailItem>
          {/if}
        </DetailList>
      </DrawerSection>

      <DrawerSection title={t.answers}>
        {#if response.answers}
          <dl class="space-y-4">
            {#each response.answers as answer (answer.id)}
              {@const asked = questions.find((q) => q.id === answer.id)?.label}
              <div class="space-y-1">
                <dt class="text-sm text-muted-foreground break-words">
                  {answer.label}
                  {#if asked !== undefined && asked !== answer.label}
                    <Badge tone="warning" class="ml-1 align-middle">{t.wordingDiffers}</Badge>
                    <span class="mt-1 block text-xs">{t.nowAsks(asked)}</span>
                  {/if}
                </dt>
                <dd class="text-sm text-foreground">
                  {#if answer.type === "file"}
                    {@const files = response.files.filter((f) => f.itemId === answer.id)}
                    {#if files.length === 0}
                      <span class="text-muted-foreground">{t.noFile}</span>
                    {:else}
                      <ul class="space-y-2">
                        {#each files as file (file.id)}
                          <li>{@render fileRow(file)}</li>
                        {/each}
                      </ul>
                    {/if}
                  {:else if answer.value === null}
                    <span class="text-muted-foreground">{t.notAnswered}</span>
                  {:else if answer.type === "date" && typeof answer.value === "string"}
                    {showDate(answer.value)}
                  {:else}
                    <span class="whitespace-pre-wrap break-words">{answerText(answer, r)}</span>
                  {/if}
                </dd>
              </div>
            {/each}
          </dl>
        {:else if response.answersUnreadable}
          <Alert tone="warning">{t.unreadable}</Alert>
        {:else}
          <p class="text-sm text-muted-foreground">{t.noAnswers}</p>
        {/if}
      </DrawerSection>

      {#if loose.length > 0}
        <DrawerSection title={t.otherFiles}>
          <ul class="space-y-2">
            {#each loose as file (file.id)}
              <li>{@render fileRow(file)}</li>
            {/each}
          </ul>
        </DrawerSection>
      {/if}

      <DrawerSection
        title={p.recordTitle}
        description={t.recordBody}
      >
        <Button variant="secondary" fullWidth={false} onclick={onSaveRecord}>{p.saveRecord}</Button>
      </DrawerSection>
    </div>
  {/if}

  {#snippet footer()}
    {#if response}
      <Button type="button" variant="destructive" fullWidth={false} onclick={onDelete}>{p.delete}</Button>
      {#if response.files.length > 0}
        <Button type="button" fullWidth={false} onclick={onDownloadAll} disabled={busy}>
          {busy ? p.downloading : response.files.length > 1 ? t.downloadAll(response.files.length) : t.downloadFile}
        </Button>
      {/if}
    {/if}
  {/snippet}
</Drawer>
