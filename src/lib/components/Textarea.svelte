<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLTextareaAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLTextareaAttributes, "class" | "value"> {
    value?: string;
    label?: string;
    required?: boolean;
    error?: string;
    class?: string;
  }

  let {
    value = $bindable(""),
    label,
    required = false,
    error,
    id,
    rows = 4,
    class: className,
    ...rest
  }: Props = $props();
</script>

<div class={cn("space-y-1", className)}>
  {#if label}
    <label
      for={id}
      class="block text-sm font-medium text-foreground"
    >
      {label}
      {#if required}
        <span class="text-destructive-foreground">*</span>
      {/if}
    </label>
  {/if}

  <textarea
    {id}
    {rows}
    {required}
    bind:value
    class="w-full py-2.5 px-3 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:border-ring/25 focus:outline-none disabled:opacity-50 resize-vertical"
    {...rest}
  ></textarea>

  {#if error}
    <p class="text-xs text-destructive-foreground">{error}</p>
  {/if}
</div>
