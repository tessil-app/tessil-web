<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import Button from "$lib/components/Button.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { BILLING_EMAIL, BILLING_PORTAL_URL } from "$lib/config/pricing";

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo title="Payment received - Tessil" robots="noindex" />

<PageLayout width="3xl">
  <PageHeader
    title="Payment received"
    tagline="You can close this tab. The page with your files picks up on its own."
  />

  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-8">
        <section class={sectionClass}>
          <h2 class={headingClass}>Go back to your upload</h2>
          <p class={bodyClass}>
            The tab where you chose your files is waiting for this payment and
            continues within a few seconds. If you closed it, open Tessil in
            this same browser, add your files again and send: a paid pass is
            remembered until it is used, and a subscription is on your account.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Your receipt</h2>
          <p class={bodyClass}>
            Polar handles the payment and emails you a receipt. A single
            transfer is charged once and never again. The monthly plan renews
            on the same date each month until you stop it.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Stopping the monthly plan</h2>
          <p class={bodyClass}>
            Under a minute, on your own, whenever you want. No notice period
            and no retention offer. Use "Manage or cancel" under Settings, then
            Usage, or open
            <a
              href={BILLING_PORTAL_URL}
              rel="noopener noreferrer"
              class={linkClass}>the customer portal</a
            >, which is also linked from every receipt. The plan runs to the end
            of the month you already paid for.
          </p>
          <p class={bodyClass}>
            If something went wrong or a charge looks off, mail
            <a href="mailto:{BILLING_EMAIL}" class={linkClass}>{BILLING_EMAIL}</a>
            and I will fix it or refund it. Full detail on the
            <a href="/pricing#cancel" class={linkClass}>pricing page</a>.
          </p>
        </section>

        <div class="pt-2">
          <Button href="/" fullWidth={false}>Back to Tessil</Button>
        </div>
      </div>
    </Frame.Panel>
  </Frame.Root>

  <SiteFooter />
</PageLayout>
