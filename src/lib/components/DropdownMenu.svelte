<script lang="ts">
  // Lightweight dropdown menu primitive.
  //
  // The trigger snippet is rendered inside a button; the menu opens below it
  // and closes on outside click, Escape, blur, and on demand via the `close`
  // argument passed to the children snippet. Focus moves to the first menu
  // item on open and returns to the trigger on close.
  //
  // Usage:
  //   <DropdownMenu align="end">
  //     {#snippet trigger()}<Avatar/>{/snippet}
  //     {#snippet children(close)}
  //       <button role="menuitem" class={dropdownItemClass} onclick={() => { …; close(); }}>
  //         Sign out
  //       </button>
  //     {/snippet}
  //   </DropdownMenu>

  import { cn } from "$lib/utils";
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
      class={cn(
        "absolute z-50 mt-2 min-w-[12rem] origin-top rounded-[calc(var(--radius-2xl)-1px)] border border-border bg-card shadow-lg p-1",
        align === "end" ? "right-0" : "left-0",
        menuClass,
      )}
    >
      {@render children(close)}
    </div>
  {/if}
</div>
