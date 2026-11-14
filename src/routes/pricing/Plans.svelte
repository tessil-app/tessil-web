<script lang="ts">
  // The pricing page once the paid plans are on sale.

  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import PlanCards from "$lib/components/PlanCards.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { api, ApiError } from "$lib/api/client";
  import type { Cycle, PlanId } from "$lib/config/plans";
  import { SUPPORT_EMAIL } from "$lib/config/support";
  import { auth } from "$lib/stores/auth.svelte";

  let cycle = $state<Cycle>("monthly");
  const cycleOptions: { value: Cycle; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "annual", label: "Yearly" },
  ];
  let busy = $state<PlanId | null>(null);
  let message = $state<string | null>(null);

  // Whether the account's plan comes from a subscription that can be managed.
  let billed = $state<boolean | null>(null);
  $effect(() => {
    if (!auth.user || auth.user.tier === "free") return;
    api
      .getBillingStatus()
      .then(({ subscription }) => (billed = subscription !== null && subscription.canceledAt === null))
      .catch(() => (billed = true));
  });

  async function choose(plan: "pro" | "max") {
    if (busy) return;
    if (!auth.user) {
      goto("/login");
      return;
    }
    busy = plan;
    message = null;
    try {
      const { url } = await api.createBillingCheckout(cycle, plan);
      window.location.href = url;
    } catch (err) {
      message =
        err instanceof ApiError && err.code === "checkout_unavailable"
          ? "This plan can't be bought yet. It will be soon."
          : "Couldn't start the checkout. Try again in a moment.";
      busy = null;
    }
  }

  async function manage() {
    if (busy) return;
    busy = "free";
    message = null;
    try {
      const { url } = await api.openBillingPortal();
      window.location.href = url;
    } catch {
      message = "Couldn't open your plan settings. Try again in a moment.";
      busy = null;
    }
  }

  const free = [
    { title: "End-to-end encryption", body: "Every file and its name, on every plan, with or without an account." },
    { title: "Password protection", body: "A second lock on a link, for when the link alone is not enough." },
    { title: "Passkeys and the vault", body: "Sign in without email, and keep the names of what you sent readable only to you." },
    { title: "Automatic expiry", body: "Everything is deleted when its time is up. Nothing piles up." },
  ];

  const questions = [
    {
      q: "How do I cancel?",
      a: "From your account settings, at any time, in under a minute. The plan runs until the end of the period you paid for and does not renew. Nobody asks you why.",
    },
    {
      q: "Can I get my money back?",
      a: `Within 14 days of your first payment, yes, in full: write to ${SUPPORT_EMAIL}. After that a period that has started is not refunded, except where the law gives you that right.`,
    },
    {
      q: "What happens to my portals when a plan ends?",
      a: "They stop accepting files. What they already hold stays available to you until it expires. Sending works as before.",
    },
    {
      q: "Who am I paying?",
      a: "Polar, our payment provider, is the seller on your invoice and handles tax. We never see your card details.",
    },
    {
      q: "Do the people who send me files need a plan?",
      a: "No. They need no account at all. Someone you share a portal with needs an account, and a free one is enough.",
    },
  ];
</script>

<Seo
  title="Pricing - Tessil"
  description="Sending files is free and encrypted. A plan adds portals: links where people send files that only you can open. You never pay for privacy."
  path="/pricing"
/>

<div class="bg-background text-foreground">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-20">
    <header class="mx-auto flex max-w-3xl flex-col items-center gap-5 pb-10 text-center sm:pb-12">
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-none" style="letter-spacing: -0.035em">
        Pay for portals.<br />Never for privacy.
      </h1>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Sending files is free, encrypted, and stays that way. A plan adds portals: links
        where other people send files that only you can open.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <SegmentedControl
          label="Billing period"
          class="[&>span]:sr-only"
          options={cycleOptions}
          value={cycle}
          onChange={(v) => (cycle = v)}
        />
        <Badge tone="success">2 months free yearly</Badge>
      </div>
    </header>

    {#if message}
      <Alert tone="warning" class="mx-auto mb-6 max-w-xl">{message}</Alert>
    {/if}

    <PlanCards {cycle} current={auth.user?.tier ?? null} {billed} {busy} onChoose={choose} onManage={manage} />

    <p class="mt-5 text-center text-sm text-muted-foreground">
      Without an account you can still send up to 500 MB. Prices include tax where it applies.
    </p>

    <section class="mt-20 border-t border-border pt-16 sm:mt-24 sm:pt-24 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
        What never costs anything
      </h2>
      <ul class="grid max-w-2xl gap-x-10 gap-y-8 sm:grid-cols-2">
        {#each free as item (item.title)}
          <li class="space-y-1.5">
            <p class="font-semibold text-foreground">{item.title}</p>
            <p class="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </li>
        {/each}
      </ul>
    </section>

    <section id="cancel" class="mt-16 border-t border-border pt-16 sm:mt-24 sm:pt-24 scroll-mt-20 grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">About paying</h2>
      <div class="max-w-2xl space-y-6">
        <div class="divide-y divide-border border-y border-border text-base">
          {#each questions as item (item.q)}
            <details class="group py-5">
              <summary class="flex cursor-pointer items-center justify-between gap-4 font-medium text-foreground list-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <span class="shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p class="mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          {/each}
        </div>
        <p class="text-sm text-muted-foreground">
          The full wording is in the <TextLink href="/terms#billing">terms</TextLink>.
        </p>
      </div>
    </section>

    <div class="pt-16">
      <SiteFooter current="pricing" />
    </div>
  </div>
</div>
