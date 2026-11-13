<script lang="ts">
  // An underlined link inside running text, or a small action that reads
  // as one. Takes its size and colour from the text around it.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

  type Base = { class?: string; children: Snippet };
  type AnchorProps = Base & Omit<HTMLAnchorAttributes, "class"> & { href: string };
  type ButtonProps = Base & Omit<HTMLButtonAttributes, "class" | "type"> & { href?: undefined };

  let { href, class: className, children, ...rest }: AnchorProps | ButtonProps = $props();

  const base =
    "rounded underline underline-offset-2 transition-colors duration-150 ease-out hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
</script>

{#if href}
  <a {href} class={cn(base, className)} {...rest as HTMLAnchorAttributes}>{@render children()}</a>
{:else}
  <button
    type="button"
    class={cn(base, "hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60", className)}
    {...rest as HTMLButtonAttributes}
  >
    {@render children()}
  </button>
{/if}
