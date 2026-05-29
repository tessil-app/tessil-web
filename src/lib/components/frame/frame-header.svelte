<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>, HTMLElement> = $props();
</script>

<header
  bind:this={ref}
  data-slot="frame-header"
  class={cn(
    "flex flex-col gap-1 px-6 py-4 border-b border-border",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</header>
