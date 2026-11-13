<script lang="ts">
  // Label and value pairs, labels in a narrow left column.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    /** DetailItem elements. */
    children: Snippet;
    class?: string;
  }

  let { children, class: className }: Props = $props();
</script>

<dl class={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-y-2 gap-x-4 text-sm", className)}>
  {@render children()}
</dl>
