<script lang="ts">
  // Blocking dialog. Uses the native <dialog> element so the browser
  // handles focus trapping, inert background, and the Escape key for us —
  // we just toggle .showModal() / .close() in an effect.
  //
  // Usage:
  //   <Modal open={state} onClose={() => (state = false)} title="…">
  //     …body…
  //     {#snippet footer()}<Button …/>{/snippet}
  //   </Modal>

  import { cn } from "$lib/utils";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import type { Snippet } from "svelte";

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    /** When false the X button is hidden and Escape is intercepted. */
    dismissible?: boolean;
    onClose?: () => void;
    children?: Snippet;
    footer?: Snippet;
    class?: string;
  }

  let {
    open,
    title,
    description,
    dismissible = true,
    onClose,
    children,
    footer,
    class: className,
  }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function handleCancel(e: Event) {
    // Native <dialog> fires 'cancel' on Escape. Intercept so a non-dismissible
    // modal can't be dismissed via the keyboard.
    if (!dismissible) {
      e.preventDefault();
      return;
    }
    onClose?.();
  }

  function handleBackdrop(e: MouseEvent) {
    if (!dismissible || !dialog) return;
    if (e.target === dialog) onClose?.();
  }
</script>

<dialog
  bind:this={dialog}
  oncancel={handleCancel}
  onclick={handleBackdrop}
  class={cn(
    "fixed inset-0 m-auto max-w-lg w-[calc(100vw-2rem)] p-0 bg-transparent backdrop:bg-foreground/15",
    "open:animate-in open:fade-in",
  )}
>
  <div
    class={cn(
      "rounded-[calc(var(--radius-2xl)-1px)] border border-border bg-card text-card-foreground shadow-lg",
      className,
    )}
  >
    <div class="flex items-start justify-between gap-3 p-5 border-b border-border">
      <div class="space-y-1 min-w-0">
        <h2 class="font-semibold text-base leading-snug text-foreground">{title}</h2>
        {#if description}
          <p class="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {/if}
      </div>
      {#if dismissible && onClose}
        <button
          type="button"
          onclick={onClose}
          aria-label="Close"
          class="shrink-0 p-1 rounded transition-colors duration-200 ease-out hover:bg-accent hover:cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <IconXRegular class="size-4" />
        </button>
      {/if}
    </div>

    {#if children}
      <div class="p-5 space-y-4 text-sm leading-relaxed text-foreground">
        {@render children()}
      </div>
    {/if}

    {#if footer}
      <div class="flex items-center justify-end gap-2 p-5 pt-0">
        {@render footer()}
      </div>
    {/if}
  </div>
</dialog>
