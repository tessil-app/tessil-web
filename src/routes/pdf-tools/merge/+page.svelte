<script lang="ts">
  import { onDestroy } from "svelte";
  import * as Frame from "$lib/components/frame";
  import MergeTool from "$lib/features/pdf-tools/merge/MergeTool.svelte";
  import {
    MAX_MERGE_FILES,
    applyActionMode,
    createOutputItems,
    formatSize,
    isPdfFile,
    mergePdfFiles,
    revokeOutputItems,
    type ActionMode,
    type OutputItem,
  } from "$lib/features/pdf-tools/shared/pdfProcessing";

  const SITE_URL = "https://jtransfer.jimmyverburgt.com";
  const PAGE_URL = `${SITE_URL}/pdf-tools/merge`;
  const PAGE_TITLE = "Merge PDFs - JTransfer";
  const PAGE_DESCRIPTION =
    "Merge multiple PDFs locally in your browser on JTransfer. Reorder files with drag and drop, then export instantly.";

  const actionOptions: { label: string; value: ActionMode }[] = [
    { label: "Process (show downloads)", value: "show" },
    { label: "Process + Download", value: "download" },
    { label: "Process + Download ZIP", value: "zip" },
  ];

  let selectedFiles = $state<File[]>([]);
  let outputs = $state<OutputItem[]>([]);
  let actionMode = $state<ActionMode>("show");
  let isProcessing = $state(false);
  let error = $state<string | null>(null);
  let warning = $state<string | null>(null);

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
  };

  function handleFiles(fileList: FileList) {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const unsupported = incoming.find((file) => !isPdfFile(file));
    if (unsupported) {
      error = `Only PDF files are supported. Unsupported: ${unsupported.name}`;
      return;
    }

    const shouldReset = outputs.length > 0;
    let nextFiles = shouldReset ? [] : [...selectedFiles];
    nextFiles = [...nextFiles, ...incoming];

    if (nextFiles.length > MAX_MERGE_FILES) {
      error = `You can merge up to ${MAX_MERGE_FILES} PDFs at once.`;
      return;
    }

    if (shouldReset) {
      revokeOutputItems(outputs);
      outputs = [];
    }

    selectedFiles = nextFiles;
    error = null;
    warning = null;
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, currentIndex) => currentIndex !== index);
    error = null;
    warning = null;
  }

  function reorderFiles(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= selectedFiles.length || toIndex >= selectedFiles.length) return;

    const nextFiles = [...selectedFiles];
    const [movedFile] = nextFiles.splice(fromIndex, 1);
    if (!movedFile) return;
    nextFiles.splice(toIndex, 0, movedFile);
    selectedFiles = nextFiles;
    error = null;
    warning = null;
  }

  function clearAll() {
    selectedFiles = [];
    error = null;
    warning = null;
    revokeOutputItems(outputs);
    outputs = [];
  }

  async function processMerge() {
    if (selectedFiles.length < 2 || isProcessing) {
      if (!isProcessing) {
        error = "Select at least 2 PDFs to merge.";
      }
      return;
    }

    isProcessing = true;
    error = null;
    warning = null;
    revokeOutputItems(outputs);
    outputs = [];

    try {
      const processedFiles = await mergePdfFiles(selectedFiles);
      outputs = createOutputItems(processedFiles);
      const result = await applyActionMode(processedFiles, actionMode);
      warning = result.warning;
    } catch (err) {
      error = err instanceof Error ? err.message : "Merge failed.";
    } finally {
      isProcessing = false;
    }
  }

  onDestroy(() => {
    revokeOutputItems(outputs);
  });
</script>

<svelte:head>
  <title>{PAGE_TITLE}</title>
  <meta name="description" content={PAGE_DESCRIPTION} />
  <meta
    name="robots"
    content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  />
  <meta property="og:title" content={PAGE_TITLE} />
  <meta property="og:description" content={PAGE_DESCRIPTION} />
  <meta property="og:url" content={PAGE_URL} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={PAGE_TITLE} />
  <meta name="twitter:description" content={PAGE_DESCRIPTION} />
  <script type="application/ld+json">
    {JSON.stringify(schema)}
  </script>
</svelte:head>

<div class="min-h-screen">
  <div class="max-w-5xl mx-auto px-4 py-10">
    <div class="mb-8">
      <a
        href="/pdf-tools"
        class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >← All PDF tools</a
      >
      <h1 class="mt-3 text-4xl font-bold tracking-tight">Merge PDFs</h1>
      <p class="mt-2 text-muted-foreground max-w-2xl">
        Add files, drag to reorder, and export the merged result. Processing stays local.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
      <Frame.Root>
        <Frame.Panel>
          <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <label for="action" class="text-muted-foreground">Action</label>
            <select
              id="action"
              bind:value={actionMode}
              class="py-2 px-3 bg-secondary border border-input rounded-[calc(var(--radius-2xl)-1px)] text-secondary-foreground hover:bg-accent transition-colors hover:cursor-pointer"
            >
              {#each actionOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <MergeTool
            {selectedFiles}
            {isProcessing}
            maxFiles={MAX_MERGE_FILES}
            onFilesSelected={handleFiles}
            onRemoveFile={removeFile}
            onReorderFiles={reorderFiles}
            onProcess={processMerge}
            onClear={clearAll}
            {formatSize}
          />

          {#if warning}
            <div
              class="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-[calc(var(--radius-2xl)-1px)] text-sm text-warning-foreground"
            >
              {warning}
            </div>
          {/if}

          {#if error}
            <div
              class="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-[calc(var(--radius-2xl)-1px)] text-sm text-destructive-foreground"
            >
              {error}
            </div>
          {/if}

          {#if outputs.length > 0}
            <div class="mt-6 space-y-3">
              <h2 class="text-sm font-medium">Processed files</h2>
              <ul class="space-y-2 text-sm">
                {#each outputs as output}
                  <li class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-col">
                      <span class="text-foreground">{output.name}</span>
                      <span class="text-muted-foreground text-xs">{formatSize(output.size)}</span>
                    </div>
                    <a
                      href={output.url}
                      download={output.name}
                      class="text-primary hover:text-primary/80 transition-colors"
                    >
                      Download
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </Frame.Panel>
      </Frame.Root>

      <Frame.Root>
        <Frame.Panel>
          <h2 class="text-base font-semibold text-foreground">Merge Notes</h2>
          <ul class="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>Drag cards to set final page order by file.</li>
            <li>Upload more files before processing to extend the merge list.</li>
            <li>After a completed merge, a new upload starts a fresh batch.</li>
            <li>Nothing is uploaded to JTransfer servers for PDF processing.</li>
          </ul>
        </Frame.Panel>
      </Frame.Root>
    </div>
  </div>
</div>
