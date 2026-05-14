<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<dl class={cn("flex flex-wrap gap-y-2.5 gap-x-10 px-1 mb-8", className)}>
  {@render children()}
</dl>
