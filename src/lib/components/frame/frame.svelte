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
  data-slot="frame"
  class={cn(
    "relative flex flex-col rounded-lg bg-card border border-border overflow-hidden",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
