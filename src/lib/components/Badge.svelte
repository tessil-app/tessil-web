<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  type Tone = "muted" | "info" | "success" | "warning" | "destructive";

  interface Props {
    tone?: Tone;
    children: Snippet;
    class?: string;
  }

  let { tone = "muted", children, class: className }: Props = $props();

  const toneClasses: Record<Tone, string> = {
    muted: "bg-muted text-muted-foreground",
    info: "bg-info/15 text-info-foreground",
    success: "bg-success/15 text-success-foreground",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive-foreground",
  };
</script>

<span
  class={cn(
    "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
    toneClasses[tone],
    className
  )}
>
  {@render children()}
</span>
