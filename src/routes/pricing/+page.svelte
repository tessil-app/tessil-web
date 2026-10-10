<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import Button from "$lib/components/Button.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import {
    BILLING_EMAIL,
    BILLING_PORTAL_URL,
    PASS_PRICE,
    PLAN_PRICE,
  } from "$lib/config/pricing";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  const passBullets = [
    "One transfer, up to 2 GB",
    "Kept for up to 30 days, your choice",
    "No account and nothing recurring",
    "Password protection and download limits included",
  ];

  const planBullets = [
    "No fee per transfer",
    "Up to 2 GB per transfer, kept for up to 30 days",
    "Fair use: 100 transfers a day, 100 GB a month",
    "A dashboard of what you've sent, plus passkeys and encrypted titles",
    "Cancel any time, in one click",
  ];

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo
  title="Pricing - Tessil"
  description="Sending with Tessil costs {PASS_PRICE} per transfer with no account, or {PLAN_PRICE} a month. Receiving is free. No ads, no trackers, cancel in one click."
  path="/pricing"
/>

<PageLayout width="3xl">
  <PageHeader
    title="Pricing"
    tagline="Sending is paid. Receiving is free. Encryption is the same for everyone."
  />

  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-4">
            <h2 class="text-xl font-semibold text-foreground">
              Single transfer
            </h2>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-semibold text-foreground">{PASS_PRICE}</span>
              <span class="text-sm text-muted-foreground">once, no account</span>
            </div>
            <ul class="space-y-2">
              {#each passBullets as bullet (bullet)}
                <li class="flex items-start gap-2 text-sm text-foreground">
                  <IconCheckRegular
                    class="size-4 mt-0.5 text-muted-foreground shrink-0"
                  />
                  <span>{bullet}</span>
                </li>
              {/each}
            </ul>
          </div>
        </Frame.Panel>
      </Frame.Root>

      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-4">
            <h2 class="text-xl font-semibold text-foreground">Monthly</h2>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-semibold text-foreground">{PLAN_PRICE}</span>
              <span class="text-sm text-muted-foreground">a month, with an account</span>
            </div>
            <ul class="space-y-2">
              {#each planBullets as bullet (bullet)}
                <li class="flex items-start gap-2 text-sm text-foreground">
                  <IconCheckRegular
                    class="size-4 mt-0.5 text-primary shrink-0"
                  />
                  <span>{bullet}</span>
                </li>
              {/each}
            </ul>
          </div>
        </Frame.Panel>
      </Frame.Root>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <Button href="/" fullWidth={false}>Send a file</Button>
      <p class="text-sm text-muted-foreground">
        You pick one of the two when you create the share link.
      </p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-8">
          <section class={sectionClass}>
            <h2 class={headingClass}>Receiving is free</h2>
            <p class={bodyClass}>
              Whoever you send a link to downloads without paying and without
              an account. The price is only ever on the sending side.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>Paying does not change the encryption</h2>
            <p class={bodyClass}>
              Every transfer is encrypted in your browser and the key stays in
              the link, on both options above. Payment buys the upload, not a
              better grade of privacy. The
              <a href="/verify" class={linkClass}>verify page</a> shows how to
              check that yourself.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>How payment works, and what we learn from it</h2>
            <p class={bodyClass}>
              Payments are handled by Polar, who act as the merchant of record:
              they take the card details, charge VAT, and send the receipt.
              Checkout opens on Polar's site in a new tab. Nothing from Polar is
              loaded on tessil.app, so the list of hosts this site talks to is
              unchanged.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1.5 ml-4">
              <li>
                <strong class="font-medium text-foreground">Single transfer:</strong>
                no account is created and we never receive your name, email or
                card. Your browser holds a one-time token for the pass. We keep
                a record that a pass was paid for and used, and we do not store
                which pass paid for which transfer.
              </li>
              <li>
                <strong class="font-medium text-foreground">Monthly:</strong>
                tied to your Tessil account, because that is how we know you
                are subscribed. We store the subscription status and its
                renewal date, nothing about the card.
              </li>
            </ul>
            <p class={bodyClass}>
              Polar does know who paid. If paying anonymously matters more to
              you than using this service, that is a real limit and you should
              know it before you pay.
            </p>
          </section>

          <section class={sectionClass} id="cancel" style="scroll-margin-top: 5rem">
            <h2 class={headingClass}>Cancelling and refunds</h2>
            <p class={bodyClass}>
              Cancelling the monthly plan takes under a minute, on your own, at
              any time. No notice period, no retention offer, and nobody will
              ask you why.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1.5 ml-4">
              <li>
                <strong class="font-medium text-foreground">From Tessil:</strong>
                sign in, open Settings, then Usage, and choose "Manage or
                cancel".
              </li>
              <li>
                <strong class="font-medium text-foreground">From Polar:</strong>
                every receipt email links to the customer portal. You can also
                open
                <a
                  href={BILLING_PORTAL_URL}
                  rel="noopener noreferrer"
                  class={linkClass}>the portal</a
                >
                directly and sign in with the email you paid with.
              </li>
            </ul>
            <p class={bodyClass}>
              After you cancel, the plan runs until the end of the month you
              already paid for and then stops. It does not renew, and transfers
              you already sent stay up until they expire.
            </p>
            <p class={bodyClass}>
              A single-transfer pass is charged once and is not recurring, so
              there is nothing to cancel. A pass you paid for and have not used
              stays valid in the browser you bought it in.
            </p>
            <p class={bodyClass}>
              If a charge looks wrong, a payment went through and the transfer
              did not, or the plan renewed after you meant to stop, email
              <a href="mailto:{BILLING_EMAIL}" class={linkClass}>{BILLING_EMAIL}</a>.
              I will sort it out and refund it.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>What changed</h2>
            <p class={bodyClass}>
              Until October 2026 sending with Tessil was free, and this page
              said it would stay that way. It did not: a free service run out
              of one person's pocket was not going to last, and donations did
              not cover it. I would rather charge a small, plain price than
              take ads or investors, or quietly shut it down.
            </p>
            <p class={bodyClass}>
              What has not changed: no ads, no trackers, no third-party
              scripts, open source, and encryption that we cannot undo.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>Teams and businesses</h2>
            <p class={bodyClass}>
              There is no team plan yet. If your organisation needs seats, a
              data processing agreement or an audit log, mail
              <a href="mailto:{BILLING_EMAIL}" class={linkClass}>{BILLING_EMAIL}</a>
              and say what you need. Those requests decide what gets built.
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>
  </div>

  <SiteFooter current="pricing" />
</PageLayout>
