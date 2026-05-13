<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from "svelte/elements";

  type Variant = "primary" | "secondary" | "ghost" | "destructive";

  interface BaseProps {
    variant?: Variant;
    fullWidth?: boolean;
    iconOnly?: boolean;
    class?: string;
    children: Snippet;
  }

  type ButtonProps = BaseProps &
    Omit<HTMLButtonAttributes, "class"> & { href?: undefined };
  type AnchorProps = BaseProps &
    Omit<HTMLAnchorAttributes, "class" | "type"> & { href: string };

  type Props = ButtonProps | AnchorProps;

  let {
    variant = "primary",
    fullWidth = true,
    iconOnly = false,
    href,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-[calc(var(--radius-2xl)-1px)] transition-[background-color,color,border-color] duration-200 ease-out hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  const variants: Record<Variant, string> = {
    primary:
      "bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground",
    secondary:
      "bg-secondary hover:bg-secondary/80 disabled:bg-muted text-secondary-foreground",
    ghost:
      "bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground",
    destructive:
      "bg-transparent hover:bg-destructive/10 text-destructive-foreground",
  };

  const sizing = $derived(iconOnly ? "p-2" : "py-3 px-4");
  const widthClass = $derived(fullWidth && !iconOnly ? "w-full" : "");
</script>

{#if href}
  <a
    {href}
    class={cn(base, sizing, variants[variant], widthClass, className)}
    {...rest as HTMLAnchorAttributes}
  >
    {@render children()}
  </a>
{:else}
  {@const buttonRest = rest as HTMLButtonAttributes}
  <button
    type={buttonRest.type ?? "button"}
    class={cn(base, sizing, variants[variant], widthClass, className)}
    {...buttonRest}
  >
    {@render children()}
  </button>
{/if}
