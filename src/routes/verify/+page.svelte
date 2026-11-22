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
      "seoTitle": "Verify it yourself - Tessil",
      "description": "Check Tessil's zero-knowledge claim yourself in about two minutes, using the developer tools already in your browser. No code reading required.",
      "title": "Verify it yourself",
      "tagline": "Every encrypted transfer service claims it cannot read your files. Here is how to check ours, in about two minutes, with tools already in your browser."
    },
    "nl": {
      "seoTitle": "Controleer het zelf - Tessil",
      "description": "Controleer zelf in ongeveer twee minuten dat Tessil je bestanden niet kan lezen, met de ontwikkelaarstools die al in je browser zitten. Geen code lezen nodig.",
      "title": "Controleer het zelf",
      "tagline": "Elke dienst voor versleuteld versturen zegt dat hij je bestanden niet kan lezen. Zo controleer je dat bij ons, in ongeveer twee minuten, met tools die al in je browser zitten."
    }
  };
  const m = $derived(meta[locale]);
</script>

<Seo title={m.seoTitle} description={m.description} path="/verify" />

<ProsePage title={m.title} tagline={m.tagline} current="verify">
  {#if locale === "nl"}
    <Nl />
  {:else}
    <En />
  {/if}
</ProsePage>
