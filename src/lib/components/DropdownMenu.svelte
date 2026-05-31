<script lang="ts">
  import { cn } from "$lib/utils";
  import { scale } from "svelte/transition";
  import { expoOut } from "svelte/easing";
  import type { Snippet } from "svelte";

  interface Props {
    trigger: Snippet;
    children: Snippet<[() => void]>;
    /** Horizontal alignment of the menu relative to the trigger. */
    align?: "start" | "end";
    label?: string;
    triggerClass?: string;
    menuClass?: string;
  }

  let {
    trigger,
    children,
    align = "end",
    label = "Open menu",
    triggerClass,
    menuClass,
  }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);

  function close() {
    if (!open) return;
    open = false;
    triggerEl?.focus();
  }

  function toggle() {
    open = !open;
  }

  function handleTriggerKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open = true;
    } else if (e.key === "Escape") {
      close();
    }
  }

  function focusFirstItem() {
    if (!menuEl) return;
    const first = menuEl.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }

  function handleMenuKey(e: KeyboardEvent) {
    if (!menuEl) return;
    const items = Array.from(
      menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    if (items.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close();
    }
  }

  function handleDocumentPointer(e: PointerEvent) {
    if (!open) return;
    const target = e.target as Node | null;
    if (!target) return;
    if (triggerEl?.contains(target)) return;
    if (menuEl?.contains(target)) return;
    open = false;
  }

  $effect(() => {
    if (!open) return;
    queueMicrotask(focusFirstItem);
    document.addEventListener("pointerdown", handleDocumentPointer);
    return () => document.removeEventListener("pointerdown", handleDocumentPointer);
  });
</script>

<div class="relative inline-block">
  <button
    bind:this={triggerEl}
    type="button"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={label}
    onclick={toggle}
    onkeydown={handleTriggerKey}
    class={cn(
      "inline-flex items-center gap-2 rounded-md text-sm transition-colors duration-200 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      triggerClass,
    )}
  >
    {@render trigger()}
  </button>

  {#if open}
    <div
      bind:this={menuEl}
      role="menu"
      tabindex="-1"
      onkeydown={handleMenuKey}
      transition:scale={{ duration: 150, start: 0.96, opacity: 0, easing: expoOut }}
      class={cn(
        "absolute z-50 mt-2 min-w-[12rem] rounded-md border border-border bg-card p-1 space-y-0.5",
        align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
        menuClass,
      )}
    >
      {@render children(close)}
    </div>
  {/if}
</div>
