<script lang="ts">
  // A centred panel for "nothing here yet", "can't show this" and "done":
  // what the situation is, one or two lines on why, and the way forward.

  import * as Frame from "$lib/components/frame";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    /** Use 1 when this panel is the whole page. */
    level?: 1 | 2;
    /** Announce to screen readers when it appears, for results of an action. */
    announce?: boolean;
    icon?: Snippet;
    /** The explanation: plain text or paragraphs. */
    children?: Snippet;
    actions?: Snippet;
    class?: string;
  }

  let { title, level = 2, announce = false, icon, children, actions, class: className }: Props = $props();
</script>

<Frame.Root class={className}>
  <Frame.Panel>
    <div
      class="text-center space-y-3"
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
    >
      {#if icon}
        <div class="flex justify-center">{@render icon()}</div>
      {/if}
      <svelte:element this={level === 1 ? "h1" : "h2"} class="text-lg font-medium text-foreground">
        {title}
      </svelte:element>
      {#if children}
        <div class={cn("space-y-3 text-sm text-muted-foreground")}>
          {@render children()}
        </div>
      {/if}
      {#if actions}
        <div class="flex flex-wrap justify-center gap-2 pt-2">
          {@render actions()}
        </div>
      {/if}
    </div>
  </Frame.Panel>
</Frame.Root>
