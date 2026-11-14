<script lang="ts">
  // Content that belongs to a switch: slides open instead of popping in,
  // so the page below does not jump. Hidden content cannot be reached.

  import type { Snippet } from "svelte";

  interface Props {
    open: boolean;
    children: Snippet;
  }

  let { open, children }: Props = $props();
</script>

<!-- The side margin leaves room for a focus ring inside the clipped area. -->
<div
  class="-mx-1 grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
  style:grid-template-rows={open ? "1fr" : "0fr"}
  inert={!open}
>
  <div class="overflow-hidden">
    <div class="px-1 pt-3 pb-1">
      {@render children()}
    </div>
  </div>
</div>
