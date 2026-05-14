<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    body?: string;
    actions?: Snippet;
    expanded?: Snippet;
    class?: string;
  }

  let { title, body, actions, expanded, class: className }: Props = $props();
</script>

<section
  class={cn(
    "flex flex-col border-t border-border py-6 px-1 last:pb-2",
    className
  )}
>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex-1 basis-64 min-w-0">
      <h3 class="text-sm font-medium text-foreground">{title}</h3>
      {#if body}
        <p class="mt-0.5 text-xs text-muted-foreground text-pretty">
          {body}
        </p>
      {/if}
    </div>
    {#if actions}
      <div class="inline-flex gap-1.5 shrink-0 items-center">
        {@render actions()}
      </div>
    {/if}
  </div>

  {#if expanded}
    <div class="w-full mt-4 flex flex-col gap-3">
      {@render expanded()}
    </div>
  {/if}
</section>
