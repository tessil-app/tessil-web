<script lang="ts">
  import BackLink from "$lib/components/BackLink.svelte";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    tagline?: string;
    align?: "center" | "left";
    /** Link to the page one level up, shown above the title. */
    back?: { href: string; label: string };
    /** A state shown next to the title, usually a Badge. */
    badge?: Snippet;
    /** Buttons. Beside the title when there is room, below it on a phone. */
    actions?: Snippet;
    class?: string;
  }

  let {
    title,
    tagline,
    align = "center",
    back,
    badge,
    actions,
    class: className,
  }: Props = $props();

  const isCenter = $derived(align === "center");
</script>

<header class={cn(isCenter ? "mb-12 text-center" : "mb-8", className)}>
  {#if back}
    <BackLink href={back.href} label={back.label} class={isCenter ? "flex justify-center" : ""} />
  {/if}

  <div class={cn(!isCenter && "flex flex-wrap items-end justify-between gap-x-4 gap-y-4")}>
    <div class={cn("flex flex-col gap-2 min-w-0", isCenter && "items-center")}>
      <div class={cn("flex flex-wrap items-center gap-x-3 gap-y-2", isCenter && "justify-center")}>
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words min-w-0">
          {title}
        </h1>
        {#if badge}
          {@render badge()}
        {/if}
      </div>

      {#if tagline}
        <p class={cn("text-muted-foreground", isCenter ? "max-w-xl text-balance" : "")}>
          {tagline}
        </p>
      {/if}
    </div>

    {#if actions}
      <div class={cn("flex flex-wrap items-center gap-2", isCenter && "justify-center mt-4")}>
        {@render actions()}
      </div>
    {/if}
  </div>
</header>
