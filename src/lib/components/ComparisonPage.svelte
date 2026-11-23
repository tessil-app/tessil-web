<script lang="ts">
  // Shared template for every comparison page in every locale. The English and
  // Dutch routes differ only in the data and the paths they hand in, so the
  // markup lives here once and adding a locale stays a content change.
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import Button from "$lib/components/Button.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import IconTranslateRegular from "phosphor-icons-svelte/IconTranslateRegular.svelte";
  import type { Cell, Comparison } from "$lib/compare/comparisons";
  import { SITE_URL } from "$lib/config/site";
  import { compareStrings } from "$lib/i18n/messages";
  import { HTML_LANG, type Locale } from "$lib/i18n/locale";
  import { CHOOSE } from "$lib/compare/choose";
  import { LAST_VERIFIED_ISO } from "$lib/compare/comparisons";
  import { RECEIVING_VERIFIED_ISO } from "$lib/compare/receiving";
  import { homeMessages } from "$lib/i18n/messages/home";
  import { APP_ID, applicationNode, ORG_ID, organizationNode } from "$lib/seo/schema";
  import { comparisonMarkdownPath } from "$lib/seo/agentText";

  let {
    comparison,
    locale,
    basePath,
    homePath,
    indexPath,
    others,
    lastVerified,
    ctaPrimaryHref,
    ctaSecondaryHref,
    canonicalPath,
    altPath,
  }: {
    comparison: Comparison;
    locale: Locale;
    /** Path prefix for sibling comparisons, e.g. "/compare". */
    basePath: string;
    /** Home for this locale. */
    homePath: string;
    /** The comparison index for this locale. Omitted while a locale has none. */
    indexPath?: string;
    others: { slug: string; heading: string }[];
    lastVerified: string;
    /** Where "send a file" goes. */
    ctaPrimaryHref: string;
    ctaSecondaryHref: string;
    /** The English address of this comparison; the head tags work out the rest from it. */
    canonicalPath: string;
    /** The same page in the other language, when it exists. */
    altPath?: string;
  } = $props();

  const c = $derived(comparison);
  const t = $derived(compareStrings[locale]);
  const path = $derived(`${basePath}/${c.slug}`);
  const canonical = $derived(`${SITE_URL}${path}`);
  // Keyed by the English slug, which the English address ends in.
  const choose = $derived(CHOOSE[canonicalPath.split("/").pop() ?? ""]?.[locale]);
  const verifiedIso = $derived(
    c.verifiedIso ?? (c.kind && c.kind !== "send" ? RECEIVING_VERIFIED_ISO : LAST_VERIFIED_ISO),
  );

  // Breadcrumb + FAQ structured data, prerendered into the static HTML.
  const jsonLd = $derived(
    JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": canonical,
          url: canonical,
          name: c.metaTitle,
          description: c.metaDescription,
          inLanguage: HTML_LANG[locale],
          dateModified: verifiedIso,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          publisher: { "@id": ORG_ID },
          about: [{ "@id": APP_ID }, { "@type": "SoftwareApplication", name: c.competitor }],
        },
        organizationNode(),
        applicationNode(homeMessages[locale].schemaFeatures),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: t.breadcrumbHome,
              item: `${SITE_URL}${homePath}`,
            },
            ...(indexPath
              ? [
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: t.breadcrumbCompare,
                    item: `${SITE_URL}${indexPath}`,
                  },
                ]
              : []),
            {
              "@type": "ListItem",
              position: indexPath ? 3 : 2,
              name: c.heading,
              item: canonical,
            },
          ],
        },
        {
          "@type": "FAQPage",
          inLanguage: HTML_LANG[locale],
          mainEntity: c.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    }).replace(/</g, "\\u003c"),
  );
</script>

<Seo
  title={c.metaTitle}
  description={c.metaDescription}
  path={canonicalPath}
/>

<svelte:head>
  <link rel="alternate" type="text/markdown" href={`${SITE_URL}${comparisonMarkdownPath(c.slug)}`} />
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

{#snippet cell(v: Cell)}
  {#if typeof v === "boolean"}
    <span class="inline-flex items-center">
      <span class="inline-flex" aria-hidden="true">
        {#if v}
          <IconCheckRegular class="size-5 text-primary" />
        {:else}
          <IconXRegular class="size-5 text-muted-foreground/40" />
        {/if}
      </span>
      <span class="sr-only">{v ? t.yes : t.no}</span>
    </span>
  {:else}
    <span class="text-sm">{v}</span>
  {/if}
{/snippet}

<PageLayout width="5xl">
  <div class="mb-8 flex items-center justify-between gap-4">
    <nav class="text-sm text-muted-foreground" aria-label="Breadcrumb">
      <a
        href={homePath}
        class="hover:text-foreground transition-colors duration-200 ease-out"
        >{t.breadcrumbHome}</a
      >
      <span class="mx-2" aria-hidden="true">/</span>
      {#if indexPath}
        <a
          href={indexPath}
          class="hover:text-foreground transition-colors duration-200 ease-out"
          >{t.breadcrumbCompare}</a
        >
        <span class="mx-2" aria-hidden="true">/</span>
      {/if}
      <span class="text-foreground">{c.shortName}</span>
    </nav>

    {#if altPath}
      <a
        href={altPath}
        hreflang={locale === "en" ? "nl" : "en"}
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 ease-out hover:bg-card hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span class="inline-flex" aria-hidden="true">
          <IconTranslateRegular class="size-4" />
        </span>
        {t.otherLanguage}
      </a>
    {/if}
  </div>

  <header class="mb-10 max-w-2xl">
    <h1
      class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground"
      style="letter-spacing: -0.02em"
    >
      {c.heading}
    </h1>
    <p class="mt-3 text-lg text-muted-foreground leading-relaxed">{c.summary}</p>
  </header>

  <div
    class="prose-tessil max-w-2xl space-y-4 text-muted-foreground leading-relaxed"
  >
    {#each c.intro as paragraph}
      <p>{paragraph}</p>
    {/each}
  </div>

  <!-- Comparison table -->
  <div class="mt-10 overflow-x-auto rounded-xl border border-border bg-card/60">
    <table class="w-full border-collapse text-left">
      <caption class="sr-only">{t.tableCaption(c.competitor)}</caption>
      <thead>
        <tr class="border-b border-border">
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">
            {t.feature}
          </th>
          <th scope="col" class="py-3.5 px-5 text-sm font-semibold text-foreground">Tessil</th>
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">
            {c.competitor}
          </th>
        </tr>
      </thead>
      <tbody>
        {#each c.rows as row (row.label)}
          <tr class="border-b border-border/50 last:border-0">
            <th scope="row" class="py-3.5 px-5 text-sm font-normal text-foreground align-top">
              {row.label}
            </th>
            <td class="py-3.5 px-5 align-top">{@render cell(row.tessil)}</td>
            <td class="py-3.5 px-5 align-top text-muted-foreground">
              {@render cell(row.competitor)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="mt-3 text-xs text-muted-foreground/80">
    {t.lastVerified(c.competitor, lastVerified)}
  </p>

  {#if choose}
    <section class="mt-12 max-w-3xl">
      <h2 class="text-xl font-semibold text-foreground">{t.chooseHeading}</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {#each [{ title: t.chooseThem(c.competitor), items: choose.them }, { title: t.chooseTessil, items: choose.tessil }] as side (side.title)}
          <div class="rounded-xl border border-border bg-card/60 p-5">
            <h3 class="text-sm font-semibold text-foreground">{side.title}</h3>
            <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {#each side.items as item (item)}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Verdict -->
  <section class="mt-12 max-w-2xl">
    <h2 class="text-xl font-semibold text-foreground">{t.verdictHeading}</h2>
    <div class="mt-3 space-y-4 text-muted-foreground leading-relaxed">
      {#each c.verdict as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>
  </section>

  <!-- CTA -->
  <div class="mt-10 flex flex-wrap items-center gap-3">
    <Button href={ctaPrimaryHref} variant="primary" fullWidth={false}>
      {c.cta?.label ?? t.ctaPrimary}
    </Button>
    <Button href={ctaSecondaryHref} variant="secondary" fullWidth={false}>
      {t.ctaSecondary}
    </Button>
  </div>

  <!-- FAQ -->
  <section class="mt-14 max-w-2xl">
    <h2 class="text-xl font-semibold text-foreground">{t.faqHeading}</h2>
    <div class="mt-4 divide-y divide-border/60 border-y border-border/60">
      {#each c.faq as item (item.q)}
        <details class="group py-4">
          <summary
            class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden"
          >
            {item.q}
            <span
              class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45"
              aria-hidden="true">+</span
            >
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">{item.a}</p>
        </details>
      {/each}
    </div>
  </section>

  <!-- Other comparisons -->
  {#if others.length > 0}
    <section class="mt-14">
      <h2 class="text-sm font-medium text-muted-foreground">{t.moreHeading}</h2>
      <ul class="mt-3 flex flex-wrap gap-2">
        {#each others as o (o.slug)}
          <li>
            <a
              href="{basePath}/{o.slug}"
              class="inline-block rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-card focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {o.heading}
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <SiteFooter />
</PageLayout>
