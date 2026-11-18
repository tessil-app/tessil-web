<script lang="ts">
  // A command to copy, with the ways to get it as tabs on the same box.
  // The tabs follow Tabs.svelte (sliding indicator, arrow keys) but sit
  // flush on the field, square, so the two read as one thing.

  import Button from "$lib/components/Button.svelte";
  import { cn } from "$lib/utils";

  interface Option {
    id: string;
    label: string;
    command: string;
  }

  interface Props {
    /** Tells this box's tabs apart from another's on the same page. */
    id: string;
    /** Accessible name of the tabs. */
    label: string;
    options: readonly Option[];
    class?: string;
  }

  let { id, label, options, class: className }: Props = $props();

  let chosen = $state(0);
  let copied = $state(false);
  let buttons = $state<HTMLButtonElement[]>([]);
  let box = $state({ x: 0, w: 0 });
  let ready = $state(false);

  $effect(() => {
    const el = buttons[chosen];
    if (!el) return;
    const measure = () => (box = { x: el.offsetLeft, w: el.offsetWidth });
    measure();
    // Start in place, then animate later moves.
    requestAnimationFrame(() => (ready = true));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // The strip's bottom line and the tab's outline as one path: along the
  // strip, out on a curve, up, around the top, down, and on along the strip.
  // One stroke, so the translucent line never doubles up where parts meet.
  // Drawn on half pixels so it is one crisp pixel wide.
  const R = 8;
  let height = $state(0);
  const shape = $derived.by(() => {
    const w = box.w;
    const h = height;
    if (w <= 2 * R || h <= 2 * R) return null;
    const left = 0.5;
    const right = w - 0.5;
    const top = 0.5;
    const outline = (base: number) =>
      `M${left - R} ${base} A${R} ${R} 0 0 0 ${left} ${base - R} V${top + R} A${R} ${R} 0 0 1 ${left + R} ${top} ` +
      `H${right - R} A${R} ${R} 0 0 1 ${right} ${top + R} V${base - R} A${R} ${R} 0 0 0 ${right + R} ${base}`;
    // Far enough to either side to cross the whole box wherever the tab is; the box clips it.
    const reach = 4000;
    return {
      line: `M${-reach} ${h - 0.5} H${left - R} ${outline(h - 0.5).replace(/^M\S+ \S+ /, "")} H${reach}`,
      fill: `${outline(h)} Z`,
    };
  });

  function pick(i: number) {
    chosen = i;
    copied = false;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (chosen + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    pick(next);
    buttons[next]?.focus();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(options[chosen].command);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      // Selecting the text by hand still works.
    }
  }
</script>

<div class={cn("overflow-hidden rounded-xl border border-border bg-card text-left", className)}>
  <div role="tablist" aria-label={label} tabindex="-1" {onkeydown} class={cn("relative flex bg-secondary px-2 pt-1.5", shape ? "pb-px" : "border-b border-border")}>
    <!-- The chosen tab's ground: the field's own colour, flaring out into it like a
         folder's tab. One drawn line carries the strip's hairline around it. -->
    <span
      aria-hidden="true"
      bind:clientHeight={height}
      class={cn("ground absolute top-1.5 bottom-0 left-0", ready && "moving")}
      style:width="{box.w}px"
      style:transform="translateX({box.x}px)"
    >
      {#if shape}
        <svg class="absolute left-0 top-0 overflow-visible" width={box.w} {height}>
          <path d={shape.fill} fill="var(--card)" />
          <path d={shape.line} fill="none" stroke="var(--border)" stroke-width="1" />
        </svg>
      {/if}
    </span>
    {#each options as option, i (option.id)}
      {@const on = i === chosen}
      <button
        bind:this={buttons[i]}
        type="button"
        role="tab"
        id="{id}-tab-{option.id}"
        aria-selected={on}
        aria-controls="{id}-panel"
        tabindex={on ? 0 : -1}
        onclick={() => pick(i)}
        class={cn(
          "relative z-10 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-100 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {option.label}
      </button>
    {/each}
  </div>
  <div
    id="{id}-panel"
    role="tabpanel"
    aria-labelledby="{id}-tab-{options[chosen].id}"
    class="flex items-center gap-2 py-2 pl-4 pr-2"
  >
    <code class="command min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.8125rem] text-foreground sm:text-sm">{options[chosen].command}</code>
    <Button variant="secondary" fullWidth={false} class="shrink-0 px-3 py-1.5 text-sm" onclick={copy}>
      {copied ? "Copied" : "Copy"}
    </Button>
  </div>
</div>

<style>
  .ground.moving {
    transition: transform 160ms cubic-bezier(0.25, 1, 0.5, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .ground.moving {
      transition: none;
    }
  }

  /* A long command scrolls sideways under a thin bar in the text's own colour. */
  .command {
    padding-bottom: 0.25rem;
    margin-bottom: -0.25rem;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, currentColor 30%, transparent) transparent;
  }
  .command::-webkit-scrollbar {
    height: 4px;
  }
  .command::-webkit-scrollbar-track {
    background: transparent;
  }
  .command::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 30%, transparent);
  }
</style>
