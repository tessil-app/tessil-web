<script lang="ts" generics="T extends string">
  // Pick one of a few views of a list. Counts are optional.

  import { cn } from "$lib/utils";

  interface Option {
    value: T;
    label: string;
    count?: number;
  }

  interface Props {
    /** Accessible name of the group. */
    label: string;
    options: Option[];
    value: T;
    onChange: (value: T) => void;
    class?: string;
  }

  let { label, options, value, onChange, class: className }: Props = $props();
</script>

<div class={cn("flex flex-wrap gap-2", className)} role="group" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={value === option.value}
      onclick={() => onChange(option.value)}
      class={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        value === option.value
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:bg-accent",
      )}
    >
      {option.label}
      {#if option.count !== undefined}
        <span class="opacity-70">{option.count}</span>
      {/if}
    </button>
  {/each}
</div>
