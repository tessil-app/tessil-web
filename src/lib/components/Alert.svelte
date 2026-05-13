<script lang="ts">
  import { cn } from "$lib/utils";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import type { Snippet } from "svelte";

  type Tone = "destructive" | "success" | "info" | "warning";

  interface Props {
    tone?: Tone;
    title?: string;
    onClose?: () => void;
    action?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    tone = "destructive",
    title,
    onClose,
    action,
    children,
    class: className,
  }: Props = $props();

  const toneClasses: Record<Tone, string> = {
    destructive:
      "bg-destructive/10 border-destructive/30 text-destructive-foreground",
    success: "bg-success/10 border-success/30 text-success-foreground",
    info: "bg-info/10 border-info/30 text-info-foreground",
    warning: "bg-warning/10 border-warning/30 text-warning-foreground",
  };

  const role = $derived(tone === "destructive" ? "alert" : "status");
  const ariaLive = $derived(tone === "destructive" ? "assertive" : "polite");
</script>

<div
  {role}
  aria-live={ariaLive}
  class={cn(
    "rounded-[calc(var(--radius-2xl)-1px)] border p-4 space-y-2",
    toneClasses[tone],
    className
  )}
>
  <div class="flex items-start gap-3">
    <div class="flex-1 min-w-0 space-y-1">
      {#if title}
        <div class="font-semibold text-sm leading-snug">{title}</div>
      {/if}
      {#if children}
        <div class="text-sm leading-relaxed">{@render children()}</div>
      {/if}
    </div>

    {#if onClose}
      <button
        type="button"
        onclick={onClose}
        aria-label="Dismiss"
        class="shrink-0 p-1 rounded transition-colors duration-200 ease-out hover:bg-current/10 hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <IconXRegular class="size-4" />
      </button>
    {/if}
  </div>

  {#if action}
    <div>{@render action()}</div>
  {/if}
</div>
