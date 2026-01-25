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

<header bind:this={ref}
	data-slot="frame-panel-header"
	class={cn("flex flex-col px-5 py-4", className)}
	{...restProps}>
	{@render children?.()}
</header>