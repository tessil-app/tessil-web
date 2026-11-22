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
      "seoTitle": "Privacy Policy - Tessil",
      "description": "What data Tessil handles, how long, and your GDPR rights. End-to-end encrypted file transfer.",
      "title": "Privacy Policy",
      "tagline": "End-to-end encrypted file transfer.",
      "updated": "November 22, 2026"
    },
    "nl": {
      "seoTitle": "Privacybeleid - Tessil",
      "description": "Welke gegevens Tessil verwerkt, hoe lang, en je rechten onder de AVG. End-to-end versleuteld bestanden versturen.",
      "title": "Privacybeleid",
      "tagline": "End-to-end versleuteld bestanden versturen.",
      "updated": "22 november 2026"
    }
  };
  const m = $derived(meta[locale]);
</script>

<Seo title={m.seoTitle} description={m.description} path="/privacy" />

<ProsePage title={m.title} tagline={m.tagline} updated={m.updated} current="privacy">
  {#if locale === "nl"}
    <Nl />
  {:else}
    <En />
  {/if}
</ProsePage>
