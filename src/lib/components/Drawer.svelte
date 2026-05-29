<script lang="ts">
  // Outside-click does NOT close — drawer wraps editable form state. Explicit close only.
  import { cn } from "$lib/utils";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import type { Snippet } from "svelte";

  interface Props {
    open: boolean;
    /** Header title text. When omitted, the header snippet (or nothing) renders. */
    title?: string;
    onClose?: () => void;
    /** Optional fully-custom header. Mutually exclusive with `title`. */
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;
    /** Class applied to the inner content column. */
    class?: string;
  }

  let {
    open,
    title,
    onClose,
    header,
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
    // Native <dialog> fires 'cancel' on Escape; route through onClose so parent state stays canonical.
    e.preventDefault();
    onClose?.();
  }
</script>

<dialog
  bind:this={dialog}
  oncancel={handleCancel}
  class={cn(
    "jt-drawer fixed inset-y-0 right-0 left-auto top-0 bottom-0 m-0 h-full max-h-none",
    "w-full sm:max-w-md lg:max-w-lg p-0 bg-transparent",
  )}
>
  <div
    class={cn(
      "flex h-full flex-col bg-background text-foreground",
      className,
    )}
  >
    {#if header || title || onClose}
      <div class="flex items-start justify-between gap-3 p-5 border-b border-border">
        <div class="min-w-0 flex-1">
          {#if header}
            {@render header()}
          {:else if title}
            <h2 class="font-semibold text-base leading-snug text-foreground truncate">
              {title}
            </h2>
          {/if}
        </div>
        {#if onClose}
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
    {/if}

    {#if children}
      <div class="flex-1 overflow-y-auto p-5">
        {@render children()}
      </div>
    {/if}

    {#if footer}
      <div class="flex items-center justify-end gap-2 p-5 border-t border-border">
        {@render footer()}
      </div>
    {/if}
  </div>
</dialog>

<style>
  /* @starting-style slide-in; unsupported browsers show the panel instantly. */
  dialog.jt-drawer {
    transform: translateX(100%);
    transition:
      transform 200ms ease-out,
      overlay 200ms ease-out allow-discrete,
      display 200ms ease-out allow-discrete;
  }
  dialog.jt-drawer[open] {
    transform: translateX(0);
  }
  @starting-style {
    dialog.jt-drawer[open] {
      transform: translateX(100%);
    }
  }
  /* Shadow on the dialog itself, since UA stylesheet sets overflow:auto on dialogs and clips inner shadows. */
  dialog.jt-drawer {
    box-shadow:
      -4px 0 48px 0 rgba(33, 35, 39, 0.12),
      0 0 1px 0 rgba(33, 35, 39, 0.08);
  }
  @media (prefers-color-scheme: dark) {
    dialog.jt-drawer {
      box-shadow:
        -4px 0 48px 0 #000,
        0 0 1px 0 hsla(214, 8%, 98%, 0.08);
    }
  }
</style>
