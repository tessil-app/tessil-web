<script lang="ts">
  let {
    selectedFiles,
    isProcessing = false,
    maxFiles = 10,
    onFilesSelected,
    onRemoveFile,
    onReorderFiles,
    onProcess,
    onClear,
    formatSize,
  }: {
    selectedFiles: File[];
    isProcessing?: boolean;
    maxFiles?: number;
    onFilesSelected: (files: FileList) => void;
    onRemoveFile: (index: number) => void;
    onReorderFiles: (fromIndex: number, toIndex: number) => void;
    onProcess: () => void;
    onClear: () => void;
    formatSize: (bytes: number) => string;
  } = $props();

  let isUploadDragging = $state(false);
  let dragFromIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  const fileIds = new WeakMap<File, string>();
  let nextFileId = 0;

  function getFileId(file: File) {
    const existing = fileIds.get(file);
    if (existing) return existing;
    const id = `pdf-${nextFileId++}`;
    fileIds.set(file, id);
    return id;
  }

  function handleInputChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    if (!target.files) return;
    onFilesSelected(target.files);
    target.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isUploadDragging = false;
    if (!event.dataTransfer?.files?.length) return;
    onFilesSelected(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isUploadDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isUploadDragging = false;
  }

  function handleRowDragStart(index: number, event: DragEvent) {
    if (selectedFiles.length < 2) return;
    dragFromIndex = index;
    dragOverIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  }

  function handleRowDragOver(index: number, event: DragEvent) {
    if (dragFromIndex === null || dragFromIndex === index) return;
    event.preventDefault();
    dragOverIndex = index;
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function handleRowDrop(index: number, event: DragEvent) {
    event.preventDefault();
    if (dragFromIndex === null || dragFromIndex === index) {
      dragFromIndex = null;
      dragOverIndex = null;
      return;
    }
    onReorderFiles(dragFromIndex, index);
    dragFromIndex = null;
    dragOverIndex = null;
  }

  function handleRowDragEnd() {
    dragFromIndex = null;
    dragOverIndex = null;
  }
</script>

<label
  for="merge-upload"
  class="w-full p-12 border-2 border-dashed rounded-[calc(var(--radius-2xl)-1px)] transition-[border-color,background-color] duration-200 ease-out cursor-pointer block text-center
    {isUploadDragging
    ? 'border-primary bg-primary/10'
    : 'border-border hover:border-muted-foreground'}"
  ondragover={handleDragOver}
  ondrop={handleDrop}
  ondragleave={handleDragLeave}
>
  <input
    id="merge-upload"
    type="file"
    multiple
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
      <p class="text-lg font-medium text-foreground">Drop PDFs here or click to browse</p>
      <p class="text-sm mt-1 text-muted-foreground">Up to {maxFiles} PDFs per merge</p>
    </div>
  </div>
</label>

{#if selectedFiles.length > 0}
  <div class="space-y-3 pt-4">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-foreground">
        {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
      </p>
      {#if selectedFiles.length > 1}
        <p class="text-xs text-muted-foreground">Drag to reorder</p>
      {/if}
    </div>

    <ul class="flex flex-col gap-1.5">
      {#each selectedFiles as file, index (getFileId(file))}
        <li
          class="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-[border-color,background-color] duration-150 ease-out
            {dragOverIndex === index && dragFromIndex !== index
              ? 'border-primary bg-primary/5'
              : 'border-border'}
            {selectedFiles.length > 1 && !isProcessing ? 'cursor-grab active:cursor-grabbing' : ''}"
          draggable={selectedFiles.length > 1 && !isProcessing}
          ondragstart={(e) => handleRowDragStart(index, e)}
          ondragover={(e) => handleRowDragOver(index, e)}
          ondrop={(e) => handleRowDrop(index, e)}
          ondragend={handleRowDragEnd}
        >
          <!-- Drag handle / order number -->
          <div class="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            {#if selectedFiles.length > 1}
              <svg
                class="w-3.5 h-3.5 opacity-40"
                viewBox="0 0 10 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="3" cy="2.5" r="1.5" />
                <circle cx="7" cy="2.5" r="1.5" />
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="7" cy="8" r="1.5" />
                <circle cx="3" cy="13.5" r="1.5" />
                <circle cx="7" cy="13.5" r="1.5" />
              </svg>
            {/if}
            <span class="w-4 text-center text-xs tabular-nums">{index + 1}</span>
          </div>

          <!-- PDF badge -->
          <div
            class="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
            aria-hidden="true"
          >
            PDF
          </div>

          <!-- File info -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground" title={file.name}>
              {file.name}
            </p>
            <p class="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>

          <!-- Remove -->
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
        disabled={isProcessing || selectedFiles.length < 2}
        class="hover:cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-[calc(var(--radius-2xl)-1px)] disabled:bg-muted disabled:cursor-not-allowed transition-colors"
      >
        {#if isProcessing}
          Processing...
        {:else}
          Merge {selectedFiles.length} {selectedFiles.length === 1 ? "PDF" : "PDFs"}
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
