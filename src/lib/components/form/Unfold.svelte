<script lang="ts">
  // Opens smoothly, closes at once. The instant close lets the form editor
  // keep the question you clicked still on the screen. Elsewhere use Reveal.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let { open, children }: { open: boolean; children: Snippet } = $props();
</script>

<div
  class={cn("grid", open && "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none")}
  style:grid-template-rows={open ? "1fr" : "0fr"}
  inert={!open}
>
  <div class="-mx-1 overflow-hidden px-1">
    {@render children()}
  </div>
</div>
