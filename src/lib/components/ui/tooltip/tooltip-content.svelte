<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    children,
    class: className,
    ref = $bindable(null),
    showArrow = false,
    sideOffset = 4,
    side = "top",
    ...restProps
  }: TooltipPrimitive.ContentProps & {
    showArrow?: boolean;
  } = $props();
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    bind:ref
    data-slot="tooltip-content"
    {sideOffset}
    {side}
    class={cn(
      "relative z-50 max-w-70 origin-(--bits-tooltip-content-transform-origin) text-balance rounded-md border bg-popover bg-clip-padding px-3 py-1.5 text-popover-foreground text-xs shadow-md/5 transform-gpu will-change-[transform,opacity] transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:duration-120 data-[state=closed]:duration-80 data-[state=closed]:opacity-0 data-[state=closed]:scale-[0.97] data-[state=closed]:pointer-events-none data-[instant]:duration-0 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    {#if showArrow}
      <TooltipPrimitive.Arrow
        class="text-popover -my-px drop-shadow-[0_1px_0_--theme(--color-black/8%)] dark:drop-shadow-[0_-1px_0_--theme(--color-white/10%)]"
      />
    {/if}
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
