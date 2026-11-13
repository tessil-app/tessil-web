<script lang="ts">
  // One card inside a drawer: a group of related things under a small heading.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    title?: string;
    /** Text under the heading. */
    description?: string;
    /** Shown opposite the heading, e.g. a badge. */
    aside?: Snippet;
    tone?: "default" | "danger";
    children?: Snippet;
    class?: string;
  }

  let { title, description, aside, tone = "default", children, class: className }: Props = $props();
</script>

<section
  class={cn(
    "space-y-3 rounded-lg p-4",
    tone === "danger" ? "border border-destructive/30 bg-destructive/5" : "bg-card",
    className,
  )}
>
  {#if title || aside || description}
    <div class="space-y-1">
      {#if title || aside}
        <div class="flex items-center justify-between gap-3">
          {#if title}
            <h3 class="text-sm font-medium text-foreground">{title}</h3>
          {/if}
          {#if aside}
            {@render aside()}
          {/if}
        </div>
      {/if}
      {#if description}
        <p class="text-xs text-muted-foreground">{description}</p>
      {/if}
    </div>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</section>
