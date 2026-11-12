<script lang="ts">
  // A portal's deposit page: what someone sees when they open a portal
  // link. No account. Files are encrypted here, to the portal's public
  // key, before anything is uploaded.

  import { page } from "$app/stores";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import * as Frame from "$lib/components/frame";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import {
    DEPOSIT_NOTE_MAX,
    DepositError,
    openPortalFromLink,
    sendDeposit,
    type OpenedPortal,
  } from "$lib/portal/deposit";
  import { formatSize } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import { onMount } from "svelte";

  type Phase = "loading" | "invalid" | "ready" | "sending" | "done";
  type RowStatus = "idle" | "uploading" | "complete" | "error";

  interface Row {
    file: File;
    status: RowStatus;
    percent: number;
  }

  let phase = $state<Phase>("loading");
  let portal = $state<OpenedPortal | null>(null);
  let invalidTitle = $state("This link doesn't work");
  let invalidMessage = $state("");

  let rows = $state<Row[]>([]);
  let note = $state("");
  let errorMessage = $state<string | null>(null);
  let controller: AbortController | null = null;

  const totalBytes = $derived(rows.reduce((sum, r) => sum + r.file.size, 0));
  const sentCount = $derived(rows.length);

  onMount(async () => {
    try {
      const result = await openPortalFromLink($page.params.id ?? "", window.location.hash);
      if (result.ok) {
        portal = result.portal;
        phase = "ready";
        return;
      }
      if (result.reason === "bad_link") {
        invalidMessage =
          "The link is incomplete. Ask the person who sent it to copy the whole link again, including everything after the # sign.";
      } else if (result.reason === "not_found") {
        invalidTitle = "This portal no longer exists";
        invalidMessage = "It may have been deleted. Ask the person who sent you the link for a new one.";
      } else {
        // Do not offer an upload: the key we were given cannot be trusted.
        invalidTitle = "This link can't be verified";
        invalidMessage =
          "What the server returned does not match this link, so nothing will be uploaded. Ask the person who sent it for a fresh link.";
      }
      phase = "invalid";
    } catch {
      invalidTitle = "Couldn't open this portal";
      invalidMessage = "Check your connection and reload the page.";
      phase = "invalid";
    }
  });

  function addFiles(files: File[]) {
    errorMessage = null;
    rows = [...rows, ...files.map((file) => ({ file, status: "idle" as RowStatus, percent: 0 }))];
  }

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
  }

  async function send() {
    if (!portal || rows.length === 0 || phase !== "ready") return;
    errorMessage = null;
    rows = rows.map((r) => ({ ...r, status: "idle", percent: 0 }));
    phase = "sending";
    controller = new AbortController();
    try {
      await sendDeposit(
        portal,
        rows.map((r) => r.file),
        note,
        {
          signal: controller.signal,
          onProgress: (index, status, percent) => {
            rows[index].status = status;
            rows[index].percent = percent;
          },
        },
      );
      phase = "done";
    } catch (err) {
      phase = "ready";
      if ((err as DOMException)?.name === "AbortError") return;
      errorMessage =
        err instanceof DepositError ? err.message : "The upload failed. Check your connection and try again.";
    } finally {
      controller = null;
    }
  }

  function sendMore() {
    rows = [];
    note = "";
    errorMessage = null;
    phase = "ready";
  }
</script>

<Seo title="Send files securely - Tessil" robots="noindex" />

<PageLayout width="2xl">
  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Opening portal…</p>
    </div>
  {:else if phase === "invalid"}
    <Frame.Root>
      <Frame.Panel>
        <div class="text-center space-y-3">
          <h1 class="text-xl font-semibold text-foreground">{invalidTitle}</h1>
          <p class="text-sm text-muted-foreground">{invalidMessage}</p>
        </div>
      </Frame.Panel>
    </Frame.Root>
  {:else if portal}
    <header class="mb-8 space-y-2">
      <p class="text-sm text-muted-foreground">Send files to</p>
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
        {portal.title}
      </h1>
    </header>

    {#if phase === "done"}
      <Frame.Root>
        <Frame.Panel>
          <div class="text-center space-y-3" role="status" aria-live="polite">
            <div
              class="mx-auto flex size-10 items-center justify-center rounded-full bg-success/15 text-success-foreground"
            >
              <IconCheckRegular class="size-5" />
            </div>
            <h2 class="text-lg font-medium text-foreground">
              {sentCount === 1 ? "Your file was sent" : `Your ${sentCount} files were sent`}
            </h2>
            <p class="text-sm text-muted-foreground">
              Only {portal.title} can open {sentCount === 1 ? "it" : "them"}. You can close this
              page.
            </p>
            <div class="flex justify-center pt-2">
              <Button variant="secondary" fullWidth={false} onclick={sendMore}>Send more files</Button>
            </div>
          </div>
        </Frame.Panel>
      </Frame.Root>
    {:else if !portal.accepting}
      <Frame.Root>
        <Frame.Panel>
          <div class="text-center space-y-3">
            <h2 class="text-lg font-medium text-foreground">Not accepting files right now</h2>
            <p class="text-sm text-muted-foreground">
              This portal has been switched off. Let {portal.title} know, and they can switch it
              back on.
            </p>
          </div>
        </Frame.Panel>
      </Frame.Root>
    {:else}
      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-5">
            <DropZone
              onFilesSelect={addFiles}
              disabled={phase === "sending"}
              compact={rows.length > 0}
              maxTotalSize={portal.maxTotalSize}
            />

            {#if rows.length > 0}
              <ul class="space-y-2">
                {#each rows as row, index (row.file)}
                  <li>
                    <FileRow
                      name={row.file.name}
                      size={formatSize(row.file.size)}
                      status={phase === "sending" && row.status === "idle" ? "uploading" : row.status}
                      kind="upload"
                      percent={row.percent}
                      onRemove={phase === "sending" ? undefined : () => removeRow(index)}
                    />
                  </li>
                {/each}
              </ul>
              <p class="text-xs text-muted-foreground">
                {rows.length} {rows.length === 1 ? "file" : "files"} · {formatSize(totalBytes)}
              </p>

              <Textarea
                id="deposit-note"
                label="Note (optional)"
                placeholder="Your name, or what these files are"
                rows={2}
                maxlength={DEPOSIT_NOTE_MAX}
                bind:value={note}
                disabled={phase === "sending"}
              />
            {/if}

            {#if errorMessage}
              <Alert tone="destructive">{errorMessage}</Alert>
            {/if}

            {#if phase === "sending"}
              <Button variant="secondary" onclick={() => controller?.abort()}>Cancel</Button>
            {:else}
              <Button onclick={send} disabled={rows.length === 0}>
                {rows.length > 1 ? `Send ${rows.length} files` : "Send"}
              </Button>
            {/if}
          </div>
        </Frame.Panel>
      </Frame.Root>

      <p class="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <IconLockRegular class="size-4 shrink-0" />
        <span>
          Your files are encrypted in this browser before they are uploaded. Only {portal.title}
          can open them. Tessil cannot, and neither can anyone else who sends files here.
          <a href="/security" class="underline underline-offset-2 hover:text-foreground">How this works</a>
        </span>
      </p>
    {/if}
  {/if}
</PageLayout>
