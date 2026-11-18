<script lang="ts" generics="T extends string">
  // Switches between views of one thing, with a sliding indicator. Arrow
  // keys move between tabs. For a choice saved with a form, use a Switch or
  // radios instead.

  import { cn } from "$lib/utils";
  import type { Component } from "svelte";

  interface Tab {
    value: T;
    label: string;
    icon?: Component<{ class?: string }>;
  }

  interface Props {
    label: string;
    tabs: Tab[];
    value: T;
    onChange: (v: T) => void;
    class?: string;
  }

  let { label, tabs, value, onChange, class: className }: Props = $props();

  let buttons = $state<HTMLButtonElement[]>([]);
  let box = $state({ x: 0, w: 0 });
  let ready = $state(false);

  $effect(() => {
    const i = tabs.findIndex((t) => t.value === value);
    const el = buttons[i];
    if (!el) return;
    const measure = () => (box = { x: el.offsetLeft, w: el.offsetWidth });
    measure();
    // Start in place, then animate later moves.
    requestAnimationFrame(() => (ready = true));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    e.stopPropagation();
    const i = tabs.findIndex((t) => t.value === value);
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    buttons[next]?.focus();
  }
</script>

<div
  role="tablist"
  aria-label={label}
  tabindex="-1"
  {onkeydown}
  class={cn("relative inline-flex items-center rounded-lg bg-secondary p-1", className)}
>
  <span
    aria-hidden="true"
    class={cn(
      "absolute inset-y-1 left-0 rounded-md bg-background shadow-sm ring-1 ring-border/60",
      ready && "transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
    )}
    style:width="{box.w}px"
    style:transform="translateX({box.x}px)"
  ></span>
  {#each tabs as tab, i (tab.value)}
    {@const on = tab.value === value}
    <button
      bind:this={buttons[i]}
      type="button"
      role="tab"
      aria-selected={on}
      tabindex={on ? 0 : -1}
      onclick={() => onChange(tab.value)}
      class={cn(
        "relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] motion-reduce:active:scale-100 [transition-property:color,transform]",
        on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {#if tab.icon}<tab.icon class="size-4" />{/if}
      {tab.label}
    </button>
  {/each}
</div>
