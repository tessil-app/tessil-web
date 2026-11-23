// The roundup of European file transfer services, by who can read the files.
// Same rules as the comparisons: each claim is what the provider's own pages
// state, dated, and fair. Sources: docs/audit/38.

import type { Locale } from "$lib/i18n/locale";
import type { Faq } from "./comparisons";

export const ROUNDUP_SLUG = "eu-encrypted-file-transfer";
export const ROUNDUP_SLUG_NL = "versleuteld-bestanden-versturen-europa";
export const ROUNDUP_VERIFIED_ISO = "2026-11-23";

type Text = Record<Locale, string>;

/** Who holds the key: only the people sharing, nobody (no storage), or the provider. */
export type Tier = "browser" | "direct" | "provider";

export type RoundupService = {
  name: string;
  tier: Tier;
  country: Text;
  free: Text;
  /** Whether sending needs an account. */
  account: Text;
  openSource: Text;
  note: Text;
  /** English slug of the full comparison, when there is one. */
  compare?: string;
};

export const ROUNDUP_SERVICES: RoundupService[] = [
  {
    name: "Tessil",
    tier: "browser",
    country: { en: "Netherlands; hosted in the EU", nl: "Nederland; gehost in de EU" },
    free: { en: "1 GB per transfer, links up to 7 days", nl: "1 GB per transfer, links tot 7 dagen" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "Yes (AGPL-3.0)", nl: "Ja (AGPL-3.0)" },
    note: {
      en: "This site. The key stays in the link's fragment and never reaches the server. Also receives files (portals) and answers (forms), encrypted the same way.",
      nl: "Deze site. De sleutel blijft in het fragment van de link en bereikt de server nooit. Ontvangt ook bestanden (portalen) en antwoorden (formulieren), op dezelfde manier versleuteld.",
    },
  },
  {
    name: "Tresorit Send",
    tier: "browser",
    country: { en: "Switzerland (not EU)", nl: "Zwitserland (geen EU)" },
    free: { en: "5 GB, 7 days or 10 downloads", nl: "5 GB, 7 dagen of 10 downloads" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No", nl: "Nee" },
    note: {
      en: "End-to-end encrypted and well regarded. Closed source, so the encryption is taken on trust.",
      nl: "End-to-end versleuteld en goed aangeschreven. Gesloten broncode, dus de versleuteling neem je op vertrouwen aan.",
    },
    compare: "tresorit-send-alternative",
  },
  {
    name: "Proton Drive",
    tier: "browser",
    country: { en: "Switzerland (not EU)", nl: "Zwitserland (geen EU)" },
    free: { en: "Free storage plan", nl: "Gratis opslagabonnement" },
    account: { en: "Yes, to send; recipients need none", nl: "Ja, om te versturen; ontvangers niet" },
    openSource: { en: "Apps open source", nl: "Apps open source" },
    note: {
      en: "Encrypted cloud storage with share links, rather than a transfer tool. The right pick if you also want to keep the files.",
      nl: "Versleutelde cloudopslag met deellinks, geen transferdienst. De juiste keuze als je de bestanden ook wilt bewaren.",
    },
    compare: "proton-drive-alternative",
  },
  {
    name: "Internxt Send",
    tier: "browser",
    country: { en: "Spain", nl: "Spanje" },
    free: { en: "5 GB, links 15 days", nl: "5 GB, links 15 dagen" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "Yes, per Internxt", nl: "Ja, volgens Internxt" },
    note: {
      en: "Internxt describes it as zero-knowledge: encrypted before upload. Part of its encrypted storage suite.",
      nl: "Internxt noemt het zero-knowledge: versleuteld voor het uploaden. Onderdeel van zijn versleutelde opslagpakket.",
    },
  },
  {
    name: "ToffeeShare",
    tier: "direct",
    country: { en: "Netherlands", nl: "Nederland" },
    free: { en: "No size limit", nl: "Geen limiet" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No public code found", nl: "Geen openbare code gevonden" },
    note: {
      en: "Sends straight from one browser to the other and stores nothing. Both sides must be online, with the tab open, until it finishes.",
      nl: "Verstuurt rechtstreeks van de ene browser naar de andere en bewaart niets. Beide kanten moeten online zijn, met het tabblad open, tot het klaar is.",
    },
  },
  {
    name: "SwissTransfer",
    tier: "provider",
    country: { en: "Switzerland (not EU)", nl: "Zwitserland (geen EU)" },
    free: { en: "50 GB per transfer", nl: "50 GB per transfer" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No public server code found", nl: "Geen openbare servercode gevonden" },
    note: {
      en: "Generous and free, in Infomaniak's own data centres. Encrypted in transit and at rest, not end to end.",
      nl: "Royaal en gratis, in Infomaniaks eigen datacenters. Versleuteld tijdens verzending en in opslag, niet end-to-end.",
    },
    compare: "swisstransfer-alternative",
  },
  {
    name: "Smash",
    tier: "provider",
    country: { en: "France; files on AWS in several regions", nl: "Frankrijk; bestanden bij AWS in meerdere regio's" },
    free: { en: "No size limit, links up to 7 days", nl: "Geen limiet, links tot 7 dagen" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No", nl: "Nee" },
    note: {
      en: "Its security page describes encryption at rest and in transit. Hosting in France is an option for business customers.",
      nl: "De beveiligingspagina beschrijft versleuteling in opslag en tijdens verzending. Hosting in Frankrijk is een optie voor zakelijke klanten.",
    },
    compare: "smash-alternative",
  },
  {
    name: "TransferNow",
    tier: "provider",
    country: { en: "France", nl: "Frankrijk" },
    free: { en: "5 GB per transfer", nl: "5 GB per transfer" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No", nl: "Nee" },
    note: {
      en: "TLS in transit and AES-256 at rest, with an optional passphrase mode on its servers. It does not claim end-to-end encryption.",
      nl: "TLS tijdens verzending en AES-256 in opslag, met een optionele wachtzin op de eigen servers. Het claimt geen end-to-end versleuteling.",
    },
  },
  {
    name: "Boomerang",
    tier: "provider",
    country: { en: "Netherlands; data in the EU", nl: "Nederland; gegevens in de EU" },
    free: { en: "1 GB, 7 days", nl: "1 GB, 7 dagen" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No", nl: "Nee" },
    note: {
      en: "Ad-free and no login, from a WeTransfer co-founder. Encrypted in transit and at rest.",
      nl: "Zonder advertenties en zonder inloggen, van een medeoprichter van WeTransfer. Versleuteld tijdens verzending en in opslag.",
    },
    compare: "boomerang-alternative",
  },
  {
    name: "Filemail",
    tier: "provider",
    country: { en: "Norway (EEA, not EU)", nl: "Noorwegen (EER, geen EU)" },
    free: { en: "5 GB, 7 days", nl: "5 GB, 7 dagen" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No", nl: "Nee" },
    note: {
      en: "End-to-end encryption exists, on its Business and Enterprise plans. The free plan is encrypted in transit.",
      nl: "End-to-end versleuteling bestaat, op de abonnementen Business en Enterprise. Het gratis abonnement is versleuteld tijdens verzending.",
    },
  },
  {
    name: "WeTransfer",
    tier: "provider",
    country: { en: "Netherlands; owned by Bending Spoons (Italy)", nl: "Nederland; eigendom van Bending Spoons (Italië)" },
    free: { en: "3 GB or 10 transfers per 30 days, links 3 days", nl: "3 GB of 10 transfers per 30 dagen, links 3 dagen" },
    account: { en: "No", nl: "Nee" },
    openSource: { en: "No", nl: "Nee" },
    note: {
      en: "The default everyone knows. End-to-end encryption only on Enterprise (50+ seats); ads on the free plan.",
      nl: "De standaard die iedereen kent. End-to-end versleuteling alleen bij Enterprise (50+ gebruikers); advertenties op de gratis versie.",
    },
    compare: "wetransfer-alternative",
  },
];

const en = {
  metaTitle: "European encrypted file transfer services compared - Tessil",
  metaDescription:
    "Eleven European file transfer services, sorted by who can read your files: end-to-end encrypted, direct between devices, or encrypted with the provider's keys.",
  heading: "European file transfer services, by who can read your files",
  summary:
    "\"Hosted in Europe\" and \"encrypted\" are on every service's homepage. What differs is who holds the key. Eleven European options, sorted by that.",
  intro: [
    "Where a service is hosted decides which laws apply to the data it holds. Encryption decides whether that data is readable at all. The two are independent: a service can sit entirely in Europe and still be able to open every file you upload, and most can.",
    "So this list is sorted by one question: who holds the key? Either only the people sharing the file, or nobody because nothing is stored, or the provider. Within each group the services are European, though not all are in the EU: Switzerland and Norway have strong privacy law but are outside it.",
  ],
  tiers: {
    browser: {
      title: "Encrypted in your browser: the provider cannot read your files",
      body: "The file is encrypted before it leaves your device, with a key the service never receives. A court order or a breach yields ciphertext.",
    },
    direct: {
      title: "Direct between devices: nothing is stored",
      body: "The file travels straight from sender to recipient. Private, but both have to be online at the same time.",
    },
    provider: {
      title: "Encrypted with the provider's keys: the provider can read your files",
      body: "Encrypted on the way and on disk, which protects against outsiders. The service itself holds the keys, so it can open the files, and so can anyone who can compel it.",
    },
  },
  columns: { service: "Service", country: "Based", free: "Free plan", account: "Account to send", openSource: "Open source" },
  fullComparison: "Full comparison",
  verified:
    "Details were checked in November 2026 against each provider's own pages. Providers change plans often; check their site before relying on a limit.",
  pickTitle: "How to pick",
  pick: [
    "For documents nobody else should read, pick from the first group. If the code being public matters to you, that narrows it to Tessil and, for its apps, Proton and Internxt.",
    "For very large files that are not sensitive, the third group is more generous: SwissTransfer sends 50 GB and Smash has no limit.",
    "If both of you are at a computer right now, ToffeeShare stores nothing at all.",
    "If you also need to receive files from clients, or collect answers, only some of these do that. Tessil does both, end-to-end encrypted.",
  ],
  faq: [
    {
      q: "Does EU hosting make a file transfer private?",
      a: "No. Hosting decides which laws and courts apply to the data a provider holds. Encryption decides whether that data is readable. A service can be hosted in the EU and still be able to read every file you upload. For privacy you want both: European hosting, and encryption in your browser.",
    },
    {
      q: "Which European file transfer services are end-to-end encrypted on the free plan?",
      a: "As of November 2026: Tessil, Tresorit Send, Internxt Send and Proton Drive, plus ToffeeShare, which sends directly between devices. WeTransfer and Filemail offer end-to-end encryption only on business plans. SwissTransfer, Smash, TransferNow and Boomerang encrypt in transit and at rest, with keys they hold.",
    },
    {
      q: "Is Switzerland in the EU?",
      a: "No, and neither is Norway. Both have strong data-protection law, and the EU treats Switzerland as offering adequate protection. If you need data to stay inside the EU itself, check where a service stores files, not only where the company is based.",
    },
  ] as Faq[],
  cta: "Send a file with Tessil",
  ctaSecondary: "How the encryption works",
  indexCard: "A roundup of eleven European services, sorted by who can read your files.",
  breadcrumb: "European file transfer",
  group: "Roundup",
};

const nl: typeof en = {
  metaTitle: "Versleuteld bestanden versturen: Europese diensten - Tessil",
  metaDescription:
    "Elf Europese diensten om bestanden te versturen, gesorteerd op wie ze kan lezen: end-to-end versleuteld, rechtstreeks, of met sleutels van de aanbieder.",
  heading: "Europese diensten om bestanden te versturen: wie kan ze lezen?",
  summary:
    "\"Gehost in Europa\" en \"versleuteld\" staan op elke homepage. Het verschil zit in wie de sleutel heeft. Elf Europese opties, daarop gesorteerd.",
  intro: [
    "Waar een dienst gehost wordt, bepaalt welke wetten gelden voor de gegevens die hij heeft. Versleuteling bepaalt of die gegevens überhaupt leesbaar zijn. Die twee staan los van elkaar: een dienst kan volledig in Europa staan en toch elk bestand dat je uploadt kunnen openen, en de meeste kunnen dat.",
    "Daarom is deze lijst gesorteerd op één vraag: wie heeft de sleutel? Alleen de mensen die het bestand delen, of niemand omdat er niets wordt bewaard, of de aanbieder. De diensten zijn Europees, maar niet allemaal uit de EU: Zwitserland en Noorwegen hebben sterke privacywetgeving maar vallen erbuiten.",
  ],
  tiers: {
    browser: {
      title: "Versleuteld in je browser: de aanbieder kan je bestanden niet lezen",
      body: "Het bestand wordt versleuteld voordat het je apparaat verlaat, met een sleutel die de dienst nooit krijgt. Een gerechtelijk bevel of een lek levert alleen versleutelde data op.",
    },
    direct: {
      title: "Rechtstreeks tussen apparaten: er wordt niets bewaard",
      body: "Het bestand gaat direct van afzender naar ontvanger. Privé, maar beide moeten tegelijk online zijn.",
    },
    provider: {
      title: "Versleuteld met sleutels van de aanbieder: de aanbieder kan je bestanden lezen",
      body: "Versleuteld onderweg en op schijf, wat beschermt tegen buitenstaanders. De dienst heeft zelf de sleutels en kan de bestanden dus openen, net als wie de dienst daartoe kan dwingen.",
    },
  },
  columns: { service: "Dienst", country: "Gevestigd", free: "Gratis", account: "Account om te versturen", openSource: "Open source" },
  fullComparison: "Volledige vergelijking",
  verified:
    "Gegevens zijn in november 2026 gecontroleerd op de eigen pagina's van elke aanbieder. Aanbieders wijzigen hun abonnementen vaak; kijk op hun site voordat je op een limiet rekent.",
  pickTitle: "Zo kies je",
  pick: [
    "Voor documenten die niemand anders mag lezen, kies je uit de eerste groep. Vind je het belangrijk dat de code openbaar is, dan blijven Tessil en, voor hun apps, Proton en Internxt over.",
    "Voor heel grote bestanden die niet gevoelig zijn, is de derde groep royaler: SwissTransfer verstuurt 50 GB en Smash heeft geen limiet.",
    "Zitten jullie nu allebei achter een computer, dan bewaart ToffeeShare helemaal niets.",
    "Wil je ook bestanden van klanten ontvangen, of antwoorden verzamelen, dan kan dat maar bij een paar. Tessil doet beide, end-to-end versleuteld.",
  ],
  faq: [
    {
      q: "Maakt hosting in de EU een bestandsoverdracht privé?",
      a: "Nee. Hosting bepaalt welke wetten en rechters gelden voor de gegevens van een aanbieder. Versleuteling bepaalt of die gegevens leesbaar zijn. Een dienst kan in de EU gehost zijn en toch elk bestand kunnen lezen. Voor privacy wil je beide: Europese hosting, en versleuteling in je browser.",
    },
    {
      q: "Welke Europese diensten zijn end-to-end versleuteld op het gratis abonnement?",
      a: "In november 2026: Tessil, Tresorit Send, Internxt Send en Proton Drive, plus ToffeeShare, dat rechtstreeks tussen apparaten verstuurt. WeTransfer en Filemail bieden end-to-end versleuteling alleen op zakelijke abonnementen. SwissTransfer, Smash, TransferNow en Boomerang versleutelen tijdens verzending en in opslag, met sleutels die ze zelf hebben.",
    },
    {
      q: "Ligt Zwitserland in de EU?",
      a: "Nee, en Noorwegen ook niet. Beide hebben sterke privacywetgeving, en de EU beschouwt de bescherming in Zwitserland als passend. Moeten gegevens binnen de EU zelf blijven, kijk dan waar een dienst bestanden opslaat, niet alleen waar het bedrijf gevestigd is.",
    },
  ],
  cta: "Verstuur een bestand met Tessil",
  ctaSecondary: "Zo werkt de versleuteling",
  indexCard: "Een overzicht van elf Europese diensten, gesorteerd op wie je bestanden kan lezen.",
  breadcrumb: "Europese bestandsoverdracht",
  group: "Overzicht",
};

export const roundupText: Record<Locale, typeof en> = { en, nl };

export const TIERS: Tier[] = ["browser", "direct", "provider"];

/** The roundup's address in a language. */
export function roundupPath(locale: Locale): string {
  return locale === "nl" ? `/nl/vergelijken/${ROUNDUP_SLUG_NL}` : `/compare/${ROUNDUP_SLUG}`;
}

/** The whole roundup as Markdown, for AI agents. */
export function roundupMarkdown(locale: Locale, siteUrl: string, depth = 0): string {
  const t = roundupText[locale];
  const h = (n: number) => "#".repeat(n + depth);
  const c = t.columns;
  return [
    `${h(1)} ${t.heading}`,
    "",
    `> ${t.summary}`,
    "",
    `${siteUrl}${roundupPath(locale)}  `,
    `${ROUNDUP_VERIFIED_ISO}`,
    "",
    ...t.intro.flatMap((p) => [p, ""]),
    ...TIERS.flatMap((tier) => [
      `${h(2)} ${t.tiers[tier].title}`,
      "",
      t.tiers[tier].body,
      "",
      `| ${c.service} | ${c.country} | ${c.free} | ${c.account} | ${c.openSource} |`,
      "| --- | --- | --- | --- | --- |",
      ...ROUNDUP_SERVICES.filter((s) => s.tier === tier).map(
        (s) => `| ${s.name} | ${s.country[locale]} | ${s.free[locale]} | ${s.account[locale]} | ${s.openSource[locale]} |`,
      ),
      "",
      ...ROUNDUP_SERVICES.filter((s) => s.tier === tier).map((s) => `- **${s.name}**: ${s.note[locale]}`),
      "",
    ]),
    t.verified,
    "",
    `${h(2)} ${t.pickTitle}`,
    "",
    ...t.pick.map((p) => `- ${p}`),
    "",
    ...t.faq.flatMap((f) => [`${h(3)} ${f.q}`, "", f.a, ""]),
  ].join("\n");
}
