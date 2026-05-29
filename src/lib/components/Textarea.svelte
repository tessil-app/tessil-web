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

  const errorId = $derived(id ? `${id}-error` : undefined);
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
    aria-invalid={error ? true : undefined}
    aria-describedby={error ? errorId : undefined}
    class="w-full py-2.5 px-3 bg-card border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 resize-vertical"
    {...rest}
  ></textarea>

  {#if error}
    <p id={errorId} role="alert" class="text-xs text-destructive-foreground">
      {error}
    </p>
  {/if}
</div>
