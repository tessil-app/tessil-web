<script lang="ts">
  // A list of rows with shared columns. Rows are Table.Row; on a phone a
  // row can swap its columns for a stacked layout.

  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import { actionsWidthClass, setTableContext, type ActionsWidth } from "./context";

  interface Props {
    /** Full Tailwind class, e.g. "grid-cols-[minmax(0,2fr)_minmax(0,1fr)]". */
    cols: string;
    /** Room kept on the right for row actions. */
    actions?: ActionsWidth;
    /** Column titles, one element per column. Hidden on a phone. */
    header?: Snippet;
    /** Rows have a narrow cell on the left (a checkbox). Not shown on a phone. */
    selectable?: boolean;
    /** What sits above that cell in the header, such as "select all". */
    headerLeading?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { cols, actions = "none", header, selectable = false, headerLeading, children, class: className }: Props = $props();

  setTableContext({
    get cols() {
      return cols;
    },
    get actions() {
      return actions;
    },
    get hasHeader() {
      return header !== undefined;
    },
    get hasLeading() {
      return selectable;
    },
  });
</script>

<div class={cn("rounded-lg bg-card", className)}>
  {#if header}
    <div class="hidden sm:flex items-center rounded-t-lg bg-muted/40">
      {#if selectable}
        <div class="flex w-10 shrink-0 items-center justify-end">
          {#if headerLeading}{@render headerLeading()}{/if}
        </div>
      {/if}
      <div
        class={cn(
          "grid flex-1 min-w-0 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide",
          cols,
        )}
      >
        {@render header()}
      </div>
      {#if actions !== "none"}
        <div class={cn("shrink-0", actionsWidthClass[actions])}></div>
      {/if}
    </div>
  {/if}
  <ul class="divide-y divide-border">
    {@render children()}
  </ul>
</div>
