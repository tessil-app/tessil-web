<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import Wordmark from "$lib/components/brand/Wordmark.svelte";

  interface Props {
    title: string;
    tagline?: string;
    /** Wordmark href. Pass `null` to render the mark without a link (recipient surfaces). */
    wordmarkHref?: string | null;
    align?: "center" | "left";
    actions?: Snippet;
    class?: string;
  }

  let {
    title,
    tagline,
    wordmarkHref = "/",
    align = "center",
    actions,
    class: className,
  }: Props = $props();

  const isCenter = $derived(align === "center");
</script>

<header
  class={cn(
    "mb-12",
    isCenter ? "text-center" : "flex items-end justify-between gap-4",
    className
  )}
>
  <div class={cn(isCenter ? "flex flex-col items-center gap-3" : "flex flex-col gap-2")}>
    {#if wordmarkHref !== null}
      <a
        href={wordmarkHref}
        class="inline-flex text-sm hover:opacity-80 transition-opacity duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        aria-label="Tessil — home"
      >
        <Wordmark layout="horizontal" markSize={20} />
      </a>
    {:else}
      <span class="inline-flex text-sm">
        <Wordmark layout="horizontal" markSize={20} />
      </span>
    {/if}

    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
      {title}
    </h1>

    {#if tagline}
      <p class={cn("text-muted-foreground", isCenter ? "max-w-xl text-balance" : "")}>
        {tagline}
      </p>
    {/if}
  </div>

  {#if actions}
    <div class="flex items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</header>
