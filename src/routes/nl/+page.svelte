<script lang="ts">
  // Dutch landing page. Written for Dutch search intent, not translated from
  // the English homepage. The prose lives here rather than in the message
  // catalogue because this is a document, not a set of labels.
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import HowItWorks from "$lib/components/HowItWorks.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import IconArrowRightRegular from "phosphor-icons-svelte/IconArrowRightRegular.svelte";
  import IconTranslateRegular from "phosphor-icons-svelte/IconTranslateRegular.svelte";
  import { SITE_URL } from "$lib/config/site";

  const PAGE_TITLE = "Versleuteld bestanden versturen - Tessil";
  const PAGE_DESCRIPTION =
    "Verstuur grote bestanden end-to-end versleuteld. Je browser versleutelt voor de upload, wij zien je bestanden of sleutel nooit. Zonder account, EU-hosting, vanaf EUR 1 per transfer.";

  const reasons = [
    {
      title: "End-to-end versleuteld",
      body: "De versleuteling gebeurt in je browser met AES-256-GCM, voordat er ook maar één byte je apparaat verlaat. De ontsleutelsleutel staat in het deel van de link na de #, en dat deel sturen browsers nooit naar een server. Wij kunnen je bestanden dus niet openen, ook niet als iemand ons daartoe zou dwingen.",
    },
    {
      title: "Geen account nodig",
      body: "Versturen zonder account is de standaard en niet de uitzondering: een eenmalige pas van EUR 1 is genoeg. Een account heb je alleen nodig voor het maandabonnement van EUR 5 en geeft je een overzicht van je eigen transfers. Aan de versleuteling verandert het niets.",
    },
    {
      title: "Gehost in de EU",
      body: "Servers in Duitsland en Nederland. Geen advertenties, geen trackers en geen analytics van derden. Op een pagina waarvan de link een sleutel bevat is een script van een derde partij geen ergernis maar een lek, dus we laden er geen.",
    },
    {
      title: "Open source",
      body: "De volledige broncode is openbaar onder AGPL-3.0. Je hoeft ons niet op ons woord te geloven; je kunt het nakijken, en wie Tessil aangepast als dienst aanbiedt moet die aanpassingen publiceren.",
    },
  ];

  const faq = [
    {
      q: "Hoe verstuur ik grote bestanden veilig?",
      a: "Sleep je bestanden naar Tessil, stel eventueel een wachtwoord en een vervaltermijn in, en deel de link die je terugkrijgt. De versleuteling gebeurt in je browser, dus je bestanden verlaten je apparaat al onleesbaar. Deel de link wel via een kanaal dat je vertrouwt: wie de link heeft, kan de bestanden openen.",
    },
    {
      q: "Wat is een goed versleuteld alternatief voor WeTransfer?",
      a: "Tessil is opgezet als privacyvriendelijk alternatief: end-to-end versleuteld, zonder advertenties en zonder trackers. Het verschil zit in de sleutels, want die krijgen wij nooit te zien. De volledige vergelijking staat op de vergelijkingspagina.",
    },
    {
      q: "Heb ik een account nodig om bestanden te versturen?",
      a: "Nee. Met een eenmalige pas van EUR 1 verstuur je zonder account tot 2 GB per transfer, met een vervaltermijn tot 30 dagen. Een account is alleen nodig voor het maandabonnement van EUR 5. Ontvangen kan altijd zonder account.",
    },
    {
      q: "Waar worden mijn bestanden opgeslagen?",
      a: "Op servers in de EU, in Duitsland en Nederland. Wij slaan uitsluitend versleutelde data op, dus ook wij kunnen niet zien wat erin zit. Zodra de vervaltermijn verstreken is worden de bestanden automatisch verwijderd.",
    },
    {
      q: "Wat kost Tessil?",
      a: "Versturen kost EUR 1 per transfer zonder account, of EUR 5 per maand voor zoveel transfers als je nodig hebt. Ontvangen is gratis. Het abonnement zeg je met één klik op, zonder opzegtermijn.",
    },
  ];

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        url: `${SITE_URL}/nl`,
        inLanguage: "nl",
      },
      {
        "@type": "FAQPage",
        inLanguage: "nl",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  }).replace(/</g, "\\u003c");

  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo
  title={PAGE_TITLE}
  description={PAGE_DESCRIPTION}
  path="/nl"
  alternates={[
    { locale: "en", path: "/" },
    { locale: "nl", path: "/nl" },
  ]}
/>

<svelte:head>
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PageLayout width="3xl">
  <div class="flex justify-end">
    <a
      href="/"
      hreflang="en"
      class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 ease-out hover:bg-card hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span class="inline-flex" aria-hidden="true">
        <IconTranslateRegular class="size-4" />
      </span>
      English
    </a>
  </div>

  <header class="mt-6 max-w-2xl">
    <h1
      class="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.05]"
      style="letter-spacing: -0.03em"
    >
      Versleuteld bestanden versturen
    </h1>
    <p class="mt-4 text-lg text-muted-foreground leading-relaxed">
      Je bestanden worden in je eigen browser versleuteld voordat ze verstuurd
      worden. Wij bewaren alleen onleesbare data en krijgen de sleutel nooit te
      zien. Zonder account, gehost in de EU, vanaf EUR 1 per transfer.
    </p>
    <div class="mt-7 flex flex-wrap items-center gap-3">
      <Button href="/" variant="primary" fullWidth={false}>
        Bestand versturen
        <span class="inline-flex" aria-hidden="true">
          <IconArrowRightRegular class="size-4" />
        </span>
      </Button>
      <Button
        href="/nl/vergelijken/wetransfer-alternatief"
        variant="secondary"
        fullWidth={false}
      >
        Vergelijk met WeTransfer
      </Button>
    </div>
    <p class="mt-3 text-xs text-muted-foreground">
      De verstuurpagina zelf is nog Engels. Aan de versleuteling verandert dat
      niets.
    </p>
  </header>

  <Frame.Root class="mt-12">
    <Frame.Panel>
      <div class="space-y-8">
        <section class="space-y-3">
          <h2 class="text-lg font-semibold text-foreground">Waarom Tessil</h2>
          <div class="space-y-6">
            {#each reasons as reason (reason.title)}
              <div class="space-y-1.5">
                <h3 class="text-sm font-semibold text-foreground">
                  {reason.title}
                </h3>
                <p class="text-muted-foreground leading-relaxed">
                  {reason.body}
                </p>
              </div>
            {/each}
          </div>
        </section>

        <HowItWorks locale="nl" class="mt-0" />

        <section class="space-y-3 pt-8 border-t border-border/60">
          <h2 class="text-lg font-semibold text-foreground">
            Zelf controleren in plaats van ons geloven
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Elke dienst beweert dat hij je bestanden niet kan lezen. Het verschil
            zit hem in de vraag of je dat kunt nakijken. Op
            <a href="/verify" class={linkClass}>Verify it yourself</a>
            staan vier controles die je met de ontwikkelaarstools van je eigen
            browser in ongeveer twee minuten uitvoert: zoek de sleutel terug in
            het netwerkverkeer en vind niets, bekijk wat wij daadwerkelijk
            opslaan, en zie welke domeinen de pagina benadert. Die pagina is nog
            Engelstalig.
          </p>
          <p class="text-muted-foreground leading-relaxed">
            Wat wij wél zien staat er ook bij, want die vier controles zijn
            weinig waard zonder een eerlijke lijst van wat er overblijft.
          </p>
        </section>

        <section class="space-y-3 pt-8 border-t border-border/60">
          <h2 class="text-lg font-semibold text-foreground">
            Veelgestelde vragen
          </h2>
          <div class="divide-y divide-border/60 border-y border-border/60">
            {#each faq as item (item.q)}
              <details class="group py-4">
                <summary
                  class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden"
                >
                  {item.q}
                  <span
                    class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45"
                    aria-hidden="true">+</span
                  >
                </summary>
                <p class="mt-2 text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </details>
            {/each}
          </div>
        </section>
      </div>
    </Frame.Panel>
  </Frame.Root>

  <div class="mt-10 flex flex-wrap items-center gap-3">
    <Button href="/" variant="primary" fullWidth={false}>
      Bestand versturen
      <span class="inline-flex" aria-hidden="true">
        <IconArrowRightRegular class="size-4" />
      </span>
    </Button>
    <Button href="/security" variant="secondary" fullWidth={false}>
      Zo werkt de versleuteling
    </Button>
  </div>

  <SiteFooter />
</PageLayout>
