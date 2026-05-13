<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLInputAttributes, "type" | "class" | "checked"> {
    checked?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    checked = $bindable(false),
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<label
  class={cn(
    "inline-flex items-center gap-3 cursor-pointer select-none text-sm text-foreground",
    className
  )}
>
  <input
    type="checkbox"
    bind:checked
    class="size-4 rounded border-input bg-card text-primary accent-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
    {...rest}
  />
  <span>{@render children()}</span>
</label>
