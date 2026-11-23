<script lang="ts">
  // Every comparison, by what is compared. In Dutch at /nl/vergelijken, with
  // the comparisons that have a Dutch version.
  import { page } from "$app/state";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { comparisons, type Comparison } from "$lib/compare/comparisons";
  import { comparisonsNl } from "$lib/compare/comparisons.nl";
  import { localeFromPath } from "$lib/i18n/locale";
  import { compareIndexMessages } from "$lib/i18n/messages/compareIndex";
  import { hrefFor } from "$lib/i18n/paths";
  import { SITE_URL } from "$lib/config/site";
  import { HTML_LANG } from "$lib/i18n/locale";

  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(compareIndexMessages[locale]);
  const list = $derived<Comparison[]>(locale === "nl" ? comparisonsNl : comparisons);
  const base = $derived(locale === "nl" ? "/nl/vergelijken" : "/compare");
  const groups = $derived(
    (["send", "portal", "form"] as const)
      .map((kind) => ({ kind, items: list.filter((c) => (c.kind ?? "send") === kind) }))
      .filter((g) => g.items.length > 0),
  );

  // The list itself as structured data, so answer engines see every comparison.
  const jsonLd = $derived(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${SITE_URL}${hrefFor("/compare", locale)}`,
      name: t.title,
      description: t.description,
      inLanguage: HTML_LANG[locale],
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: groups
          .flatMap((g) => g.items)
          .map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.heading, url: `${SITE_URL}${base}/${c.slug}` })),
      },
    }).replace(/</g, "\\u003c"),
  );
</script>

<Seo title={t.seoTitle} description={t.description} path="/compare" structured={false} />

<svelte:head>
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PageLayout width="5xl">
  <PageHeader title={t.title} tagline={t.tagline} />

  <div class="space-y-12">
    {#each groups as group (group.kind)}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold tracking-tight text-foreground">{t.groups[group.kind]}</h2>
        <ul class="grid gap-4 sm:grid-cols-2">
          {#each group.items as c (c.slug)}
            <li>
              <a
                href="{base}/{c.slug}"
                class="group block h-full rounded-xl border border-border bg-card/60 p-5 transition-[border-color,background-color] duration-200 ease-out hover:border-border hover:bg-card focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <h3 class="text-lg font-semibold text-foreground">{c.heading}</h3>
                <p class="mt-1.5 text-sm text-muted-foreground leading-relaxed">{c.summary}</p>
                <span class="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2">
                  {t.read}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>

  <p class="mt-10 text-sm text-muted-foreground">
    {t.newBefore}
    <a href={hrefFor("/", locale)} class="text-primary underline underline-offset-2">{t.send}</a>{t.newMiddle}
    <a href={hrefFor("/security", locale)} class="text-primary underline underline-offset-2">{t.security}</a>.
  </p>

  <SiteFooter />
</PageLayout>
