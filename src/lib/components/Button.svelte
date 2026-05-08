<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLButtonAttributes, "class"> {
    variant?: "primary" | "secondary";
    fullWidth?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    variant = "primary",
    fullWidth = true,
    type = "button",
    class: className,
    children,
    ...rest
  }: Props = $props();

  const base =
    "hover:cursor-pointer py-3 px-4 font-medium rounded-[calc(var(--radius-2xl)-1px)] transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  const variants = {
    primary:
      "bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground",
    secondary:
      "bg-secondary hover:bg-secondary/80 disabled:bg-muted text-secondary-foreground",
  } as const;
</script>

<button
  {type}
  class={cn(base, variants[variant], fullWidth && "w-full", className)}
  {...rest}
>
  {@render children()}
</button>
