<script lang="ts">
  // The long-read pages: security, privacy, terms, verify. A large title,
  // a list of the page's sections on the left, and the text in a column
  // narrow enough to read.

  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { cn } from "$lib/utils";
  import { onMount, type ComponentProps, type Snippet } from "svelte";

  interface Props {
    title: string;
    tagline?: string;
    /** Shown under the tagline, e.g. "November 13, 2026". */
    updated?: string;
    current?: ComponentProps<typeof SiteFooter>["current"];
    children: Snippet;
  }

  let { title, tagline, updated, current, children }: Props = $props();

  let article = $state<HTMLElement | null>(null);
  let sections = $state<{ id: string; label: string }[]>([]);
  let active = $state<string | null>(null);

  // The list is read from the page's own headings, so it cannot drift.
  onMount(() => {
    if (!article) return;
    const seen = new Set<string>();
    sections = [...article.querySelectorAll("h2")].map((h) => {
      let id =
        h.id ||
        (h.textContent ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      while (seen.has(id)) id += "-2";
      seen.add(id);
      h.id = id;
      return { id, label: (h.textContent ?? "").trim() };
    });

    // The section being read: the last heading that has passed the top.
    let queued = false;
    const mark = () => {
      queued = false;
      const passed = sections.filter((sec) => {
        const el = document.getElementById(sec.id);
        return el !== null && el.getBoundingClientRect().top <= 140;
      });
      // At the very bottom the last headings can no longer reach the top.
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      active = (atEnd ? sections.at(-1) : (passed.at(-1) ?? sections[0]))?.id ?? null;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(mark);
    };
    mark();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });
</script>

<div class="bg-background text-foreground">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-20">
    <header class="max-w-3xl space-y-4 pb-10 sm:pb-14">
      <h1
        class="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-none text-foreground"
        style="letter-spacing: -0.035em"
      >
        {title}
      </h1>
      {#if tagline}
        <p class="text-lg leading-relaxed text-muted-foreground">{tagline}</p>
      {/if}
      {#if updated}
        <p class="text-sm text-muted-foreground">Last updated {updated}</p>
      {/if}
    </header>

    <div class="grid gap-x-12 gap-y-8 border-t border-border pt-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="On this page" class="hidden lg:block">
        <div class="sticky top-24 space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
          <ul class="border-l border-border text-sm">
            {#each sections as section (section.id)}
              <li>
                <a
                  href="#{section.id}"
                  aria-current={active === section.id ? "location" : undefined}
                  class={cn(
                    "-ml-px block border-l-2 py-1 pl-3 transition-colors duration-150 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active === section.id
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {section.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      </nav>

      <article bind:this={article} class="prose-page min-w-0 max-w-2xl">
        {@render children()}
      </article>
    </div>

    <div class="pt-16">
      <SiteFooter {current} />
    </div>
  </div>
</div>

<style>
  /* One look for every long-read page, whatever classes its markup carries. */
  .prose-page :global(section + section) {
    margin-top: 2.5rem;
    padding-top: 2.5rem;
    border-top: 1px solid var(--border);
  }
  .prose-page :global(h2) {
    font-size: 1.375rem;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.015em;
    scroll-margin-top: 6rem;
  }
  .prose-page :global(h3) {
    font-size: 1.0625rem;
    font-weight: 600;
    padding-top: 0.75rem;
  }
  .prose-page :global(p),
  .prose-page :global(li) {
    line-height: 1.65;
  }
</style>
