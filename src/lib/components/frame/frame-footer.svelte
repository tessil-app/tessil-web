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

<div 	bind:this={ref}
	data-slot="frame-panel-footer"
	class={cn("flex flex-col gap-1 px-5 py-4", className)}
	{...restProps}>
	{@render children?.()}
</div>