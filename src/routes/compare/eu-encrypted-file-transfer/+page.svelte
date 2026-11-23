<script lang="ts">
  // The roundup of European file transfer services. In Dutch at the address
  // routes.js gives it. Content in src/lib/compare/roundup.ts.
  import { page } from "$app/state";
  import Button from "$lib/components/Button.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { nlSlugForEn } from "$lib/compare/comparisons.nl";
  import {
    ROUNDUP_SERVICES,
    ROUNDUP_SLUG,
    ROUNDUP_VERIFIED_ISO,
    TIERS,
    roundupPath,
    roundupText,
  } from "$lib/compare/roundup";
  import { SITE_URL } from "$lib/config/site";
  import { HTML_LANG, localeFromPath } from "$lib/i18n/locale";
  import { compareStrings } from "$lib/i18n/messages";
  import { hrefFor } from "$lib/i18n/paths";
  import { APP_ID, ORG_ID, organizationNode } from "$lib/seo/schema";

  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(roundupText[locale]);
  const s = $derived(compareStrings[locale]);
  const canonical = $derived(`${SITE_URL}${roundupPath(locale)}`);
  const indexPath = $derived(hrefFor("/compare", locale));

  /** The full comparison with one service, in the reader's language. */
  function compareHref(enSlug: string): string {
    if (locale !== "nl") return `/compare/${enSlug}`;
    const slug = nlSlugForEn(enSlug);
    return slug ? `/nl/vergelijken/${slug}` : `/compare/${enSlug}`;
  }

  const jsonLd = $derived(
    JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": canonical,
          url: canonical,
          name: t.metaTitle,
          description: t.metaDescription,
          inLanguage: HTML_LANG[locale],
          dateModified: ROUNDUP_VERIFIED_ISO,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          publisher: { "@id": ORG_ID },
          about: { "@id": APP_ID },
          mainEntity: {
            "@type": "ItemList",
            name: t.heading,
            itemListElement: ROUNDUP_SERVICES.map((service, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: { "@type": "SoftwareApplication", name: service.name, description: service.note[locale] },
            })),
          },
        },
        organizationNode(),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: s.breadcrumbHome, item: `${SITE_URL}${hrefFor("/", locale)}` },
            { "@type": "ListItem", position: 2, name: s.breadcrumbCompare, item: `${SITE_URL}${indexPath}` },
            { "@type": "ListItem", position: 3, name: t.breadcrumb, item: canonical },
          ],
        },
        {
          "@type": "FAQPage",
          inLanguage: HTML_LANG[locale],
          mainEntity: t.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    }).replace(/</g, "\\u003c"),
  );
</script>

<Seo title={t.metaTitle} description={t.metaDescription} path="/compare/{ROUNDUP_SLUG}" structured={false} />

<svelte:head>
  <link rel="alternate" type="text/markdown" href="{SITE_URL}/compare/{roundupPath(locale).split('/').pop()}.md" />
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PageLayout width="5xl">
  <nav class="mb-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
    <a href={hrefFor("/", locale)} class="hover:text-foreground transition-colors duration-200 ease-out">{s.breadcrumbHome}</a>
    <span class="mx-2" aria-hidden="true">/</span>
    <a href={indexPath} class="hover:text-foreground transition-colors duration-200 ease-out">{s.breadcrumbCompare}</a>
    <span class="mx-2" aria-hidden="true">/</span>
    <span class="text-foreground">{t.breadcrumb}</span>
  </nav>

  <header class="mb-10 max-w-3xl">
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground" style="letter-spacing: -0.02em">
      {t.heading}
    </h1>
    <p class="mt-3 text-lg text-muted-foreground leading-relaxed">{t.summary}</p>
  </header>

  <div class="max-w-2xl space-y-4 text-muted-foreground leading-relaxed">
    {#each t.intro as paragraph (paragraph)}
      <p>{paragraph}</p>
    {/each}
  </div>

  {#each TIERS as tier (tier)}
    {@const services = ROUNDUP_SERVICES.filter((x) => x.tier === tier)}
    <section class="mt-12">
      <h2 class="max-w-3xl text-xl font-semibold text-foreground">{t.tiers[tier].title}</h2>
      <p class="mt-2 max-w-2xl text-muted-foreground leading-relaxed">{t.tiers[tier].body}</p>

      <div class="mt-5 overflow-x-auto rounded-xl border border-border bg-card/60">
        <table class="w-full min-w-[44rem] border-collapse text-left">
          <thead>
            <tr class="border-b border-border text-sm text-muted-foreground">
              <th scope="col" class="py-3.5 px-5 font-medium">{t.columns.service}</th>
              <th scope="col" class="py-3.5 px-5 font-medium">{t.columns.country}</th>
              <th scope="col" class="py-3.5 px-5 font-medium">{t.columns.free}</th>
              <th scope="col" class="py-3.5 px-5 font-medium">{t.columns.account}</th>
              <th scope="col" class="py-3.5 px-5 font-medium">{t.columns.openSource}</th>
            </tr>
          </thead>
          <tbody>
            {#each services as service (service.name)}
              <tr class="border-b border-border/50 last:border-0 align-top text-sm">
                <th scope="row" class="py-3.5 px-5 font-medium text-foreground">
                  {service.name}
                  <p class="mt-1 max-w-xs font-normal text-xs leading-relaxed text-muted-foreground">{service.note[locale]}</p>
                  {#if service.compare}
                    <a
                      href={compareHref(service.compare)}
                      class="mt-1.5 inline-block text-xs font-medium text-primary underline underline-offset-2"
                    >
                      {t.fullComparison}<span class="sr-only">: {service.name}</span>
                    </a>
                  {/if}
                </th>
                <td class="py-3.5 px-5 text-muted-foreground">{service.country[locale]}</td>
                <td class="py-3.5 px-5 text-muted-foreground">{service.free[locale]}</td>
                <td class="py-3.5 px-5 text-muted-foreground">{service.account[locale]}</td>
                <td class="py-3.5 px-5 text-muted-foreground">{service.openSource[locale]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/each}

  <p class="mt-4 max-w-2xl text-xs text-muted-foreground/80">{t.verified}</p>

  <section class="mt-12 max-w-2xl">
    <h2 class="text-xl font-semibold text-foreground">{t.pickTitle}</h2>
    <ul class="mt-3 list-disc space-y-2 pl-5 text-muted-foreground leading-relaxed">
      {#each t.pick as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
  </section>

  <div class="mt-10 flex flex-wrap items-center gap-3">
    <Button href={hrefFor("/", locale)} variant="primary" fullWidth={false}>{t.cta}</Button>
    <Button href={hrefFor("/security", locale)} variant="secondary" fullWidth={false}>{t.ctaSecondary}</Button>
  </div>

  <section class="mt-14 max-w-2xl">
    <h2 class="text-xl font-semibold text-foreground">{s.faqHeading}</h2>
    <div class="mt-4 divide-y divide-border/60 border-y border-border/60">
      {#each t.faq as item (item.q)}
        <details class="group py-4">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {item.q}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p class="mt-2 text-muted-foreground leading-relaxed">{item.a}</p>
        </details>
      {/each}
    </div>
  </section>

  <SiteFooter />
</PageLayout>
