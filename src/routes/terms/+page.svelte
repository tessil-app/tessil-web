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
    "en": {
      "seoTitle": "Terms of Service - Tessil",
      "description": "Tessil terms of service: usage, limits, acceptable use, legal compliance. End-to-end encrypted file transfer.",
      "title": "Terms of Service",
      "tagline": "End-to-end encrypted file transfer.",
      "updated": "November 18, 2026"
    },
    "nl": {
      "seoTitle": "Gebruiksvoorwaarden - Tessil",
      "description": "De gebruiksvoorwaarden van Tessil: gebruik, grenzen, toegestaan gebruik, naleving van de wet. End-to-end versleuteld bestanden versturen.",
      "title": "Gebruiksvoorwaarden",
      "tagline": "End-to-end versleuteld bestanden versturen.",
      "updated": "18 november 2026"
    }
  };
  const m = $derived(meta[locale]);
</script>

<Seo title={m.seoTitle} description={m.description} path="/terms" />

<ProsePage title={m.title} tagline={m.tagline} updated={m.updated} current="terms">
  {#if locale === "nl"}
    <Nl />
  {:else}
    <En />
  {/if}
</ProsePage>
