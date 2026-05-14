<script lang="ts">
  import { cn } from "$lib/utils";
  import IconKeyRegular from "phosphor-icons-svelte/IconKeyRegular.svelte";
  import type { Snippet } from "svelte";

  interface Props {
    nickname: string | null;
    /** "Synced · last used 2 hours ago" — caller composes; primitive only renders. */
    meta: string;
    /**
     * True when this row authenticated the current session. Adds the
     * inline " · Used to sign in here" hint and signals to the caller's
     * confirm panel whether to surface the warning Alert.
     * Source of truth: `session.authenticator_id`.
     */
    isCurrent?: boolean;
    /**
     * True when `body` should replace the default name+meta render
     * (the rename state). Svelte 5 snippet declarations are always
     * truthy, so we can't infer this from `body !== undefined`.
     */
    showBody?: boolean;
    /** Override the default name+meta render — used by the rename state. */
    body?: Snippet;
    /** Inline right-side action buttons. */
    actions?: Snippet;
    /**
     * True when `below` should render in the inset panel under the row
     * (rename error or delete-confirm state).
     */
    showBelow?: boolean;
    /** Panel that renders below the main row. */
    below?: Snippet;
    class?: string;
  }

  let {
    nickname,
    meta,
    isCurrent = false,
    showBody = false,
    body,
    actions,
    showBelow = false,
    below,
    class: className,
  }: Props = $props();
</script>

<li class={cn("py-3.5 first:pt-0 last:pb-0", className)}>
  <div class="flex items-center gap-3.5">
    <span
      class="inline-flex items-center justify-center size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
      aria-hidden="true"
    >
      <IconKeyRegular class="size-5" />
    </span>

    <div class="flex-1 min-w-0">
      {#if showBody && body}
        {@render body()}
      {:else}
        <div
          class={cn(
            "text-sm font-medium break-words",
            nickname ? "text-foreground" : "italic font-normal text-muted-foreground"
          )}
        >
          {nickname ?? "Unnamed sign-in key"}
        </div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          {meta}{#if isCurrent}
            <span> · Used to sign in here</span>
          {/if}
        </div>
      {/if}
    </div>

    {#if actions}
      <span class="inline-flex gap-0.5 items-center shrink-0">
        {@render actions()}
      </span>
    {/if}
  </div>

  {#if showBelow && below}
    <div class="mt-3.5 sm:ml-[2.875rem] flex flex-col gap-3">
      {@render below()}
    </div>
  {/if}
</li>
