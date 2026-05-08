<script lang="ts">
  import Spinner from "$lib/components/Spinner.svelte";
  import type { FileUploadState } from "$lib/stores/upload.types";
  import { formatSize } from "$lib/utils";

  interface Props {
    files: FileUploadState[];
    onRemove: (index: number) => void;
    disabled?: boolean;
  }

  let { files, onRemove, disabled = false }: Props = $props();
</script>

<div class="space-y-2">
  {#each files as fileState, index}
    <div
      class="flex items-center gap-3 p-3 bg-card rounded-[calc(var(--radius-2xl)-1px)] border border-border"
    >
      <!-- Status indicator -->
      <div class="shrink-0 w-8 h-8 flex items-center justify-center">
        {#if fileState.status === "complete"}
          <svg
            class="w-5 h-5 text-success-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        {:else if fileState.status === "error"}
          <svg
            class="w-5 h-5 text-destructive-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        {:else if fileState.status === "encrypting" || fileState.status === "uploading"}
          <Spinner class="text-info" />
        {:else}
          <svg
            class="w-5 h-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        {/if}
      </div>

      <!-- File info -->
      <div class="flex-1 min-w-0">
        <p class="text-foreground text-sm font-medium truncate">
          {fileState.file.name}
        </p>
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatSize(fileState.file.size)}</span>
          {#if fileState.status === "encrypting"}
            <span class="text-info-foreground"
              >Encrypting... {Math.round(fileState.progress)}%</span
            >
          {:else if fileState.status === "uploading"}
            <span class="text-info-foreground"
              >Uploading... {Math.round(fileState.progress)}%</span
            >
          {:else if fileState.status === "error"}
            <span class="text-destructive-foreground"
              >{fileState.error || "Failed"}</span
            >
          {:else if fileState.status === "complete"}
            <span class="text-success-foreground">Done</span>
          {/if}
        </div>
        {#if fileState.status === "encrypting" || fileState.status === "uploading"}
          <div class="mt-1 w-full bg-muted rounded-full h-1">
            <div
              class="bg-info h-1 rounded-full transition-[width] duration-200 ease-out"
              style="width: {fileState.progress}%"
            ></div>
          </div>
        {/if}
      </div>

      <!-- Remove button -->
      {#if !disabled && fileState.status === "pending"}
        <button
          type="button"
          onclick={() => onRemove(index)}
          class="hover:cursor-pointer shrink-0 p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
          aria-label="Remove file"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      {/if}
    </div>
  {/each}
</div>
