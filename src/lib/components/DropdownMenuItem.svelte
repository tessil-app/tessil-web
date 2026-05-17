<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    onSelect: () => void;
    href?: string;
    variant?: "default" | "destructive";
    disabled?: boolean;
    children: Snippet;
    class?: string;
  }

  let {
    onSelect,
    href,
    variant = "default",
    disabled = false,
    children,
    class: className,
  }: Props = $props();

  const base =
    "w-full inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors duration-150 ease-out hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none";
  const variants = {
    default:
      "text-foreground hover:bg-accent focus-visible:bg-accent focus:bg-accent",
    destructive:
      "text-destructive-foreground hover:bg-destructive/10 focus-visible:bg-destructive/10 focus:bg-destructive/10",
  } as const;

  function handleClick(e: MouseEvent) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onSelect();
  }
</script>

{#if href}
  <a
    role="menuitem"
    {href}
    onclick={handleClick}
    class={cn(base, variants[variant], className)}
    aria-disabled={disabled || undefined}
  >
    {@render children()}
  </a>
{:else}
  <button
    type="button"
    role="menuitem"
    {disabled}
    onclick={handleClick}
    class={cn(base, variants[variant], className)}
  >
    {@render children()}
  </button>
{/if}
