<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import { actionsWidthClass, getTableContext } from "./context";

  interface Props {
    /** One element per column. */
    cells: Snippet;
    /** Shown instead of the columns on a phone. */
    stacked?: Snippet;
    /** Controls on the right. Their clicks never trigger the row. */
    actions?: Snippet;
    /** Keep the actions visible on a phone; by default they hide when `stacked` is set. */
    actionsOnPhone?: boolean;
    onclick?: () => void;
    href?: string;
    class?: string;
  }

  let { cells, stacked, actions, actionsOnPhone = false, onclick, href, class: className }: Props = $props();

  const table = getTableContext();
  const interactive = $derived(href !== undefined || onclick !== undefined);

  const main =
    "block min-w-0 flex-1 px-4 py-3 text-left text-sm rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
</script>

{#snippet body()}
  {#if stacked}
    <div class="sm:hidden">{@render stacked()}</div>
  {/if}
  <div class={cn("gap-4 items-center", stacked ? "hidden sm:grid" : "grid", table.cols)}>
    {@render cells()}
  </div>
{/snippet}

<li
  class={cn(
    "flex items-center last:rounded-b-lg",
    !table.hasHeader && "first:rounded-t-lg",
    interactive && "transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-accent",
    className,
  )}
>
  {#if href}
    <a {href} class={main}>{@render body()}</a>
  {:else if onclick}
    <button type="button" {onclick} class={cn(main, "hover:cursor-pointer")}>{@render body()}</button>
  {:else}
    <div class={main}>{@render body()}</div>
  {/if}
  {#if actions}
    <div
      class={cn(
        "shrink-0 items-center justify-end gap-1 pr-3",
        actionsWidthClass[table.actions],
        stacked && !actionsOnPhone ? "hidden sm:flex" : "flex",
      )}
    >
      {@render actions()}
    </div>
  {/if}
</li>
