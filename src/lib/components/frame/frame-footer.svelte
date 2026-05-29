<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="frame-footer"
  class={cn(
    "flex items-center gap-2 px-6 py-4 border-t border-border bg-muted/30",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
