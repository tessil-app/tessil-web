<script lang="ts">
  import { page } from "$app/state";
  import { SITE_URL } from "$lib/config/site";
  import { DEFAULT_LOCALE, HTML_LANG, localeFromPath, type Locale } from "$lib/i18n/locale";
import { alternatesOf, localizedPath } from "$lib/i18n/paths";

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
  }: {
    title: string;
    description?: string;
    /** The page's English address, e.g. "/privacy". Emits canonical + og:url. Omit on noindex routes. */
    path?: string;
    robots?: "index" | "noindex";
    /** Only for pages whose pairs are not in routes.js; normally left out. */
    alternates?: { locale: Locale; path: string }[];
  } = $props();

  const locale = $derived(localeFromPath(page.url.pathname));
  const robotsContent = $derived(robots === "noindex" ? NOINDEX : INDEXABLE);
  const here = $derived(path ? (localizedPath(path, locale) ?? path) : "");
  const canonical = $derived(here ? `${SITE_URL}${here}` : "");
  const pairs = $derived(alternates ?? (path ? alternatesOf(path) : []));
  const xDefault = $derived(pairs.find((a) => a.locale === DEFAULT_LOCALE)?.path);
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
</svelte:head>
