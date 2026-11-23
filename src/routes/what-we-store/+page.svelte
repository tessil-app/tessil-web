<script lang="ts">
  // What an account adds and stores, in plain words, for people deciding
  // whether to make one. Every line here is stated in more detail, and
  // binding, in the privacy policy.

  import { page } from "$app/state";
  import ProsePage from "$lib/components/ProsePage.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { localeFromPath } from "$lib/i18n/locale";
  import { whatWeStoreMessages } from "$lib/i18n/messages/whatWeStore";
  import { hrefFor } from "$lib/i18n/paths";

  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(whatWeStoreMessages[locale]);
  const href = (canonical: string) => hrefFor(canonical, locale);
  const never = $derived([...t.never, ...(PORTALS_ANNOUNCED ? [t.neverPortals] : [])]);
</script>

<Seo title={t.seoTitle} description={t.description} path="/what-we-store" />

<ProsePage title={t.title} tagline={t.tagline} updated={t.updated} current="data">
  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">{t.shortTitle}</h2>
    <p class="text-muted-foreground">{t.short}</p>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">{t.storedTitle}</h2>
    <dl class="divide-y divide-border border-y border-border">
      {#each t.stored as row (row.what)}
        <div class="grid gap-1 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
          <dt class="font-medium text-foreground">{row.what}</dt>
          <dd class="text-muted-foreground">{row.why}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">{t.neverTitle}</h2>
    <p class="text-muted-foreground">{t.neverIntro}</p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      {#each never as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
    <p class="text-muted-foreground">
      {t.checkBefore}
      <TextLink href={href("/verify")}>{t.checkLink}</TextLink>.
    </p>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">{t.notTitle}</h2>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      {#each t.not as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">{t.takeTitle}</h2>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li><strong class="text-foreground">{t.downloadLead}</strong> {t.download}</li>
      <li><strong class="text-foreground">{t.deleteLead}</strong> {t.delete}</li>
    </ul>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">{t.fullTitle}</h2>
    <p class="text-muted-foreground">
      {t.fullBefore}
      <TextLink href={href("/privacy")}>{t.privacy}</TextLink>
      {t.fullMiddle}
      <TextLink href={href("/security")}>{t.security}</TextLink>
      {t.fullAfter}
    </p>
  </section>
</ProsePage>
