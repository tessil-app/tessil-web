<script lang="ts">
  import Mark from "./Mark.svelte";
  import { cn } from "$lib/utils";

  type Props = {
    layout?: "horizontal" | "stacked";
    markSize?: number;
    class?: string;
  };

  let {
    layout = "horizontal",
    markSize = 24,
    class: className = "",
  }: Props = $props();

  const isStacked = $derived(layout === "stacked");
</script>

<span
  class={cn(
    isStacked
      ? "inline-flex flex-col items-center gap-1.5"
      : "inline-flex items-center gap-2",
    className,
  )}
>
  <Mark size={markSize} class="text-primary shrink-0" />
  <span
    class="font-semibold tracking-tight text-foreground leading-none"
    style="letter-spacing: -0.02em"
  >
    Tessil
  </span>
</span>
