<script lang="ts">
  interface Props {
    onFilesSelect: (files: File[]) => void;
    disabled?: boolean;
    maxTotalSize?: number;
  }

  let { onFilesSelect, disabled = false, maxTotalSize }: Props = $props();

  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onFilesSelect(Array.from(files));
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) {
      isDragging = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleClick() {
    if (!disabled) {
      fileInput.click();
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      onFilesSelect(Array.from(input.files));
      input.value = "";
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
</script>

<input
  bind:this={fileInput}
  type="file"
  multiple
  class="hidden"
  onchange={handleFileChange}
  {disabled}
/>

<button
  type="button"
  onclick={handleClick}
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  class="not-last:mb-4 w-full p-12 border-2 border-dashed rounded-[calc(var(--radius-2xl)-1px)] transition-[border-color,background-color] duration-200 ease-out cursor-pointer
		{isDragging
    ? 'border-primary bg-primary/10'
    : 'border-border hover:border-muted-foreground'}
		{disabled ? 'opacity-50 cursor-not-allowed' : ''}"
  {disabled}
>
  <div class="flex flex-col items-center gap-4 text-primary">
    <svg
      class="w-12 h-12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
    <div class="text-center">
      <p class="text-lg font-medium text-foreground">
        Drop files here or click to browse
      </p>
      <p class="text-sm mt-1">
        Maximum {maxTotalSize ? formatSize(maxTotalSize) : "1 GB"} total
      </p>
    </div>
  </div>
</button>
