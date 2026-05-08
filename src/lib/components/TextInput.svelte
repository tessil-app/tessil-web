<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLInputAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLInputAttributes, "class" | "value"> {
    value?: string;
    label?: string;
    required?: boolean;
    error?: string;
    class?: string;
    inputClass?: string;
  }

  let {
    value = $bindable(""),
    label,
    required = false,
    error,
    id,
    class: className,
    inputClass,
    ...rest
  }: Props = $props();

  const fieldClass =
    "w-full py-2.5 px-3 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:border-ring/25 focus:outline-none disabled:opacity-50";
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

  <input
    {id}
    {required}
    bind:value
    class={cn(fieldClass, inputClass)}
    {...rest}
  />

  {#if error}
    <p class="text-xs text-destructive-foreground">{error}</p>
  {/if}
</div>
