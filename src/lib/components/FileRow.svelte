<script lang="ts">
  import { cn } from "$lib/utils";
  import IconArrowsClockwiseRegular from "phosphor-icons-svelte/IconArrowsClockwiseRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconFileRegular from "phosphor-icons-svelte/IconFileRegular.svelte";
  import IconWarningRegular from "phosphor-icons-svelte/IconWarningRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";

  type Status = "idle" | "uploading" | "downloading" | "complete" | "error";
  type Kind = "upload" | "download";

  interface Props {
    name: string;
    size: string;
    status?: Status;
    kind?: Kind;
    percent?: number;
    /** Hide trailing action when this is the only row in a single-file download. */
    trailingHidden?: boolean;
    errorSub?: string;
    onRemove?: () => void;
    onDownload?: () => void;
    onRetry?: () => void;
    class?: string;
  }

  let {
    name,
    size,
    status = "idle",
    kind = "upload",
    percent = 0,
    trailingHidden = false,
    errorSub,
    onRemove,
    onDownload,
    onRetry,
    class: className,
  }: Props = $props();

  const isError = $derived(status === "error");
  const inProgress = $derived(status === "uploading" || status === "downloading");
  const showTrail = $derived(!(trailingHidden && status === "idle"));
</script>

<div
  class={cn(
    "flex items-start gap-3 py-3 px-1 not-last:border-b border-border/60",
    className
  )}
>
  <span
    class={cn(
      "shrink-0 inline-flex items-center justify-center size-7 text-muted-foreground",
      isError && "text-destructive-foreground"
    )}
  >
    {#if isError}
      <IconWarningRegular class="size-4" />
    {:else}
      <IconFileRegular class="size-4" />
    {/if}
  </span>

  <div class="flex-1 min-w-0 space-y-1">
    <div class="text-sm text-foreground font-medium truncate">{name}</div>
    <div class="text-xs text-muted-foreground tabular-nums">{size}</div>

    {#if inProgress}
      <div
        class="w-full bg-muted rounded-full h-1 overflow-hidden"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(percent)}
        aria-label={status === "uploading" ? `Uploading ${name}` : `Downloading ${name}`}
      >
        <div
          class="bg-info h-1 rounded-full transition-[width] duration-200 ease-out"
          style="width: {Math.min(Math.max(percent, 0), 100)}%"
        ></div>
      </div>
    {/if}

    {#if isError && errorSub}
      <div class="text-xs text-destructive-foreground">{errorSub}</div>
    {/if}
  </div>

  {#if showTrail}
    <span class="shrink-0 inline-flex items-center justify-center min-w-9 h-9">
      {#if status === "complete"}
        <span class="text-success-foreground inline-flex" aria-label="Done">
          <IconCheckRegular class="size-4" />
        </span>
      {:else if inProgress}
        <span class="text-xs tabular-nums text-muted-foreground">
          {Math.round(percent)}%
        </span>
      {:else if isError}
        <button
          type="button"
          onclick={onRetry}
          aria-label="Retry {name}"
          class="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <IconArrowsClockwiseRegular class="size-4" />
        </button>
      {:else if kind === "upload"}
        <button
          type="button"
          onclick={onRemove}
          aria-label="Remove {name}"
          class="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <IconXRegular class="size-4" />
        </button>
      {:else}
        <button
          type="button"
          onclick={onDownload}
          aria-label="Download {name}"
          class="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <IconDownloadRegular class="size-4" />
        </button>
      {/if}
    </span>
  {/if}
</div>
