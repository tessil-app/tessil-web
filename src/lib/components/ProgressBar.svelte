<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    progress: number;
    label?: string;
    thin?: boolean;
    /** "warning" and "destructive" for a limit that is close or reached. */
    tone?: "info" | "warning" | "destructive";
    class?: string;
  }

  let { progress, label, thin = false, tone = "info", class: className }: Props = $props();

  const fill = { info: "bg-info", warning: "bg-warning", destructive: "bg-destructive" } as const;

  const trackHeight = $derived(thin ? "h-1" : "h-2.5");
</script>

<div class={cn("w-full", className)}>
  {#if label}
    <div class="flex justify-between mb-1 text-sm text-muted-foreground">
      <span>{label}</span>
      <span class="tabular-nums">{Math.round(progress)}%</span>
    </div>
  {/if}
  <div
    class={cn("w-full bg-muted rounded-full overflow-hidden", trackHeight)}
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(progress)}
    aria-label={label}
  >
    <div
      class={cn("rounded-full transition-[width] duration-200 ease-out", fill[tone], trackHeight)}
      style="width: {Math.min(Math.max(progress, 0), 100)}%"
    ></div>
  </div>
</div>
