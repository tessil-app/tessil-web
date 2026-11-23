<script lang="ts">
  import { page } from "$app/state";
  import { SITE_URL } from "$lib/config/site";
  import { DEFAULT_LOCALE, HTML_LANG, localeFromPath, type Locale } from "$lib/i18n/locale";
import { alternatesOf, hrefFor, localizedPath } from "$lib/i18n/paths";
  import { homeMessages } from "$lib/i18n/messages/home";
  import { APP_ID, applicationNode, ORG_ID, organizationNode } from "$lib/seo/schema";

  // Per-page head tags. Every route renders exactly one of these: app.html
  // holds only tags that never vary, so the first <title> in document order is
  // always the route's own.
  //
  // `path` is the page's English address. In another language the canonical
  // link points at that language's address, and every language the page has
  // is listed for search engines; both come from src/lib/i18n/routes.js.
  const INDEXABLE =
    "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";
  const NOINDEX = "noindex, nofollow, noarchive, nosnippet";

  let {
    title,
    description = "",
    path = "",
    robots = "index",
    alternates,
    structured = true,
    product = false,
  }: {
    title: string;
    description?: string;
    /** The page's English address, e.g. "/privacy". Emits canonical + og:url. Omit on noindex routes. */
    path?: string;
    robots?: "index" | "noindex";
    /** Only for pages whose pairs are not in routes.js; normally left out. */
    alternates?: { locale: Locale; path: string }[];
    /** False on pages that write their own structured data. */
    structured?: boolean;
    /** The page is about the product itself: its plans go in as offers. */
    product?: boolean;
  } = $props();

  const locale = $derived(localeFromPath(page.url.pathname));
  const robotsContent = $derived(robots === "noindex" ? NOINDEX : INDEXABLE);
  const here = $derived(path ? (localizedPath(path, locale) ?? path) : "");
  const canonical = $derived(here ? `${SITE_URL}${here}` : "");
  const pairs = $derived(alternates ?? (path ? alternatesOf(path) : []));
  const xDefault = $derived(pairs.find((a) => a.locale === DEFAULT_LOCALE)?.path);

  // What every indexable page tells search engines about itself: the page,
  // who publishes it, and where it sits under the homepage.
  const jsonLd = $derived.by(() => {
    if (!structured || !canonical || robots === "noindex") return "";
    const name = title.replace(/\s+-\s+Tessil$/, "");
    return JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": canonical,
          url: canonical,
          name,
          ...(description ? { description } : {}),
          inLanguage: HTML_LANG[locale],
          isPartOf: { "@id": `${SITE_URL}/#website` },
          publisher: { "@id": ORG_ID },
          about: { "@id": APP_ID },
        },
        organizationNode(),
        ...(product ? [applicationNode(homeMessages[locale].schemaFeatures)] : []),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Tessil", item: `${SITE_URL}${hrefFor("/", locale)}` },
            { "@type": "ListItem", position: 2, name, item: canonical },
          ],
        },
      ],
    }).replace(/</g, "\\u003c");
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="robots" content={robotsContent} />
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
  {#if description}
    <meta name="description" content={description} />
    <meta property="og:description" content={description} />
    <meta name="twitter:description" content={description} />
  {/if}
  {#if canonical}
    <link rel="canonical" href={canonical} />
    <meta property="og:url" content={canonical} />
  {/if}
  <meta property="og:locale" content={locale === "nl" ? "nl_NL" : "en_GB"} />
  {#each pairs as alt (alt.locale)}
    <link
      rel="alternate"
      hreflang={HTML_LANG[alt.locale]}
      href={`${SITE_URL}${alt.path}`}
    />
  {/each}
  {#if xDefault}
    <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${xDefault}`} />
  {/if}
  {#if jsonLd}
    {@html `<script type="application/ld+json">${jsonLd}</script>`}
  {/if}
</svelte:head>
