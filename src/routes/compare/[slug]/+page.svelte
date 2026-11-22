<script lang="ts">
  // A comparison in English at /compare/<slug>, or in Dutch at the address
  // routes.js gives it, when a Dutch version exists. Both are served here.
  import { page } from "$app/state";
  import ComparisonPage from "$lib/components/ComparisonPage.svelte";
  import { LAST_VERIFIED, comparisons } from "$lib/compare/comparisons";
  import { LAST_VERIFIED_NL, comparisonsNl, getComparisonNl, nlSlugForEn } from "$lib/compare/comparisons.nl";
  import { localeFromPath } from "$lib/i18n/locale";
import { hrefFor, localizedPath } from "$lib/i18n/paths";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const locale = $derived(localeFromPath(page.url.pathname));
  const canonical = $derived(`/compare/${data.comparison.slug}`);
  const dutch = $derived.by(() => {
    if (locale !== "nl") return null;
    const slug = nlSlugForEn(data.comparison.slug);
    return slug ? (getComparisonNl(slug) ?? null) : null;
  });
  const c = $derived(dutch ?? data.comparison);

  const others = $derived(
    dutch
      ? comparisonsNl.filter((x) => x.slug !== dutch.slug).map((x) => ({ slug: x.slug, heading: x.heading }))
      : comparisons.filter((x) => x.slug !== c.slug).map((x) => ({ slug: x.slug, heading: x.heading })),
  );

  // The same page in the other language, when it has one.
  const altPath = $derived(
    dutch ? canonical : (localizedPath(canonical, "nl") ?? undefined),
  );
</script>

<ComparisonPage
  comparison={c}
  locale={dutch ? "nl" : "en"}
  basePath={dutch ? "/nl/vergelijken" : "/compare"}
  homePath={hrefFor("/", dutch ? "nl" : "en")}
  indexPath={dutch ? undefined : "/compare"}
  {others}
  lastVerified={dutch ? LAST_VERIFIED_NL : LAST_VERIFIED}
  ctaPrimaryHref={hrefFor("/", dutch ? "nl" : "en")}
  ctaSecondaryHref="/security"
  canonicalPath={canonical}
  {altPath}
/>
