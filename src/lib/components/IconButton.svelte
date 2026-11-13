<script lang="ts">
  // A button that is only an icon. `label` is its accessible name and tooltip.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLButtonAttributes, "class" | "aria-label" | "title"> {
    label: string;
    tone?: "default" | "destructive";
    class?: string;
    children: Snippet;
  }

  let { label, tone = "default", class: className, children, ...rest }: Props = $props();
</script>

<button
  type="button"
  aria-label={label}
  title={label}
  class={cn(
    "inline-flex items-center justify-center p-2 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    tone === "destructive"
      ? "hover:text-destructive-foreground hover:bg-destructive/10"
      : "hover:text-foreground hover:bg-background",
    className,
  )}
  {...rest}
>
  {@render children()}
</button>
