<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { comparisons } from "$lib/compare/comparisons";
  import { SITE_URL } from "$lib/config/site";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";

  const PAGE_TITLE =
    "European encrypted file transfer services compared (2026) - Tessil";
  const PAGE_DESCRIPTION =
    "Twelve European file transfer services sorted by who encrypts in the browser and who holds the keys. Tessil, Tresorit Send, Proton Drive, SwissTransfer, Smash, TransferNow, Internxt Send and more.";
  const LAST_VERIFIED = "September 2026";

  type Tier = "browser" | "provider" | "p2p";
  type Service = {
    name: string;
    country: string;
    eu: boolean | "adequacy" | "eea";
    tier: Tier;
    noAccount: boolean;
    openSource: boolean | string;
    freeLimit: string;
    note: string;
    href?: string;
  };

  // Facts come from each provider's own security or FAQ page. A service goes
  // in the "browser" tier only if its documentation describes a key generated
  // on the device that never reaches the server.
  const services: Service[] = [
    {
      name: "Tessil",
      country: "Netherlands / Germany",
      eu: true,
      tier: "browser",
      noAccount: true,
      openSource: "Yes (AGPL-3.0)",
      freeLimit: "500 MB, 1 GiB with a free account",
      note: "Key in the link fragment. Open source, verifiable in two minutes, no trackers.",
    },
    {
      name: "Tresorit Send",
      country: "Switzerland",
      eu: "adequacy",
      tier: "browser",
      noAccount: true,
      openSource: false,
      freeLimit: "5 GB",
      note: "Genuine end-to-end, link-based. Closed source, so the claim is asserted rather than auditable.",
      href: "/compare/tresorit-send-alternative",
    },
    {
      name: "Proton Drive",
      country: "Switzerland",
      eu: "adequacy",
      tier: "browser",
      noAccount: false,
      openSource: "Apps open source",
      freeLimit: "Free tier with account",
      note: "Encrypted cloud storage with sharing. Excellent, but storage-first and the sender needs a Proton account.",
      href: "/compare/proton-drive-alternative",
    },
    {
      name: "Internxt Send",
      country: "Spain",
      eu: true,
      tier: "browser",
      noAccount: true,
      openSource: "Yes (MIT, web client)",
      freeLimit: "5 GB",
      note: "Zero-knowledge transfer from a Spanish storage company. Closest EU-based match to Tessil's model.",
    },
    {
      name: "SecureEU Transfers",
      country: "Germany (storage in Finland)",
      eu: true,
      tier: "browser",
      noAccount: true,
      openSource: false,
      freeLimit: "2 GB",
      note: "Browser-side AES-256-GCM with the key in the URL fragment. Paid per transfer above the free tier.",
    },
    {
      name: "ToffeeShare",
      country: "Netherlands",
      eu: true,
      tier: "p2p",
      noAccount: true,
      openSource: false,
      freeLimit: "No limit",
      note: "Peer-to-peer over WebRTC, nothing stored. The sender's tab must stay open until the download finishes.",
    },
    {
      name: "SwissTransfer",
      country: "Switzerland",
      eu: "adequacy",
      tier: "provider",
      noAccount: true,
      openSource: false,
      freeLimit: "50 GB",
      note: "Infomaniak documents encryption in transit and at rest on arrival. No description of client-side keys.",
    },
    {
      name: "Smash",
      country: "France",
      eu: true,
      tier: "provider",
      noAccount: true,
      openSource: false,
      freeLimit: "Free tier",
      note: "TLS in transit, AES-256 at rest on AWS in Paris and Frankfurt. Smash holds the keys.",
    },
    {
      name: "TransferNow",
      country: "France",
      eu: true,
      tier: "provider",
      noAccount: true,
      openSource: false,
      freeLimit: "5 GB",
      note: "TLS plus AES-XTS on disk. Data centres in Europe, the US and Asia, so check which one you land on.",
    },
    {
      name: "Boomerang",
      country: "Netherlands",
      eu: true,
      tier: "provider",
      noAccount: true,
      openSource: false,
      freeLimit: "Free tier",
      note: "Ad-free, no AI training, EU data. Encrypted in transit and at rest; Boomerang can read what you send.",
      href: "/compare/boomerang-alternative",
    },
    {
      name: "Filemail",
      country: "Norway",
      eu: "eea",
      tier: "provider",
      noAccount: true,
      openSource: false,
      freeLimit: "5 GB",
      note: "End-to-end encryption and a choice of storage region exist, but only on the Business plan.",
    },
    {
      name: "WeTransfer",
      country: "Netherlands",
      eu: true,
      tier: "provider",
      noAccount: true,
      openSource: false,
      freeLimit: "2 GB",
      note: "The default everyone knows. Encrypted in transit and at rest, ads on the free tier, owned by Bending Spoons.",
      href: "/compare/wetransfer-alternative",
    },
  ];

  const tierLabel: Record<Tier, string> = {
    browser: "In your browser, key never sent",
    provider: "In transit and at rest, provider holds keys",
    p2p: "Device to device, nothing stored",
  };

  const euLabel = (v: Service["eu"]) =>
    v === true ? "EU" : v === "eea" ? "EEA" : "Not EU (adequacy decision)";

  const faq = [
    {
      q: "Is Switzerland in the EU for data protection purposes?",
      a: "No. Switzerland is not an EU or EEA member. It has an EU adequacy decision, meaning the Commission considers its data protection law essentially equivalent, so transfers there are lawful under GDPR. It is still a different legal system with different courts. For most people that is fine; for a procurement checklist that says EU, it is a question to ask.",
    },
    {
      q: "Does EU hosting make a file transfer GDPR compliant?",
      a: "Hosting location is one requirement among many, and on its own it says nothing about who can read your files. Every service in the provider-key tier is hosted in Europe and can open what you upload. Compliance is about the whole chain: what the provider holds, for how long, who it shares it with, and whether you can get it deleted.",
    },
    {
      q: "Which European services encrypt in the browser?",
      a: "Of the twelve here: Tessil, Internxt Send and SecureEU inside the EU, plus Tresorit Send and Proton Drive in Switzerland. ToffeeShare is a separate case: it encrypts between devices and stores nothing. Everything else encrypts on arrival with keys the provider controls.",
    },
    {
      q: "Why is Tessil's size limit so much smaller than SwissTransfer's?",
      a: "Because Tessil is free, ad-free and run by one person, and every byte is stored encrypted for up to 72 hours at real cost. 500 MB anonymous and 1 GiB with a free account covers documents, photo sets and most video clips. If you need to move 50 GB, use a service built for that and accept the trade.",
    },
  ];

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare` },
          {
            "@type": "ListItem",
            position: 3,
            name: "European encrypted file transfer",
            item: `${SITE_URL}/compare/eu-encrypted-file-transfer`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: "en",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  }).replace(/</g, "\\u003c");

  const linkClass = "text-primary underline underline-offset-2";
  const bodyClass = "text-muted-foreground leading-relaxed";
</script>

{#snippet yesNo(v: boolean)}
  <span class="inline-flex items-center">
    <span class="inline-flex" aria-hidden="true">
      {#if v}
        <IconCheckRegular class="size-5 text-primary" />
      {:else}
        <IconXRegular class="size-5 text-muted-foreground/40" />
      {/if}
    </span>
    <span class="sr-only">{v ? "Yes" : "No"}</span>
  </span>
{/snippet}

<Seo
  title={PAGE_TITLE}
  description={PAGE_DESCRIPTION}
  path="/compare/eu-encrypted-file-transfer"
/>

<svelte:head>
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PageLayout width="5xl">
  <nav class="mb-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
    <a href="/" class="hover:text-foreground transition-colors duration-200 ease-out">Home</a>
    <span class="mx-2" aria-hidden="true">/</span>
    <a href="/compare" class="hover:text-foreground transition-colors duration-200 ease-out">Compare</a>
    <span class="mx-2" aria-hidden="true">/</span>
    <span class="text-foreground">European services</span>
  </nav>

  <header class="mb-10 max-w-2xl">
    <h1
      class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground"
      style="letter-spacing: -0.02em"
    >
      Encrypted file transfer in Europe: who actually encrypts end-to-end
    </h1>
    <p class="mt-3 text-lg text-muted-foreground leading-relaxed">
      Twelve European services, sorted by the only question that matters for
      privacy: where the encryption happens, and who holds the key.
    </p>
  </header>

  <div class="max-w-2xl space-y-4 {bodyClass}">
    <p>
      Search for a European WeTransfer alternative and you get lists of ten or
      more services, all "secure", all "GDPR compliant", most hosted in the EU.
      Those lists rarely say the one thing that separates them: whether the
      provider can read your files. Most can. A few cannot, by construction.
    </p>
    <p>
      This page sorts them on that line. "In your browser" means the provider's
      own documentation describes a key generated on your device that never
      reaches its servers. "Provider holds keys" means files are encrypted in
      transit and at rest, which stops eavesdroppers and stolen disks but not
      the provider itself, or anyone who compels it. Tessil is on this list and
      we built it, so read the notes on the others as a fair summary of what
      each one says about itself, and check the source before you decide.
    </p>
  </div>

  <div class="mt-10 overflow-x-auto rounded-xl border border-border bg-card/60">
    <table class="w-full border-collapse text-left">
      <caption class="sr-only">European file transfer services compared on encryption, jurisdiction, accounts, source and free limits</caption>
      <thead>
        <tr class="border-b border-border">
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">Service</th>
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">Where the encryption happens</th>
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">Country</th>
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">No account</th>
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">Open source</th>
          <th scope="col" class="py-3.5 px-5 text-sm font-medium text-muted-foreground">Free limit</th>
        </tr>
      </thead>
      <tbody>
        {#each services as s (s.name)}
          <tr class="border-b border-border/50 last:border-0 align-top">
            <th scope="row" class="py-3.5 px-5 text-sm font-normal text-foreground min-w-[10rem]">
              {#if s.href}
                <a href={s.href} class={linkClass}>{s.name}</a>
              {:else}
                {s.name}
              {/if}
              <span class="block mt-1 text-xs text-muted-foreground font-normal leading-relaxed max-w-[16rem]">{s.note}</span>
            </th>
            <td class="py-3.5 px-5 text-sm {s.tier === 'provider' ? 'text-muted-foreground' : 'text-foreground'}">{tierLabel[s.tier]}</td>
            <td class="py-3.5 px-5 text-sm text-muted-foreground">
              {s.country}
              <span class="block text-xs">{euLabel(s.eu)}</span>
            </td>
            <td class="py-3.5 px-5">{@render yesNo(s.noAccount)}</td>
            <td class="py-3.5 px-5 text-sm text-muted-foreground">
              {#if typeof s.openSource === "boolean"}
                {@render yesNo(s.openSource)}
              {:else}
                {s.openSource}
              {/if}
            </td>
            <td class="py-3.5 px-5 text-sm text-muted-foreground">{s.freeLimit}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="mt-3 text-xs text-muted-foreground/80">
    Competitor details last verified {LAST_VERIFIED} from each provider's own
    security or FAQ page. They change; confirm on the provider's site before
    relying on any row.
  </p>

  <section class="mt-12 max-w-2xl space-y-4 {bodyClass}">
    <h2 class="text-xl font-semibold text-foreground">How to read the tiers</h2>
    <p>
      <span class="text-foreground">In your browser.</span> The file is
      encrypted before upload with a key that lives in the share link or your
      account, and the server stores ciphertext. Tessil, Internxt Send and
      SecureEU do this inside the EU. Tresorit Send and Proton Drive do it from
      Switzerland. Tessil and Internxt Send publish their source. Tessil is
      the only one with a
      <a href="/verify" class={linkClass}>page that shows you how to check</a>
      the claim yourself, in two minutes, without reading any of it.
    </p>
    <p>
      <span class="text-foreground">Provider holds keys.</span> This is the
      majority, and it includes the biggest names: WeTransfer, SwissTransfer,
      Smash, TransferNow, Boomerang and Filemail's free tier. They are not
      insecure. They are secure against outsiders and transparent to the
      operator, which is fine for a holiday video and not fine for a client
      contract. Several of them offer far larger free transfers than Tessil
      does, and that is the honest trade: storing ciphertext nobody can
      deduplicate or inspect is more expensive per byte.
    </p>
    <p>
      <span class="text-foreground">Device to device.</span> ToffeeShare never
      stores the file at all; it streams it over WebRTC while both browsers are
      open. That is the strongest privacy model on the list and the least
      convenient one, because the recipient has to download while you are
      still there.
    </p>
    <p>
      <span class="text-foreground">Switzerland and Norway.</span> Neither is
      in the EU. Norway is in the EEA and applies GDPR directly. Switzerland has
      an adequacy decision, so transfers there are lawful, but it is a separate
      legal system with its own courts. If your checklist says "EU", three of
      the strongest services on this list do not tick it.
    </p>
  </section>

  <div class="mt-10 flex flex-wrap items-center gap-3">
    <Button href="/" variant="primary" fullWidth={false}>Send a file with Tessil</Button>
    <Button href="/eu" variant="secondary" fullWidth={false}>Where Tessil's data lives</Button>
  </div>

  <section class="mt-14 max-w-2xl">
    <h2 class="text-xl font-semibold text-foreground">Frequently asked questions</h2>
    <div class="mt-4 divide-y divide-border/60 border-y border-border/60">
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
          <p class="mt-2 text-muted-foreground leading-relaxed">{item.a}</p>
        </details>
      {/each}
    </div>
  </section>

  <section class="mt-14">
    <h2 class="text-sm font-medium text-muted-foreground">One-to-one comparisons</h2>
    <ul class="mt-3 flex flex-wrap gap-2">
      {#each comparisons as c (c.slug)}
        <li>
          <a
            href="/compare/{c.slug}"
            class="inline-block rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-200 ease-out hover:bg-card hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Tessil vs {c.shortName}
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <SiteFooter current="compare" />
</PageLayout>
