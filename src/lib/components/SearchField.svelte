<script lang="ts">
  import { cn } from "$lib/utils";
  import IconMagnifyingGlassRegular from "phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte";

  interface Props {
    value: string;
    /** Accessible name; not shown. */
    label: string;
    placeholder?: string;
    class?: string;
  }

  let { value = $bindable(), label, placeholder, class: className }: Props = $props();
</script>

<label
  class={cn(
    "flex items-center gap-2 rounded-md border border-border bg-card px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
    className,
  )}
>
  <IconMagnifyingGlassRegular class="size-4 shrink-0 text-muted-foreground" />
  <span class="sr-only">{label}</span>
  <input
    type="search"
    bind:value
    {placeholder}
    class="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
  />
</label>
