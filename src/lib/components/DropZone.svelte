<script lang="ts">
  import { cn } from "$lib/utils";
  import { formatSize } from "$lib/utils";
  import IconUploadRegular from "phosphor-icons-svelte/IconUploadRegular.svelte";

  interface Props {
    onFilesSelect: (files: File[]) => void;
    disabled?: boolean;
    maxTotalSize?: number;
    compact?: boolean;
  }

  let { onFilesSelect, disabled = false, maxTotalSize, compact = false }: Props =
    $props();

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
  aria-label={compact ? "Add more files" : "Choose files to upload — opens file picker"}
  class={cn(
    "w-full border-2 border-dashed rounded-[calc(var(--radius-2xl)-1px)] transition-[border-color,background-color] duration-200 ease-out cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    compact ? "p-4" : "p-10",
    isDragging
      ? "border-primary bg-primary/10"
      : "border-border hover:border-muted-foreground",
    disabled && "opacity-50 cursor-not-allowed"
  )}
  {disabled}
>
  {#if compact}
    <div class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <IconUploadRegular class="size-4" />
      <span>Add more files</span>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-4 text-primary">
      <IconUploadRegular class="size-10" />
      <div class="text-center">
        <p class="text-lg font-medium text-foreground">
          Drop files here or click to browse
        </p>
        <p class="text-sm mt-1 text-muted-foreground">
          Maximum {maxTotalSize ? formatSize(maxTotalSize) : "1 GB"} total
        </p>
      </div>
    </div>
  {/if}
</button>
