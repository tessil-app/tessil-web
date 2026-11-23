<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import Button from "$lib/components/Button.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import {
    SUPPORT_EMAIL,
    SUPPORT_POLAR_PORTAL_URL,
  } from "$lib/config/support";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { hrefFor } from "$lib/i18n/paths";
  import { thanksMessages } from "$lib/i18n/messages/thanks";

  const locale = $derived(appLocale());
  const t = $derived(thanksMessages[locale]);

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout width="3xl">
  <PageHeader
    title={t.title}
    tagline={t.tagline}
  />

  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-8">
        <section class={sectionClass}>
          <h2 class={headingClass}>{t.sameEmailTitle}</h2>
          <p class={bodyClass}>{t.sameEmail1}</p>
          <p class={bodyClass}>{t.sameEmail2}</p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>{t.receiptTitle}</h2>
          <p class={bodyClass}>{t.receipt}</p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>{t.stopTitle}</h2>
          <p class={bodyClass}>
            {t.stopBefore}
            <a href={SUPPORT_POLAR_PORTAL_URL} rel="noopener noreferrer" class={linkClass}>{t.portal}</a
            >{t.stopAfter}
          </p>
          <p class={bodyClass}>
            {t.missingBefore}
            <a href="mailto:{SUPPORT_EMAIL}" class={linkClass}>{SUPPORT_EMAIL}</a
            >{t.missingAfter}
            <a href="{hrefFor('/pricing', locale)}#cancel" class={linkClass}>{t.pricingPage}</a>.
          </p>
        </section>

        <div class="pt-2">
          <Button href={hrefFor("/", locale)} fullWidth={false}>{t.back}</Button>
        </div>
      </div>
    </Frame.Panel>
  </Frame.Root>

  <SiteFooter />
</PageLayout>
