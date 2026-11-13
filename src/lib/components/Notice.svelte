<script lang="ts">
  // A calm, standing message with at most one thing to do about it, such
  // as "your vault is locked". For errors and results use Alert.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    action?: Snippet;
    class?: string;
  }

  let { children, action, class: className }: Props = $props();
</script>

<div
  class={cn(
    "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-card p-4",
    className,
  )}
>
  <p class="text-sm text-muted-foreground">{@render children()}</p>
  {#if action}
    <div class="sm:shrink-0">{@render action()}</div>
  {/if}
</div>
