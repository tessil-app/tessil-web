<script lang="ts">
  // A native select, styled like TextInput. For a short fixed list where a
  // row of radio buttons would not fit.

  import { cn } from "$lib/utils";
  import type { HTMLSelectAttributes } from "svelte/elements";

  interface Option {
    value: string;
    label: string;
  }

  interface Props extends Omit<HTMLSelectAttributes, "class" | "value"> {
    value?: string;
    label?: string;
    options: Option[];
    class?: string;
  }

  let { value = $bindable(""), label, options, id, class: className, ...rest }: Props = $props();
</script>

<div class={cn("space-y-1", className)}>
  {#if label}
    <label for={id} class="block text-sm font-medium text-foreground">{label}</label>
  {/if}
  <div class="relative">
    <select
      {id}
      bind:value
      class="w-full appearance-none py-[9px] pl-3 pr-9 text-base sm:text-sm bg-card border border-input rounded-md text-foreground cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed"
      {...rest}
    >
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <svg
      class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</div>
