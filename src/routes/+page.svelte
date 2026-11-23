<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FeatureAccordion, { type Feature } from "$lib/components/FeatureAccordion.svelte";
  import PlanCards from "$lib/components/PlanCards.svelte";
  import SendPanel from "$lib/components/SendPanel.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { ACCESS_KEYS_ANNOUNCED, FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { SITE_URL } from "$lib/config/site";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import { cn } from "$lib/utils";
  import { page } from "$app/state";
  import { localeFromPath } from "$lib/i18n/locale";
import { hrefFor } from "$lib/i18n/paths";
  import { homeMessages } from "$lib/i18n/messages/home";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import { onMount } from "svelte";
  import { applicationNode, ORG_ID, organizationNode } from "$lib/seo/schema";

  // English at /, Dutch at /nl; the same page. See src/lib/i18n.
  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(homeMessages[locale]);
  const href = (canonical: string) => hrefFor(canonical, locale);

  const homeSchema = $derived({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Tessil",
        publisher: { "@id": ORG_ID },
        url: SITE_URL,
        description: t.pageDescription,
        inLanguage: locale,
      },
      organizationNode(),
      applicationNode(t.schemaFeatures, t.pageDescription),
    ],
  });


  // The question behind "Or ask an AI". Written to invite criticism, not praise.
  const askLinks = $derived([
    { label: "ChatGPT", href: `https://chatgpt.com/?q=${encodeURIComponent(t.ask.prompt)}` },
    { label: "Claude", href: `https://claude.ai/new?q=${encodeURIComponent(t.ask.prompt)}` },
    { label: "Perplexity", href: `https://www.perplexity.ai/search?q=${encodeURIComponent(t.ask.prompt)}` },
  ]);
  let askCopied = $state(false);
  async function copyAskPrompt() {
    try {
      await navigator.clipboard.writeText(t.ask.prompt);
      askCopied = true;
      setTimeout(() => (askCopied = false), 2000);
    } catch {
      // Clipboard refused; the text is on the page to select by hand.
    }
  }

  // What Tessil does besides sending, each shown once it is announced.
  const features: Feature[] = $derived([
    ...(PORTALS_ANNOUNCED
      ? [{ id: "portals" as const, fresh: true, ...t.features.portals, href: href("/portals") }]
      : []),
    ...(FORMS_ANNOUNCED ? [{ id: "forms" as const, fresh: true, ...t.features.forms, href: href("/forms") }] : []),
    ...(ACCESS_KEYS_ANNOUNCED ? [{ id: "cli" as const, fresh: true, ...t.features.cli, href: href("/cli") }] : []),
  ]);

  // Plays a film only while it is on screen, and not at all for people who asked for less motion.
  function playInView(node: HTMLVideoElement) {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.controls = true;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void node.play().catch(() => {});
          else node.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }

  // Written without findLast, which older Safari does not have.
  const newest = $derived([...features].reverse().find((f) => f.fresh) ?? null);

  const steps: { title: string; body: string; link?: { href: string; label: string } }[] = $derived([
    t.steps.encrypted,
    { title: t.steps.key.title, body: PORTALS_ANNOUNCED ? t.steps.key.bodyPortals : t.steps.key.body },
    { title: t.steps.gone.title, body: PORTALS_ANNOUNCED ? t.steps.gone.bodyPortals : t.steps.gone.body },
    { title: t.steps.check.title, body: t.steps.check.body, link: { href: href("/verify"), label: t.steps.check.link } },
  ]);

  type FeaturedItem = {
    slug: string;
    src: string;
    title: string;
    artist: string;
    artistUrl: string | null;
    tone?: "light" | "dark";
  };

  let featured = $state<FeaturedItem | null>(null);

  // What the send panel holds, for the layout around it.
  const hasFiles = $derived(uploadStore.files.length > 0);
  const isSuccess = $derived(uploadStore.status === "complete" && !!uploadStore.shareUrl);

  onMount(async () => {
    try {
      const res = await fetch("/featured/manifest.json", { cache: "no-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: FeaturedItem[] };
      if (Array.isArray(data.items) && data.items.length > 0) {
        const idx = Math.floor(Math.random() * data.items.length);
        featured = data.items[idx];
      }
    } catch {
      // Manifest fetch is best-effort; page renders fine without art.
    }
  });


</script>

<Seo title={t.pageTitle} description={t.pageDescription} path="/" structured={false} />

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify(homeSchema).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<!-- Pulled behind the sticky nav so the glass effect actually sees through to artwork. -->

<section class="relative under-header overflow-hidden">

  <!-- Empty, the whole hero is one screen: words, wall and label, no scrolling.
       With files queued the panel is taller and the page may grow. -->
  <div
    class={cn(
      "relative max-w-6xl mx-auto px-4 sm:px-6 pt-[4.5rem] sm:pt-20 pb-3 flex flex-col min-h-[100svh]",
      !hasFiles && !isSuccess && "sm:h-[100svh] sm:min-h-[38rem]",
    )}
  >
    <div class="mx-auto flex max-w-2xl shrink-0 flex-col items-center gap-2.5 sm:gap-3 text-center">
        <!-- On a phone the panes below sit under the fold, so the newest thing is named up here. -->
        {#if newest}
          <a
            href={newest.href}
            class="inline-flex sm:hidden items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3.5 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">{t.newTag}</span>
            {newest.pill}
          </a>
        {/if}
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-none" style="letter-spacing: -0.035em">
          {t.heroLine1}
          <br />
          {t.heroLine2}
        </h1>
        <p class="max-w-lg text-base text-muted-foreground leading-snug">
          {t.heroSub}
        </p>
        <p class="hidden sm:block text-sm text-muted-foreground/80">
          {t.heroDrop}
        </p>
    </div>

    <!-- The wall: this month's artwork, with the panel hung on it. -->
    <div
      class={cn(
        "relative mt-5 sm:mt-6 flex flex-1 flex-wrap items-start justify-between gap-4 sm:gap-6 rounded-2xl bg-muted bg-cover bg-center p-3 sm:p-6 lg:p-8",
        (hasFiles || isSuccess) && "sm:min-h-[39rem]",
      )}
      style={featured ? `background-image: url('${featured.src}')` : undefined}
    >

      <SendPanel {locale} />

      {#if features.length > 0 && !hasFiles}
        <FeatureAccordion
          {features}
          class="self-end w-full sm:w-[30rem]"
          words={{ fresh: t.newTag, show: (name) => (locale === "nl" ? `Toon ${name}` : `Show ${name}`) }}
        />
      {/if}
    </div>

    {#if featured}
      <div class="mt-2 flex shrink-0 flex-wrap justify-between gap-x-6 gap-y-0.5 px-1 text-xs text-muted-foreground">
        <p>
          <span class="font-medium text-foreground">{featured.artist}</span>{t.artFrom}
          {#if featured.artistUrl}
            <TextLink href={featured.artistUrl} target="_blank" rel="noopener noreferrer">{featured.title}</TextLink>
          {:else}
            {featured.title}
          {/if}
        </p>
        <p>{t.artWall}</p>
      </div>
    {/if}
  </div>

</section>

<div class="bg-background">
  <section aria-labelledby="how-title" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
    <h2 id="how-title" class="sr-only">{t.howTitle}</h2>
    <ul class="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {#each steps as step (step.title)}
        <li class="space-y-2 border-t border-border pt-5">
          <h3 class="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            {step.body}
            {#if step.link}
              <TextLink href={step.link.href} class="text-primary">{step.link.label}</TextLink>
            {/if}
          </p>
        </li>
      {/each}
    </ul>
  </section>

  {#if PORTALS_ANNOUNCED}
    <section
      id="portals"
      aria-labelledby="portals-title"
      class="border-t border-border scroll-mt-20"
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
        <div class="space-y-5">
          <h2 id="portals-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            {t.portals.title}
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            {t.portals.body}
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each t.portals.points as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href={auth.user ? "/dashboard/portals" : href("/pricing")} fullWidth={false}>
              {auth.user ? t.portals.open : t.portals.plans}
            </Button>
            <p class="text-sm text-muted-foreground">
              {t.portals.note}
              <TextLink href={href("/portals")}>{t.portals.tour}</TextLink>
            </p>
          </div>
        </div>

        <!-- What the sender sees. An illustration, not a control. -->
        <div aria-hidden="true" class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3.5">
          <p class="text-xs text-muted-foreground">{t.portals.mock.sendTo}</p>
          <p class="text-xl font-semibold tracking-tight text-foreground">Studio North</p>
          <div class="flex justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
            <span>{t.portals.mock.needed}</span>
            <span>{t.portals.mock.progress}</span>
          </div>
          {#each [{ label: t.portals.mock.contract, file: "contract-signed.pdf" }, { label: t.portals.mock.logos, file: "logo.zip" }] as row (row.file)}
            <div class="flex items-center gap-2.5 rounded-md border border-border px-3.5 py-2.5 text-sm">
              <IconCheckRegular class="size-4 shrink-0 text-success-foreground" />
              <span class="flex-1 text-foreground">{row.label}</span>
              <span class="text-xs text-muted-foreground">{row.file}</span>
            </div>
          {/each}
          <div class="flex items-center gap-2.5 rounded-md border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground">
            <span class="size-4 shrink-0 rounded-full border border-dashed border-warning"></span>
            <span class="flex-1">{t.portals.mock.invoice}</span>
            <span class="text-xs font-medium text-foreground">{t.portals.mock.choose}</span>
          </div>
          <div class="rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">
            {t.portals.mock.send}
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if FORMS_ANNOUNCED}
    <section id="forms" aria-labelledby="forms-title" class="border-t border-border scroll-mt-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
        <!-- The editor at work, recorded. Plays while it is in view. -->
        <div class="order-last overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:order-first">
          <video
            use:playInView
            class="block h-auto w-full"
            poster="/featured/forms-editor.jpg"
            width="1600"
            height="1000"
            muted
            loop
            playsinline
            preload="none"
            aria-label={t.forms.video}
          >
            <source src="/featured/forms-editor.mp4" type="video/mp4" />
          </video>
        </div>
        <div class="space-y-5">
          <h2 id="forms-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            {t.forms.title}
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            {t.forms.body}
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each t.forms.points as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href="/forms/try" fullWidth={false}>{t.forms.try}</Button>
            <p class="text-sm text-muted-foreground">
              {t.forms.note}
              <TextLink href={href("/forms")}>{t.forms.tour}</TextLink>
            </p>
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if ACCESS_KEYS_ANNOUNCED}
    <section id="terminal" aria-labelledby="terminal-title" class="border-t border-border scroll-mt-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div class="space-y-5">
          <h2 id="terminal-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            {t.terminal.title}
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            {t.terminal.body}
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each t.terminal.points as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href={href("/cli")} fullWidth={false}>{t.terminal.meet}</Button>
            <p class="text-sm text-muted-foreground">
              <code class="font-mono text-foreground">brew install tessil-app/tap/tessil</code>
            </p>
          </div>
        </div>

        <!-- The tool at work. An illustration, not a control. -->
        <div aria-hidden="true" class="overflow-x-auto rounded-xl bg-[#07080d] p-5 font-mono text-[0.8125rem] leading-relaxed shadow-sm sm:p-6 sm:text-sm">
          <p class="whitespace-pre text-white"><span class="pr-[1ch] text-white/40">$</span>tessil send report.pdf</p>
          <p class="whitespace-pre text-emerald-300">Sent report.pdf (2.4 MB), encrypted on this machine.</p>
          <p class="whitespace-pre text-white/80">The link works for 7 days.</p>
          <p class="whitespace-pre text-[#9db4ff]">https://tessil.app/d/8sKq2ZpLw4…#rT9c…</p>
          <p class="mt-4 whitespace-pre text-white"><span class="pr-[1ch] text-white/40">$</span>tessil pull "Tax 2025"</p>
          <p class="whitespace-pre text-white/80">Tax 2025/7F3A-91C2/passport.jpg</p>
          <p class="whitespace-pre text-white/80">Tax 2025/7F3A-91C2/annual-statement.pdf</p>
          <p class="whitespace-pre text-emerald-300">Tax 2025: 1 delivery saved to ./Tax 2025, 4 already there.</p>
        </div>
      </div>
    </section>
  {/if}

  {#if PORTALS_ANNOUNCED}
    <section aria-labelledby="pricing-title" class="border-t border-border">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
        <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div class="max-w-xl space-y-3">
            <h2 id="pricing-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
              {t.pricing.title}
            </h2>
            <p class="text-base sm:text-lg leading-relaxed text-muted-foreground">
              {t.pricing.body}
              {FORMS_ANNOUNCED ? t.pricing.addsWithForms : t.pricing.adds}.
            </p>
          </div>
          <TextLink href={href("/pricing")} class="text-primary">{t.pricing.link}</TextLink>
        </div>
        <PlanCards compact {locale} />
      </div>
    </section>
  {/if}

  <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 border-t border-border pt-16 sm:pt-24">
    <!-- A heading on the left, the text in a readable column on the right. -->
    <section class="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        {t.explained.title}
      </h2>
      <div class="max-w-2xl space-y-4 text-base text-muted-foreground leading-relaxed">
        <p>{t.explained.p1}</p>
        <p>
          {t.explained.p2Before}
          <a href={href("/verify")} class="text-primary underline underline-offset-2">{t.explained.p2Link}</a>
          {t.explained.p2After}
        </p>
        <p>
          {t.explained.p3Before}
          <a href={href("/security")} class="text-primary underline underline-offset-2">{t.explained.p3Link}</a>.
        </p>
        <p>
          {t.explained.p4Before}
          <a href={href("/compare")} class="text-primary underline underline-offset-2">{t.explained.p4Link}</a>.
        </p>
        <p>{PORTALS_ANNOUNCED ? t.explained.p5Paid : t.explained.p5Free}</p>
      </div>
    </section>

    <section class="mt-16 sm:mt-24 pt-16 sm:pt-24 border-t border-border grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        {t.faq.title}
      </h2>
      <div class="max-w-2xl space-y-10">
        <div class="divide-y divide-border border-y border-border text-base">
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {t.faq.e2eQ}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            {t.faq.e2eA}
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {t.faq.accountQ}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            {t.faq.accountA}
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {t.faq.differentQ}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            {t.faq.differentA}
            <a href={href("/compare")} class="text-primary underline underline-offset-2">{t.faq.differentLink}</a>.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {t.faq.sizeQ}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            {t.faq.sizeA}
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {t.faq.freeQ}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
{#if PORTALS_ANNOUNCED}
              {t.faq.freeA(FORMS_ANNOUNCED)}
              <a href={href("/pricing")} class="text-primary underline underline-offset-2">{t.faq.freeLink}</a>.
            {:else}
              {t.faq.freeAFree}
            {/if}
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            {t.faq.lastQ}
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            {t.faq.lastA}
          </p>
        </details>
      </div>

        <!-- A second opinion. Plain outbound links; the question is shown in full. -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold tracking-tight text-foreground">{t.ask.title}</h3>
          <p class="text-base leading-relaxed text-muted-foreground">
            {t.ask.body}
          </p>
          <blockquote class="rounded-lg bg-card p-4 text-sm leading-relaxed text-foreground">
            {t.ask.prompt}
          </blockquote>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {#each askLinks as link (link.label)}
              <TextLink href={link.href} target="_blank" rel="noopener noreferrer" class="text-primary">
                {t.ask.askWith(link.label)}
              </TextLink>
            {/each}
            <TextLink onclick={copyAskPrompt} class="text-muted-foreground">
              {askCopied ? t.ask.copied : t.ask.copy}
            </TextLink>
          </div>
          <p class="text-xs text-muted-foreground">
            {t.ask.note}
          </p>
        </div>
      </div>
    </section>

    <div class="pt-16">
      <SiteFooter current="home" />
    </div>
  </div>
</div>

