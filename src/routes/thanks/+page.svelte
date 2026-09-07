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

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo title="Thank you - Tessil" robots="noindex" />

<PageLayout width="3xl">
  <PageHeader
    title="Thank you"
    tagline="That covers a real part of what it costs to run this."
  />

  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-8">
        <section class={sectionClass}>
          <h2 class={headingClass}>Use the same email as your account</h2>
          <p class={bodyClass}>
            If you checked out with the address you use for your Tessil account,
            nothing else is needed. Nothing depends on it today; it is simply the
            only thing that ties a contribution to an account.
          </p>
          <p class={bodyClass}>
            Checked out with a different address, or don't have an account yet?
            That is fine, and your support counts exactly the same.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Your receipt</h2>
          <p class={bodyClass}>
            Polar handles the payment and emails you a receipt. A monthly
            contribution renews on the same date each month until you stop it.
            A one-time contribution is exactly that: charged once, never again.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Stopping a monthly contribution</h2>
          <p class={bodyClass}>
            Under a minute, on your own, whenever you want. No notice period and
            no retention offer. Open
            <a
              href={SUPPORT_POLAR_PORTAL_URL}
              rel="noopener noreferrer"
              class={linkClass}>the customer portal</a
            >, which is also linked from every receipt, and cancel there. It
            stops at the end of the period you have already paid for.
          </p>
          <p class={bodyClass}>
            If the link has gone missing or a charge looks wrong, mail
            <a href="mailto:{SUPPORT_EMAIL}" class={linkClass}>{SUPPORT_EMAIL}</a
            >. I'll cancel it for you and refund the last payment if it renewed
            after you meant to stop. Full detail on the
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
