<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";

  type SplitMode = "range" | "all-pages";

  const splitOptions: { label: string; value: SplitMode }[] = [
    { label: "Extract page range", value: "range" },
    { label: "Every page (many PDFs)", value: "all-pages" },
  ];

  let {
    selectedFiles,
    splitMode,
    pageRange,
    isProcessing = false,
    onSplitModeChange,
    onPageRangeChange,
    onFilesSelected,
    onRemoveFile,
    onProcess,
    onClear,
    formatSize,
  }: {
    selectedFiles: File[];
    splitMode: SplitMode;
    pageRange: string;
    isProcessing?: boolean;
    onSplitModeChange: (mode: SplitMode) => void;
    onPageRangeChange: (value: string) => void;
    onFilesSelected: (files: FileList) => void;
    onRemoveFile: (index: number) => void;
    onProcess: () => void;
    onClear: () => void;
    formatSize: (bytes: number) => string;
  } = $props();

  let isDragging = $state(false);

  function handleInputChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    if (!target.files) return;
    onFilesSelected(target.files);
    target.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (!event.dataTransfer?.files?.length) return;
    onFilesSelected(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }
</script>

<div class="mb-4">
  <label for="split-mode" class="block text-sm text-muted-foreground mb-2">Split mode</label>
  <select
    id="split-mode"
    value={splitMode}
    onchange={(event) =>
      onSplitModeChange((event.currentTarget as HTMLSelectElement).value as SplitMode)}
    class="w-full py-2 px-3 bg-secondary border border-input rounded-[calc(var(--radius-2xl)-1px)] text-secondary-foreground hover:bg-accent transition-colors hover:cursor-pointer"
  >
    {#each splitOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>

{#if splitMode === "range"}
  <div class="mb-4">
    <div class="mb-2 flex items-center gap-2">
      <label for="split-page-range" class="block text-sm text-muted-foreground">Pages</label>
      <Tooltip.Provider delayDuration={0} skipDelayDuration={0} disableHoverableContent>
        <Tooltip.Root>
          <Tooltip.Trigger
            class="tooltip-help-trigger w-5 h-5 rounded-full border border-input bg-secondary text-secondary-foreground text-xs hover:cursor-help"
            aria-label="Page range help"
          >
            ?
          </Tooltip.Trigger>
          <Tooltip.Content side="top" class="max-w-72 leading-relaxed">
            1-3,5 means pages 1, 2, 3 and 5 will be included in the output.
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
    <input
      id="split-page-range"
      value={pageRange}
      oninput={(event) => onPageRangeChange((event.currentTarget as HTMLInputElement).value)}
      placeholder="1-3,5,8-10"
      class="w-full py-2 px-3 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:border-ring/25 focus:outline-none"
    />
    <p class="mt-2 text-xs text-muted-foreground">Example: <code>1-3,5,8-10</code></p>
  </div>
{/if}

<label
  for="split-upload"
  class="w-full p-12 border-2 border-dashed rounded-[calc(var(--radius-2xl)-1px)] transition-[border-color,background-color] duration-200 ease-out cursor-pointer block text-center
    {isDragging
    ? 'border-primary bg-primary/10'
    : 'border-border hover:border-muted-foreground'}"
  ondragover={handleDragOver}
  ondrop={handleDrop}
  ondragleave={handleDragLeave}
>
  <input
    id="split-upload"
    type="file"
    accept="application/pdf,.pdf"
    class="hidden"
    onchange={handleInputChange}
  />
  <div class="flex flex-col items-center gap-4 text-primary">
    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
    <div>
      <p class="text-lg font-medium text-foreground">Drop PDF here or click to browse</p>
      <p class="text-sm mt-1 text-muted-foreground">1 PDF at a time</p>
    </div>
  </div>
</label>

{#if selectedFiles.length > 0}
  <div class="space-y-3 pt-4">
    <p class="text-sm font-medium text-foreground">
      {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
    </p>

    <ul class="flex flex-col gap-1.5">
      {#each selectedFiles as file, index}
        <li class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <div
            class="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
            aria-hidden="true"
          >
            PDF
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground" title={file.name}>
              {file.name}
            </p>
            <p class="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>

          <button
            type="button"
            onclick={() => onRemoveFile(index)}
            class="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive hover:cursor-pointer"
            aria-label="Remove {file.name}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>

    <div class="flex flex-wrap gap-3 pt-1">
      <button
        type="button"
        onclick={onProcess}
        disabled={isProcessing || selectedFiles.length === 0}
        class="hover:cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-[calc(var(--radius-2xl)-1px)] disabled:bg-muted disabled:cursor-not-allowed transition-colors"
      >
        {#if isProcessing}
          Processing...
        {:else}
          Split PDF
        {/if}
      </button>
      <button
        type="button"
        onclick={onClear}
        class="hover:cursor-pointer px-4 py-2 bg-secondary text-secondary-foreground rounded-[calc(var(--radius-2xl)-1px)] hover:bg-accent transition-colors"
      >
        Clear all
      </button>
    </div>
  </div>
{/if}
