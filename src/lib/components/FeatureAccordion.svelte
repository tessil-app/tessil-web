<script lang="ts" module>
  export interface Feature {
    id: "portals" | "forms" | "cli";
    name: string;
    /** Wears a "New" tag until it has been around a while. */
    fresh?: boolean;
    line: string;
    href: string;
    link: string;
    /** A few words for the announcement above the headline on a phone. */
    pill: string;
  }
</script>

<script lang="ts">
  // The homepage's way to what Tessil does besides sending: a row of panes,
  // one open, the rest folded to a name. Opening one folds the others. A
  // pane's mark, name and tag are the same three things in both states;
  // they travel between their places instead of fading out and in.

  import { cn } from "$lib/utils";
  import { untrack } from "svelte";

  interface Props {
    features: Feature[];
    class?: string;
    /** Words of the tag and the button names, in the page's language. */
    words?: { fresh: string; show: (name: string) => string };
  }

  let { features, class: className, words = { fresh: "New", show: (name) => `Show ${name}` } }: Props = $props();

  // The newest thing starts open.
  // Written without findLastIndex, which older Safari does not have.
  let open = $state(untrack(() => Math.max(0, features.map((f) => f.fresh === true).lastIndexOf(true))));

  // Widths of each name and tag, to place the tag after the name when open
  // and in the middle of the strip when folded. Guessed until measured.
  let nameWidths = $state<number[]>(untrack(() => features.map((f) => f.name.length * 8.5)));
  let tagWidths = $state<number[]>(untrack(() => features.map(() => 38)));
  // How tall each pane's words are at the open width. The row is as tall as
  // the longest needs, so a long sentence never runs under its heading.
  let bodyHeights = $state<number[]>(untrack(() => features.map(() => 0)));
  const tallest = $derived(Math.max(0, ...bodyHeights));

  // A pointer passing over the row on its way elsewhere should not set every
  // pane moving: hover opens one only after resting on it for a moment.
  const HOVER_REST_MS = 90;
  let resting: ReturnType<typeof setTimeout> | undefined;
  function hoverOpen(i: number) {
    clearTimeout(resting);
    resting = setTimeout(() => (open = i), HOVER_REST_MS);
  }
  $effect(() => () => clearTimeout(resting));
</script>

{#snippet glyph(id: Feature["id"])}
  <svg viewBox="0 0 28 28" class="size-7 shrink-0" fill="none" aria-hidden="true">
    {#if id === "portals"}
      <!-- A way in: rings around a dark middle. -->
      <circle cx="14" cy="14" r="11" class="stroke-primary/30" stroke-width="2" />
      <circle cx="14" cy="14" r="6.5" class="stroke-primary" stroke-width="2" />
      <circle cx="14" cy="14" r="2.5" class="fill-foreground" />
    {:else if id === "forms"}
      <!-- Questions, one of them answered. -->
      <rect x="3" y="5" width="22" height="5" rx="2.5" class="fill-primary" />
      <rect x="3" y="12" width="22" height="5" rx="2.5" class="fill-primary/30" />
      <rect x="3" y="19" width="13" height="5" rx="2.5" class="fill-primary/30" />
    {:else}
      <!-- A prompt, waiting. -->
      <rect x="2" y="4" width="24" height="20" rx="4" class="fill-foreground" />
      <path d="M7 11l4 3-4 3" class="stroke-primary-foreground" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M14 17.5h6" class="stroke-primary" stroke-width="2" stroke-linecap="round" />
    {/if}
  </svg>
{/snippet}

<div class={cn("accordion", className)} style:--n={features.length} style:--body-h={tallest > 0 ? `${tallest}px` : null}>
  {#each features as feature, i (feature.id)}
    {@const on = i === open}
    <div class="pane" class:on style:--name-w="{nameWidths[i]}px" style:--tag-w="{tagWidths[i]}px">
      <!-- Folded, the whole strip opens it. -->
      <button
        type="button"
        class="opener"
        aria-label={words.show(feature.name)}
        aria-expanded={on}
        aria-controls="feature-{feature.id}"
        inert={on}
        onclick={() => {
          clearTimeout(resting);
          open = i;
        }}
        onpointerenter={(e) => {
          // Hover opens only where there is a real pointer; a tap is a click.
          if (e.pointerType === "mouse") hoverOpen(i);
        }}
        onpointerleave={() => clearTimeout(resting)}
      ></button>

      <!-- Open: what it is, and the way to its page. -->
      <a
        id="feature-{feature.id}"
        href={feature.href}
        class="unfolded group"
        inert={!on}
        aria-label="{feature.name}. {feature.line} {feature.link}"
      >
        <span class="body" bind:offsetHeight={bodyHeights[i]}>
          <span class="line block font-semibold leading-snug text-foreground">{feature.line}</span>
          <span class="block text-sm text-primary underline-offset-4 group-hover:underline">{feature.link}</span>
        </span>
      </a>

      <!-- The same three things in both states. -->
      <span class="mark" aria-hidden="true">{@render glyph(feature.id)}</span>
      <span class="name" aria-hidden="true" bind:offsetWidth={nameWidths[i]}>{feature.name}</span>
      {#if feature.fresh}
        <span class="tag" aria-hidden="true" bind:offsetWidth={tagWidths[i]}>{words.fresh}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .accordion {
    --fold: 3.5rem;
    --gap: 0.5rem;
    /* The heading row, the words, and the padding around them; never less than 10.5rem. */
    --h: max(10.5rem, calc(var(--pad-y) * 2 + var(--mark) + 0.5rem + var(--body-h, 0px)));
    /* Where the open pane's heading sits. */
    --pad-x: 1.25rem;
    --pad-y: 1.125rem;
    --mark: 1.75rem;
    /* Gentle at both ends, so a pane settles instead of snapping open. */
    --move: 380ms cubic-bezier(0.32, 0.72, 0, 1);
    container-type: inline-size;
    display: flex;
    gap: var(--gap);
    height: var(--h);
  }
  .pane {
    position: relative;
    flex: 0 0 var(--fold);
    overflow: hidden;
    border-radius: var(--radius-lg, 0.5rem);
    background: color-mix(in srgb, var(--card) 95%, transparent);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    transition: flex-basis var(--move);
    /* What moves inside a pane stays inside it. */
    contain: layout paint;
  }
  .pane.on {
    /* Everything the row has left once the others are folded. */
    flex-basis: calc(100cqw - (var(--n) - 1) * (var(--fold) + var(--gap)));
  }

  .opener,
  .unfolded {
    position: absolute;
    inset: 0;
  }
  .opener {
    cursor: pointer;
  }
  .opener:focus-visible,
  .unfolded:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: -2px;
    border-radius: inherit;
  }
  .unfolded {
    /* As wide as the open pane, so the words do not reflow while it moves. */
    width: calc(100cqw - (var(--n) - 1) * (var(--fold) + var(--gap)));
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    /* Room at the top for the mark, name and tag, so long text never runs under them. */
    padding: calc(var(--pad-y) + var(--mark) + 0.5rem) var(--pad-x) var(--pad-y);
    opacity: 0;
    transform: translateY(4px);
    transition:
      opacity 100ms ease-out,
      transform 100ms ease-out;
  }
  .pane.on .unfolded {
    opacity: 1;
    transform: none;
    /* Arrives once the pane is most of the way open. */
    transition:
      opacity 220ms ease-out 150ms,
      transform 260ms cubic-bezier(0.32, 0.72, 0, 1) 150ms;
  }

  /* Mark, name and tag are laid out at the pane's top left corner and put in
     place with a transform, so moving between the two places can be eased. */
  .mark,
  .name,
  .tag {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
    transition: transform var(--move);
    /* Each on its own layer: moved and turned without being redrawn every frame. */
    will-change: transform;
    backface-visibility: hidden;
  }

  /* Folded: at the foot of the strip. Open: first thing in the heading. */
  .mark {
    transform: translate(calc((var(--fold) - var(--mark)) / 2), calc(var(--h) - 0.75rem - var(--mark)));
  }
  .pane.on .mark {
    transform: translate(var(--pad-x), var(--pad-y));
  }

  /* Folded: rising from above the mark, read bottom to top. Open: beside the mark.
     It turns about the middle of its left edge, which is where the word begins. */
  .name {
    height: var(--mark);
    line-height: var(--mark);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--foreground);
    white-space: nowrap;
    transform-origin: 0 50%;
    transform: translate(calc(var(--fold) / 2), calc(var(--h) - 0.75rem - var(--mark) - 0.5rem - var(--mark) / 2))
      rotate(-90deg);
  }
  .pane.on .name {
    transform: translate(calc(var(--pad-x) + var(--mark) + 0.625rem), var(--pad-y)) rotate(0deg);
  }

  /* Folded: at the head of the strip. Open: after the name. */
  .tag {
    border-radius: 999px;
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.4;
    background: var(--primary);
    color: var(--primary-foreground);
    transform: translate(calc((var(--fold) - var(--tag-w)) / 2), 0.75rem);
  }
  .pane.on .tag {
    transform: translate(
      calc(var(--pad-x) + var(--mark) + 0.625rem + var(--name-w) + 0.625rem),
      calc(var(--pad-y) + 0.3125rem)
    );
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .line {
    font-size: 1rem;
    text-wrap: pretty;
  }
  /* On a narrow phone the open pane has little width: slightly smaller
     words keep the sentence to a few lines. */
  @media (max-width: 400px) {
    .accordion {
      --pad-x: 1rem;
    }
    .line {
      font-size: 0.9375rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pane,
    .unfolded,
    .pane.on .unfolded,
    .mark,
    .name,
    .tag {
      transition: none;
    }
    .unfolded {
      transform: none;
    }
  }
</style>
