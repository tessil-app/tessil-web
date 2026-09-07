<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import {
    SUPPORT_EMAIL,
    SUPPORT_GITHUB_SPONSORS_URL,
    SUPPORT_KOFI_URL,
    SUPPORT_POLAR_MONTHLY_URL,
    SUPPORT_POLAR_ONETIME_URL,
    SUPPORT_POLAR_PORTAL_URL,
  } from "$lib/config/support";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  const anonymousBullets = [
    "500 MB per file and per transfer",
    "500 MB a month",
    "5 transfers a day",
    "Expiry up to 24 hours",
  ];

  const accountBullets = [
    "1 GiB per file and per transfer",
    "2 GB a month",
    "20 transfers a day",
    "Expiry up to 72 hours",
    "A dashboard of what you've sent, plus passkeys and encrypted titles",
  ];

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo
  title="Pricing - Tessil"
  description="Tessil is free. What the free tier includes, what it costs to run, and how you can support it. No trackers, no paywall on encryption."
  path="/pricing"
/>

<PageLayout width="3xl">
  <PageHeader
    title="Pricing"
    tagline="Tessil is free. Here is what that includes, what it costs to run, and how it stays that way."
  />

  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-4">
            <h2 class="text-xl font-semibold text-foreground">
              Without an account
            </h2>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-semibold text-foreground">€0</span>
              <span class="text-sm text-muted-foreground">no sign-up</span>
            </div>
            <ul class="space-y-2">
              {#each anonymousBullets as bullet (bullet)}
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
            <h2 class="text-xl font-semibold text-foreground">
              With a free account
            </h2>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-semibold text-foreground">€0</span>
              <span class="text-sm text-muted-foreground">still free</span>
            </div>
            <ul class="space-y-2">
              {#each accountBullets as bullet (bullet)}
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

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-8">
          <section class={sectionClass}>
            <h2 class={headingClass}>Encryption is not the paid part</h2>
            <p class={bodyClass}>
              End-to-end encryption, password-protected transfers, passkeys, and
              automatic expiry are on both columns above. They are the product,
              not an upsell. Nothing on this site puts your privacy behind a
              payment, and nothing ever will.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>Why the limits exist</h2>
            <p class={bodyClass}>
              Not to nudge you toward a paid plan, because there isn't one. The
              software costs nothing to run again for one more person, but
              storage and bandwidth do, and they are paid for out of one
              person's pocket: servers in Germany and the Netherlands, object
              storage, transactional email, a domain.
            </p>
            <p class={bodyClass}>
              The caps are set where they are so the service survives a bad week
              without becoming someone's free CDN. If you hit them regularly and
              they are in your way,
              <a href="mailto:hello@tessil.app" class={linkClass}
                >tell me about it</a
              >. Knowing which limit actually bites is more useful than guessing.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>If you want to support it</h2>
            <p class={bodyClass}>
              Entirely optional, and it unlocks nothing. There is no supporter
              badge and no hidden feature, because a privacy tool that treats
              paying users better is one that has started measuring who pays.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>
                Polar,
                <a
                  href={SUPPORT_POLAR_MONTHLY_URL}
                  rel="noopener noreferrer"
                  class={linkClass}>monthly</a
                >
                or
                <a
                  href={SUPPORT_POLAR_ONETIME_URL}
                  rel="noopener noreferrer"
                  class={linkClass}>one-time</a
                >, whatever amount you pick
              </li>
              <li>
                <a
                  href={SUPPORT_KOFI_URL}
                  rel="noopener noreferrer"
                  class={linkClass}>Ko-fi</a
                >, for a one-time tip
              </li>
              <li>
                <a
                  href={SUPPORT_GITHUB_SPONSORS_URL}
                  rel="noopener noreferrer"
                  class={linkClass}>GitHub Sponsors</a
                >, monthly or one-off
              </li>
            </ul>
            <p class={bodyClass}>
              If you have a Tessil account, check out with the same email
              address. Nothing depends on it today, but it is the only thing
              that ties a contribution to an account, so it keeps the option
              open.
            </p>
            <p class={bodyClass}>
              Honestly, telling one person who needs encrypted file transfer
              that this exists helps more than a few euros does.
            </p>
          </section>

          <section class={sectionClass} id="cancel" style="scroll-margin-top: 5rem">
            <h2 class={headingClass}>Cancelling monthly support</h2>
            <p class={bodyClass}>
              Under a minute, on your own, at any time. No notice period, no
              retention offer, and nobody will ask you why.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1.5 ml-4">
              <li>
                <strong class="font-medium text-foreground">Polar:</strong> every
                receipt email links to the customer portal. Open
                <a
                  href={SUPPORT_POLAR_PORTAL_URL}
                  rel="noopener noreferrer"
                  class={linkClass}>the portal</a
                >, cancel there, and it stops at the end of the period you have
                already paid for.
              </li>
              <li>
                <strong class="font-medium text-foreground">GitHub Sponsors:</strong>
                cancel from your GitHub sponsorship settings, same as any other
                sponsorship.
              </li>
              <li>
                <strong class="font-medium text-foreground">Ko-fi:</strong> a
                one-time tip is not recurring, so there is nothing to cancel.
              </li>
            </ul>
            <p class={bodyClass}>
              If the portal link has gone missing or a charge looks wrong, email
              <a href="mailto:{SUPPORT_EMAIL}" class={linkClass}>{SUPPORT_EMAIL}</a>.
              I will cancel it for you, and refund the last payment if it renewed
              after you meant to stop.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>Sponsorship and advertising</h2>
            <p class={bodyClass}>
              I am open to a sponsor placement if you run something a
              privacy-minded audience would genuinely want. The conditions are
              not negotiable, because the promise is the product:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1.5 ml-4">
              <li>
                Static text or an image, served from tessil.app. No third-party
                script, no iframe, no pixel, no beacon. Nothing that makes a
                request to anyone but us.
              </li>
              <li>
                No tracking, no profiling, no personalisation. You are buying a
                placement, not an audience segment. I cannot tell you who saw it
                because I do not collect that.
              </li>
              <li>
                Marketing pages only. Nothing appears on a download page. That
                URL contains a decryption key and I am not putting anyone else's
                content near it.
              </li>
              <li>Labelled plainly as a sponsor, never dressed up as content.</li>
            </ul>
            <p class={bodyClass}>
              That rules out essentially every ad network, which is the point.
              If it still sounds like a fit:
              <a href="mailto:hello@tessil.app" class={linkClass}
                >hello@tessil.app</a
              >.
            </p>
          </section>

          <section class={sectionClass}>
            <h2 class={headingClass}>Will there be a paid plan?</h2>
            <p class={bodyClass}>
              Probably, eventually, for people who need higher limits or longer
              retention than the free caps allow. Two commitments if that
              happens: nothing available on Free today moves behind it, and
              encryption, passkeys, and password protection stay free forever.
            </p>
            <p class={bodyClass}>
              Until then there is nothing to buy here and no upgrade prompt to
              dodge.
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>
  </div>

  <SiteFooter current="pricing" />
</PageLayout>
