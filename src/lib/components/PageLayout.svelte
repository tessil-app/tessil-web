<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    width?: "2xl" | "3xl" | "5xl";
    class?: string;
    children: Snippet;
  }

  let { width = "2xl", class: className, children }: Props = $props();

  // 5xl matches the site header so dashboard-style surfaces line up with
  // the top nav. 2xl/3xl stay the default for marketing + form pages.
  const widthClass = $derived(
    width === "5xl" ? "max-w-5xl" : width === "3xl" ? "max-w-3xl" : "max-w-2xl",
  );
</script>

<div class="bg-background text-foreground">
  <div class={cn(widthClass, "mx-auto px-4 py-16", className)}>
    {@render children()}
  </div>
</div>
