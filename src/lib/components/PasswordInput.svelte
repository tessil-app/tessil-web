<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLInputAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLInputAttributes, "class" | "value" | "type"> {
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
    class: className,
    ...rest
  }: Props = $props();

  let show = $state(false);
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

  <div class="relative">
    <input
      {id}
      {required}
      type={show ? "text" : "password"}
      bind:value
      class="w-full py-2.5 px-3 pr-10 bg-card border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground placeholder-muted-foreground focus:border-ring/25 focus:outline-none disabled:opacity-50"
      {...rest}
    />
    <button
      type="button"
      onclick={() => (show = !show)}
      aria-label={show ? "Hide password" : "Show password"}
      class="hover:cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      {#if show}
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      {:else}
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      {/if}
    </button>
  </div>

  {#if error}
    <p class="text-xs text-destructive-foreground">{error}</p>
  {/if}
</div>
