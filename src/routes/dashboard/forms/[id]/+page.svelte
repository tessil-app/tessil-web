<script lang="ts">
  // The responses to one form. Answers and files are decrypted here with the
  // form's private key from the member's vault.

  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import BackLink from "$lib/components/BackLink.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FilterChips from "$lib/components/FilterChips.svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Notice from "$lib/components/Notice.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PortalSharingDrawer from "$lib/components/PortalSharingDrawer.svelte";
  import SearchField from "$lib/components/SearchField.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import * as Table from "$lib/components/table";
  import ResponseDrawer from "$lib/components/form/ResponseDrawer.svelte";
  import ResponseSummary from "$lib/components/form/ResponseSummary.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import { api } from "$lib/api/client";
  import { saveDecryptedFile, StreamInterruptedError } from "$lib/download/saveFile";
  import { saveTextFile } from "$lib/download/saveTextFile";
  import { answersCsv, answerText, leadingAnswer } from "$lib/form/answers";
  import { pickedOption, summarise, type QuestionSummary } from "$lib/form/summary";
  import { loadDeposits, openMemberPortal, type OpenedDeposit, type OpenedMemberPortal } from "$lib/portal/deposits";
  import { hasClosed } from "$lib/portal/keys";
  import { buildReceiptText } from "$lib/portal/receipt";
  import { loadSharing, type PortalSharing } from "$lib/portal/sharing";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import { subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import { onDestroy } from "svelte";

  type Phase = "loading" | "locked" | "missing" | "unreadable" | "ready";
  type FileStatus = "idle" | "downloading" | "complete" | "error";

  const formId = $derived($page.params.id ?? "");

  let phase = $state<Phase>("loading");
  let form = $state<OpenedMemberPortal | null>(null);
  let responses = $state<OpenedDeposit[]>([]);
  let unreadable = $state(0);
  let nextCursor = $state<string | null>(null);
  let isLoadingMore = $state(false);
  let errorMessage = $state<string | null>(null);
  let hasLoaded = $state(false);

  let fileStates = $state<Record<string, { status: FileStatus; percent: number; error?: string }>>({});
  let confirmDeleteId = $state<string | null>(null);
  let isDeleting = $state(false);
  let copied = $state(false);

  // ─── finding a response ───────────────────────────────────────────────────
  type Filter = "all" | "new" | "soon";
  const SOON_DAYS = 7;

  let query = $state("");
  let filter = $state<Filter>("all");
  let openId = $state<string | null>(null);
  let seenBefore = $state<string | null>(null);

  // ─── summary ──────────────────────────────────────────────────────────────
  let view = $state<"responses" | "summary">("responses");
  /** Set by picking an option in the summary: only responses that chose it. */
  let picked = $state<{ questionId: string; value: string | boolean; label: string } | null>(null);
  let loadingAll = $state(false);
  const summaries = $derived(view === "summary" ? summarise(form?.questions ?? [], responses) : []);

  function daysUntil(iso: string): number {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  }

  const hasFileQuestions = $derived((form?.questions ?? []).some((q) => q.type === "file"));
  const rows = $derived(
    responses.map((response) => {
      const answers = response.answers ?? [];
      return {
        response,
        lead: leadingAnswer(answers),
        // The second answer worth showing, under the first.
        second: answers.filter((a) => a.type !== "file" && a.value !== null).map((a) => answerText(a))[1] ?? null,
        soon: daysUntil(response.expiresAt) <= SOON_DAYS,
        isNew: seenBefore !== null && response.createdAt > seenBefore,
        haystack: [response.reference, ...answers.map((a) => answerText(a)), ...response.files.map((f) => f.name)]
          .join("\n")
          .toLowerCase(),
      };
    }),
  );
  const counts = $derived({
    all: rows.length,
    new: rows.filter((r) => r.isNew).length,
    soon: rows.filter((r) => r.soon).length,
  });
  const filters = $derived<{ id: Filter; label: string }[]>([
    { id: "all", label: "All" },
    ...(rows.some((r) => r.isNew) ? [{ id: "new" as const, label: "New" }] : []),
    { id: "soon", label: "Deleted soon" },
  ]);
  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || (filter === "new" ? r.isNew : r.soon)) &&
        (needle === "" || r.haystack.includes(needle)) &&
        (!picked || pickedOption(r.response.answers, picked.questionId, picked.value)),
    );
  });
  const openResponse = $derived(responses.find((r) => r.id === openId) ?? null);

  // ─── sharing with one other account ───────────────────────────────────────
  let sharing = $state<PortalSharing | null>(null);
  let sharingOpen = $state(false);
  const readyInvite = $derived(sharing?.invites.find((i) => i.ready) ?? null);
  const sharingLabel = $derived(
    sharing?.guests.length ? "Shared with 1" : sharing?.invites.length ? "Sharing (invited)" : "Sharing",
  );

  async function reloadSharing() {
    if (form?.role !== "owner") return;
    try {
      sharing = await loadSharing(form.id);
    } catch {
      sharing = null;
    }
  }

  async function load() {
    if (!auth.user) return;
    errorMessage = null;
    try {
      const opened = await openMemberPortal(auth.user.id, formId, window.location.origin);
      if (!opened.ok) {
        form = null;
        phase = opened.reason === "locked" ? "locked" : opened.reason === "not_found" ? "missing" : "unreadable";
        return;
      }
      form = opened.portal;
      void reloadSharing();
      const first = await loadDeposits(opened.portal);
      if (seenBefore === null) {
        seenBefore = first.lastSeenAt;
        void api.markPortalSeen(opened.portal.id).catch(() => {});
      }
      responses = first.deposits;
      unreadable = first.unreadable;
      nextCursor = first.nextCursor;
      phase = "ready";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't load this form.";
      phase = form ? "ready" : "missing";
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
    if (!form || !nextCursor || isLoadingMore) return;
    isLoadingMore = true;
    try {
      const more = await loadDeposits(form, nextCursor);
      responses = [...responses, ...more.deposits];
      unreadable += more.unreadable;
      nextCursor = more.nextCursor;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't load more.";
    } finally {
      isLoadingMore = false;
    }
  }

  // ─── files ────────────────────────────────────────────────────────────────

  async function download(response: OpenedDeposit, fileId: string) {
    if (!form) return;
    const file = response.files.find((f) => f.id === fileId);
    if (!file || fileStates[fileId]?.status === "downloading") return;
    fileStates[fileId] = { status: "downloading", percent: 0 };
    try {
      const { downloadUrl } = await api.getDepositFileUrl(form.id, fileId);
      await saveDecryptedFile({
        downloadUrl,
        key: response.key,
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

  let downloadingAll = $state<string | null>(null);

  async function downloadAll(response: OpenedDeposit) {
    if (downloadingAll) return;
    downloadingAll = response.id;
    try {
      for (const file of response.files) {
        if (fileStates[file.id]?.status === "complete") continue;
        await download(response, file.id);
        if (fileStates[file.id]?.status === "error") {
          openId = response.id;
          break;
        }
      }
    } finally {
      downloadingAll = null;
    }
  }

  function allSaved(response: OpenedDeposit): boolean {
    return response.files.every((f) => fileStates[f.id]?.status === "complete");
  }

  // ─── records and export ───────────────────────────────────────────────────

  function saveRecord(response: OpenedDeposit) {
    if (!form) return;
    saveTextFile(
      `tessil-${response.reference}.txt`,
      buildReceiptText({
        kind: "received",
        locale: "en",
        portalTitle: form.title,
        reference: response.reference,
        at: new Date(response.createdAt),
        note: null,
        answers: (response.answers ?? []).map((a) => ({ label: a.label, value: answerText(a) })),
        files: response.files.map((f) => ({ name: f.name, size: formatSize(f.plainSize) })),
        deletedOn: new Date(response.expiresAt),
      }),
    );
  }

  let exporting = $state(false);
  // Responses whose answers did not load or open: they would pass for empty ones.
  const unreadAnswers = $derived(responses.filter((r) => r.answersUnreadable).length);
  let exportNote = $state<string | null>(null);

  /** Loads every older response. Throws when a page does not come. */
  async function loadAll() {
    while (nextCursor) {
      const before = nextCursor;
      await loadMore();
      if (nextCursor === before) throw new Error("Couldn't load every response. Try again.");
    }
  }

  // A summary of some responses would mislead, so it waits for all of them.
  async function showSummary() {
    view = "summary";
    if (!nextCursor || loadingAll) return;
    loadingAll = true;
    errorMessage = null;
    try {
      await loadAll();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't load every response.";
    } finally {
      loadingAll = false;
    }
  }

  function pick(question: QuestionSummary, value: string | boolean) {
    picked = {
      questionId: question.id,
      value,
      label: `${question.label}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : value}`,
    };
    view = "responses";
  }

  // Loads every older response first, so the file holds them all.
  async function exportCsv() {
    if (!form || exporting) return;
    exporting = true;
    errorMessage = null;
    try {
      await loadAll();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      const csv = answersCsv(
        form.questions,
        [...responses]
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((r) => ({ reference: r.reference, receivedAt: stamp(r.createdAt), answers: r.answers ?? [] })),
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tessil-${form.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "form"}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      exportNote =
        unreadAnswers > 0
          ? `${unreadAnswers} ${unreadAnswers === 1 ? "response has" : "responses have"} an empty row in this export, because the answers could not be opened. Reload the page and export again to retry.`
          : null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't make the export.";
    } finally {
      exporting = false;
    }
  }

  async function confirmDelete() {
    if (!form || !confirmDeleteId || isDeleting) return;
    isDeleting = true;
    try {
      await api.deleteDeposit(form.id, confirmDeleteId);
      responses = responses.filter((r) => r.id !== confirmDeleteId);
      if (openId === confirmDeleteId) openId = null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't delete this response.";
    } finally {
      confirmDeleteId = null;
      isDeleting = false;
    }
  }

  async function copyLink() {
    if (!form) return;
    try {
      await navigator.clipboard.writeText(form.link);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      errorMessage = "Couldn't copy the link.";
    }
  }

  const cols = $derived(
    hasFileQuestions
      ? "grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]"
      : "grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.8fr)]",
  );

  const shortFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  function daysLeft(iso: string): string {
    const days = daysUntil(iso);
    if (days <= 0) return "today";
    return days === 1 ? "in 1 day" : `in ${days} days`;
  }
</script>

<Seo title="{form?.title ?? 'Form'} - Tessil" robots="noindex" />

<PageLayout width="5xl">
  {#if phase !== "ready"}
    <BackLink href="/dashboard/forms" label="All forms" />
  {/if}

  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if phase === "locked"}
    <EmptyState title={auth.needsVaultSetup ? "This needs a vault" : "Your vault is locked"} level={1}>
      <p>The answers to this form are opened with a key kept in your vault.</p>
      {#snippet actions()}
        {#if auth.needsVaultSetup}
          <Button fullWidth={false} href="/setup/vault">Set up vault</Button>
        {:else}
          <Button fullWidth={false} onclick={() => unlockPrompt.request()}>Unlock vault</Button>
        {/if}
      {/snippet}
    </EmptyState>
  {:else if phase === "missing" || phase === "unreadable"}
    <EmptyState title={phase === "missing" ? "Form not found" : "This form can't be opened"} level={1}>
      <p>
        {phase === "missing"
          ? "It may have been deleted, or you may not have access to it."
          : "Its keys did not open with your vault."}
      </p>
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}
    </EmptyState>
  {:else if form}
    <PageHeader
      title={form.title}
      tagline={form.role === "member"
        ? "Shared with you. Responses are deleted automatically, so export or save what you need to keep."
        : "Responses are deleted automatically, so export or save what you need to keep."}
      back={{ href: "/dashboard/forms", label: "All forms" }}
      align="left"
    >
      {#snippet badge()}
        <Badge tone={form?.isDisabled || hasClosed(form?.closesAt) ? "muted" : "success"}>
          {form?.isDisabled ? "Switched off" : hasClosed(form?.closesAt) ? "Closed" : "Open"}
        </Badge>
      {/snippet}
      {#snippet actions()}
        {#if form?.role === "owner"}
          <Button variant="secondary" fullWidth={false} class="whitespace-nowrap" href="/dashboard/forms/{form.id}/settings">
            Edit form
          </Button>
          <Button variant="secondary" fullWidth={false} class="whitespace-nowrap" onclick={() => (sharingOpen = true)}>
            {sharingLabel}
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

      {#if exportNote}
        <Alert tone="warning" onClose={() => (exportNote = null)}>{exportNote}</Alert>
      {/if}

      {#if readyInvite}
        <Notice>
          {readyInvite.email} has signed in and is ready. Give them access to share this form.
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} onclick={() => (sharingOpen = true)}>Give access</Button>
          {/snippet}
        </Notice>
      {/if}

      {#if unreadable > 0}
        <Alert tone="warning">
          {unreadable}
          {unreadable === 1 ? "response" : "responses"} could not be opened with this form's key and
          {unreadable === 1 ? "is" : "are"} not shown.
        </Alert>
      {/if}

      {#if responses.length === 0}
        <EmptyState title="No responses yet">
          <p>Share the form's link. Answers appear here as soon as someone sends them.</p>
        </EmptyState>
      {:else}
        <Tabs
          label="View"
          value={view}
          onChange={(v) => (v === "summary" ? void showSummary() : (view = v))}
          tabs={[
            { value: "responses", label: "Responses" },
            { value: "summary", label: "Summary" },
          ]}
        />
      {/if}

      {#if responses.length > 0 && view === "summary"}
        {#if loadingAll}
          <p class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner aria-hidden="true" />
            Loading every response: {responses.length} so far…
          </p>
        {:else if nextCursor}
          <Alert tone="warning">
            Older responses are not loaded, so this counts the newest {responses.length} only.
          </Alert>
        {/if}
        {#if unreadAnswers > 0}
          <Alert tone="warning">
            The answers of {unreadAnswers}
            {unreadAnswers === 1 ? "response" : "responses"} could not be opened, so
            {unreadAnswers === 1 ? "it counts" : "they count"} as not answered here. Reload the page to try again.
          </Alert>
        {/if}
        <ResponseSummary {summaries} total={responses.length} onPick={pick} onOpen={(id) => (openId = id)} />
      {:else if responses.length > 0}
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchField
            bind:value={query}
            label="Search responses"
            placeholder="Search answers, reference or file name"
            class="sm:w-80"
          />
          <FilterChips
            label="Show"
            options={filters.map((f) => ({ value: f.id, label: f.label, count: counts[f.id] }))}
            value={filter}
            onChange={(v) => (filter = v)}
          />
          <Button
            variant="secondary"
            fullWidth={false}
            class="py-2 px-3 text-sm whitespace-nowrap sm:ml-auto"
            onclick={exportCsv}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        {#if picked}
          <div class="flex items-center gap-2 text-sm">
            <span class="shrink-0 text-muted-foreground">Answered</span>
            <span class="inline-flex min-w-0 items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-foreground">
              <span class="truncate">{picked.label}</span>
              <button
                type="button"
                aria-label="Show all responses again"
                onclick={() => (picked = null)}
                class="shrink-0 rounded-full p-1 text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:bg-accent hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <IconXRegular class="size-3.5" />
              </button>
            </span>
          </div>
        {/if}

        {#if visible.length === 0}
          <div class="rounded-lg bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing matches. Search looks at every answer, the reference and file names.
          </div>
        {:else}
          {#snippet who(row: (typeof rows)[number])}
            <div class="flex min-w-0 items-center gap-2 font-medium text-foreground {row.lead ? '' : 'font-mono'}">
              <span class="truncate">{row.lead ?? row.response.reference}</span>
              {#if row.isNew}
                <Badge tone="info" class="font-sans">New</Badge>
              {/if}
            </div>
            <div class="truncate text-xs text-muted-foreground">
              {#if row.lead}<span class="font-mono">{row.response.reference}</span>{/if}
              {#if row.lead && row.second}<span aria-hidden="true"> · </span>{/if}
              {row.second ?? ""}
              {#if row.response.answersUnreadable}
                <span class="text-warning-foreground">Answers could not be opened</span>
              {/if}
            </div>
          {/snippet}

          <Table.Root {cols} actions="sm">
            {#snippet header()}
              <div>Response</div>
              <div>Received</div>
              {#if hasFileQuestions}
                <div>Files</div>
              {/if}
              <div>Deleted</div>
            {/snippet}

            {#each visible as row (row.response.id)}
              {@const response = row.response}
              <Table.Row onclick={() => (openId = response.id)}>
                {#snippet cells()}
                  <div class="min-w-0">{@render who(row)}</div>
                  <div class="text-muted-foreground">{shortFmt.format(new Date(response.createdAt))}</div>
                  {#if hasFileQuestions}
                    <div class="text-muted-foreground">
                      {response.files.length > 0 ? `${response.files.length} · ${formatSize(response.totalBytes)}` : "None"}
                    </div>
                  {/if}
                  <div class={row.soon ? "text-destructive-foreground" : "text-muted-foreground"}>
                    {daysLeft(response.expiresAt)}
                  </div>
                {/snippet}

                {#snippet stacked()}
                  <div class="space-y-2">
                    <div class="min-w-0">{@render who(row)}</div>
                    <p class="text-xs text-muted-foreground">
                      {shortFmt.format(new Date(response.createdAt))}
                      {#if response.files.length > 0}
                        · {response.files.length}
                        {response.files.length === 1 ? "file" : "files"}
                      {/if}
                      ·
                      <span class={row.soon ? "text-destructive-foreground" : ""}>deleted {daysLeft(response.expiresAt)}</span>
                    </p>
                  </div>
                {/snippet}

                {#snippet actions()}
                  {#if response.files.length > 0}
                    <IconButton
                      label="Download the files of {response.reference}"
                      onclick={() => downloadAll(response)}
                      disabled={downloadingAll !== null}
                    >
                      {#if downloadingAll === response.id}
                        <Spinner class="size-4" aria-hidden="true" />
                      {:else if allSaved(response)}
                        <IconCheckRegular class="size-4 text-success-foreground" />
                      {:else}
                        <IconDownloadRegular class="size-4" />
                      {/if}
                    </IconButton>
                  {/if}
                  <IconButton label="Delete {response.reference}" tone="destructive" onclick={() => (confirmDeleteId = response.id)}>
                    <IconTrashRegular class="size-4" />
                  </IconButton>
                {/snippet}
              </Table.Row>
            {/each}
          </Table.Root>
        {/if}

        <p class="text-xs text-muted-foreground" role="status">
          Showing {visible.length} of {responses.length}
          {responses.length === 1 ? "response" : "responses"}{nextCursor
            ? ". Older ones are not loaded yet, so search does not cover them. The export does."
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

<ResponseDrawer
  open={openResponse !== null}
  response={openResponse}
  questions={form?.questions ?? []}
  {fileStates}
  busy={downloadingAll !== null}
  onClose={() => (openId = null)}
  onDownload={(fileId) => openResponse && download(openResponse, fileId)}
  onDownloadAll={() => openResponse && downloadAll(openResponse)}
  onSaveRecord={() => openResponse && saveRecord(openResponse)}
  onDelete={() => (confirmDeleteId = openId)}
/>

{#if auth.user && form?.role === "owner"}
  <PortalSharingDrawer
    open={sharingOpen}
    userId={auth.user.id}
    portalId={form.id}
    {sharing}
    onClose={() => (sharingOpen = false)}
    onChanged={reloadSharing}
    noun="form"
  />
{/if}

<Modal
  open={confirmDeleteId !== null}
  title="Delete this response?"
  description="Its answers and files are removed for everyone with access to this form. This can't be undone."
  onClose={() => (confirmDeleteId = null)}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (confirmDeleteId = null)} disabled={isDeleting}>
      Keep it
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmDelete} disabled={isDeleting}>
      {#if isDeleting}
        <Spinner aria-hidden="true" />
        Deleting…
      {:else}
        Delete response
      {/if}
    </Button>
  {/snippet}
</Modal>
