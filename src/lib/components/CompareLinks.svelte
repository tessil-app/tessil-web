<script lang="ts">
  // The comparisons that belong to one product, linked from its own page so
  // readers and search engines find them from where the product is explained.
  import { comparisons } from "$lib/compare/comparisons";
  import { comparisonsNl } from "$lib/compare/comparisons.nl";
  import type { Locale } from "$lib/i18n/locale";
  import { compareIndexMessages } from "$lib/i18n/messages/compareIndex";
  import { hrefFor } from "$lib/i18n/paths";

  let { kind, locale }: { kind: "send" | "portal" | "form"; locale: Locale } = $props();

  const t = $derived(compareIndexMessages[locale]);
  const base = $derived(locale === "nl" ? "/nl/vergelijken" : "/compare");
  const items = $derived(
    (locale === "nl" ? comparisonsNl : comparisons).filter((c) => (c.kind ?? "send") === kind),
  );
</script>

{#if items.length > 0}
  <section class="border-t border-border" aria-labelledby="compare-links">
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 id="compare-links" class="text-sm font-medium text-muted-foreground">{t.related[kind]}</h2>
      <ul class="mt-4 flex flex-wrap gap-2">
        {#each items as c (c.slug)}
          <li>
            <a
              href="{base}/{c.slug}"
              class="inline-flex rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-card focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {c.heading}
            </a>
          </li>
        {/each}
        <li>
          <a
            href={hrefFor("/compare", locale)}
            class="inline-flex px-2 py-1.5 text-sm text-primary underline underline-offset-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t.related.all}
          </a>
        </li>
      </ul>
    </div>
  </section>
{/if}
