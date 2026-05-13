<script lang="ts">
  import { cn } from "$lib/utils";
  import IconEyeRegular from "phosphor-icons-svelte/IconEyeRegular.svelte";
  import IconEyeSlashRegular from "phosphor-icons-svelte/IconEyeSlashRegular.svelte";
  import type { HTMLInputAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLInputAttributes, "class" | "value" | "type"> {
    value?: string;
    label?: string;
    srOnlyLabel?: boolean;
    required?: boolean;
    error?: string;
    class?: string;
  }

  let {
    value = $bindable(""),
    label,
    srOnlyLabel = false,
    required = false,
    error,
    id,
    class: className,
    ...rest
  }: Props = $props();

  let show = $state(false);
  const errorId = $derived(id ? `${id}-error` : undefined);
</script>

<div class={cn("space-y-1", className)}>
  {#if label}
    <label
      for={id}
      class={cn(
        "block text-sm font-medium text-foreground",
        srOnlyLabel && "sr-only"
      )}
    >
      {label}
      {#if required}
        <span class="text-destructive-foreground">*</span>
      {/if}
    </label>
  {/if}

  <div class="relative">
    <input
      {id}
      {required}
      type={show ? "text" : "password"}
      bind:value
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      class="w-full py-2.5 px-3 pr-12 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      {...rest}
    />
    <button
      type="button"
      onclick={() => (show = !show)}
      aria-label={show ? "Hide password" : "Show password"}
      aria-pressed={show}
      class="hover:cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground rounded-md focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {#if show}
        <IconEyeSlashRegular class="size-5" />
      {:else}
        <IconEyeRegular class="size-5" />
      {/if}
    </button>
  </div>

  {#if error}
    <p id={errorId} role="alert" class="text-xs text-destructive-foreground">
      {error}
    </p>
  {/if}
</div>
