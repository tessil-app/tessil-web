<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    class?: string;
  }

  let {
    class: className,
    role = "status",
    "aria-label": ariaLabel = "Loading",
    ...rest
  }: Props = $props();
</script>

<div
  class={cn(
    "inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin",
    className
  )}
  {role}
  aria-label={ariaLabel}
  {...rest}
></div>
