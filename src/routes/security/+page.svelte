<script lang="ts">
  // The text is in content/, one file per language with the same sections.

  import { page } from "$app/state";
  import ProsePage from "$lib/components/ProsePage.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { localeFromPath } from "$lib/i18n/locale";
  import En from "./content/en.svelte";
  import Nl from "./content/nl.svelte";

  const locale = $derived(localeFromPath(page.url.pathname));
  const meta = {
    en: {
      seoTitle: "Security Overview - Tessil",
      description: "How Tessil's encryption works, what we can and cannot see, and how to report vulnerabilities.",
      title: "Security Overview",
      tagline: "How end-to-end encryption works on Tessil, and how to report a vulnerability.",
      updated: "November 18, 2026",
    },
    nl: {
      seoTitle: "Beveiliging - Tessil",
      description: "Hoe de versleuteling van Tessil werkt, wat wij wel en niet kunnen zien, en hoe je een kwetsbaarheid meldt.",
      title: "Beveiliging",
      tagline: "Hoe end-to-end versleuteling werkt bij Tessil, en hoe je een kwetsbaarheid meldt.",
      updated: "18 november 2026",
    },
  };
  const m = $derived(meta[locale]);
</script>

<Seo title={m.seoTitle} description={m.description} path="/security" />

<ProsePage title={m.title} tagline={m.tagline} updated={m.updated} current="security">
  {#if locale === "nl"}
    <Nl />
  {:else}
    <En />
  {/if}
</ProsePage>
