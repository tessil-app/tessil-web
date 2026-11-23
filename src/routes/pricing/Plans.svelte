<script lang="ts">
  // The pricing page once the paid plans are on sale.

  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import PlanComparison from "$lib/components/PlanComparison.svelte";
  import PlanCards from "$lib/components/PlanCards.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { api, ApiError } from "$lib/api/client";
  import { FORMS_ANNOUNCED } from "$lib/config/launch";
  import type { Cycle, PlanId } from "$lib/config/plans";
  import { SUPPORT_EMAIL } from "$lib/config/support";
  import { auth } from "$lib/stores/auth.svelte";
  import { page } from "$app/state";
  import { localeFromPath } from "$lib/i18n/locale";
  import { hrefFor } from "$lib/i18n/paths";
  import { pricingMessages } from "$lib/i18n/messages/pricing";

  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(pricingMessages[locale]);
  const href = (canonical: string) => hrefFor(canonical, locale);

  let cycle = $state<Cycle>("monthly");
  // Arriving from the try-out editor with a form to publish. Read in the
  // browser only: this page is prerendered, where an address has no query.
  let keptForm = $state(false);
  onMount(() => {
    keptForm = FORMS_ANNOUNCED && new URLSearchParams(window.location.search).get("kept") === "form";
  });
  const cycleOptions: { value: Cycle; label: string }[] = $derived([
    { value: "monthly", label: t.monthly },
    { value: "annual", label: t.yearly },
  ]);
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
          ? t.notYet
          : t.checkoutFailed;
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
      message = t.portalFailed;
      busy = null;
    }
  }

  const questions: { q: string; a: string; link?: { href: string; label: string } }[] = $derived([
    { ...t.account, link: { href: href("/what-we-store"), label: t.account.link } },
    t.cancel,
    { q: t.refund.q, a: t.refund.a(SUPPORT_EMAIL) },
    { q: FORMS_ANNOUNCED ? t.ends.qForms : t.ends.q, a: FORMS_ANNOUNCED ? t.ends.aForms : t.ends.a },
    t.payee,
    { q: FORMS_ANNOUNCED ? t.senders.qForms : t.senders.q, a: FORMS_ANNOUNCED ? t.senders.aForms : t.senders.a },
  ]);
</script>

<Seo
  title={t.title}
  description={t.description}
  path="/pricing"
/>

<div class="bg-background text-foreground">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-20">
    <header class="mx-auto flex max-w-3xl flex-col items-center gap-5 pb-10 text-center sm:pb-12">
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-none" style="letter-spacing: -0.035em">
        {t.heading1}<br />{t.heading2}
      </h1>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        {FORMS_ANNOUNCED ? t.introForms : t.intro}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <Tabs label={t.period} tabs={cycleOptions} value={cycle} onChange={(v) => (cycle = v)} />
        <Badge tone="success">{t.yearlyFree}</Badge>
      </div>
    </header>

    {#if message}
      <Alert tone="warning" class="mx-auto mb-6 max-w-xl">{message}</Alert>
    {/if}
    {#if keptForm}
      <Alert tone="info" class="mx-auto mb-6 max-w-xl">
        {t.keptForm}
      </Alert>
    {/if}

    <PlanCards {locale} {cycle} current={auth.user?.tier ?? null} {billed} {busy} onChoose={choose} onManage={manage} />

    <p class="mt-5 text-center text-sm text-muted-foreground">
      {t.withoutAccount}
      <TextLink href="#compare">{t.compareAll}</TextLink>
    </p>

    <section id="compare" class="mt-16 scroll-mt-20 sm:mt-24">
      <div class="max-w-2xl space-y-3">
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
          {t.everyLimit}
        </h2>
        <p class="text-muted-foreground">
          {t.everyLimitBody}
        </p>
      </div>
      <PlanComparison {locale} current={auth.user?.tier ?? null} class="mt-8" />
    </section>

    <section class="mt-20 border-t border-border pt-16 sm:mt-24 sm:pt-24 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
        {t.neverCosts}
      </h2>
      <ul class="grid max-w-2xl gap-x-10 gap-y-8 sm:grid-cols-2">
        {#each t.free as item (item.title)}
          <li class="space-y-1.5">
            <p class="font-semibold text-foreground">{item.title}</p>
            <p class="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </li>
        {/each}
      </ul>
    </section>

    <section id="cancel" class="mt-16 border-t border-border pt-16 sm:mt-24 sm:pt-24 scroll-mt-20 grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{t.aboutPaying}</h2>
      <div class="max-w-2xl space-y-6">
        <div class="divide-y divide-border border-y border-border text-base">
          {#each questions as item (item.q)}
            <details class="group py-5">
              <summary class="flex cursor-pointer items-center justify-between gap-4 font-medium text-foreground list-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <span class="shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p class="mt-3 leading-relaxed text-muted-foreground">
                {item.a}
                {#if item.link}
                  <TextLink href={item.link.href}>{item.link.label}</TextLink>
                {/if}
              </p>
            </details>
          {/each}
        </div>
        <p class="text-sm text-muted-foreground">
          {t.fullWording} <TextLink href="{href('/terms')}#billing">{t.terms}</TextLink>.
        </p>
      </div>
    </section>

    <div class="pt-16">
      <SiteFooter current="pricing" />
    </div>
  </div>
</div>
