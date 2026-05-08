<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    width?: "2xl" | "3xl";
    class?: string;
    children: Snippet;
  }

  let { width = "2xl", class: className, children }: Props = $props();

  const widthClass = $derived(width === "3xl" ? "max-w-3xl" : "max-w-2xl");
</script>

<div class="min-h-screen bg-background text-foreground">
  <div class={cn(widthClass, "mx-auto px-4 py-12", className)}>
    {@render children()}
  </div>
</div>
