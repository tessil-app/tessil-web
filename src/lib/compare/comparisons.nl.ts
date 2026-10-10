// Dutch comparison content. Written for Dutch search intent rather than
// translated line by line from the English, so wording and emphasis differ
// on purpose. Claims must stay identical in substance to the English page.
//
// `enSlug` links each entry to its English counterpart, which is what drives
// hreflang and the language switcher.

import type { Comparison } from "./comparisons";

export type LocalizedComparison = Comparison & {
  /** Slug of the English page this translates, for hreflang pairing. */
  enSlug: string;
};

/** Shown on every page so competitor facts are dated, not eternal truth. */
export const LAST_VERIFIED_NL = "juni 2026";

const TESSIL_NL = {
  e2e: true,
  keyServer: true,
  noAccount: true,
  openSource: "Ja (AGPL-3.0)",
  hosting: "EU (Duitsland + Nederland)",
  tracking: "Geen",
  price: "EUR 1 per transfer of EUR 5 per maand",
  expiry: true,
  password: true,
};

export const comparisonsNl: LocalizedComparison[] = [
  {
    slug: "wetransfer-alternatief",
    enSlug: "wetransfer-alternative",
    competitor: "WeTransfer",
    shortName: "WeTransfer",
    metaTitle: "Versleuteld WeTransfer alternatief - Tessil",
    metaDescription:
      "Een versleuteld alternatief voor WeTransfer. Tessil versleutelt bestanden in je browser en ziet je bestanden of sleutel nooit. Open source, EU-hosting, geen advertenties.",
    heading: "Tessil vs WeTransfer",
    summary:
      "Een end-to-end versleuteld alternatief voor WeTransfer. Je bestanden zijn voor ons onleesbaar: niet als instelling, maar als ontwerp.",
    intro: [
      "WeTransfer is voor de meeste mensen de standaardmanier om grote bestanden te versturen: slepen, link delen, klaar. Handig, maar niet end-to-end versleuteld. WeTransfer beheert zelf de sleutels, dus de dienst (en wie de dienst daartoe kan dwingen) kan in principe bij wat je uploadt. Op de gratis versie krijg je daarnaast advertenties en analytics, en in 2025 ontstond er kritiek op voorwaarden die vergaande rechten op geüploade bestanden leken te claimen, later herzien.",
      "Tessil is gebouwd voor het geval dat dit wel uitmaakt. Bestanden worden in je browser versleuteld met AES-GCM voordat ze je apparaat verlaten, en de ontsleutelsleutel staat in het URL-fragment van de deellink: het deel na de # dat browsers nooit naar een server sturen. Wij bewaren alleen versleutelde data die we zelf niet kunnen lezen.",
      "Tessil is open source (AGPL-3.0), volledig gehost in de EU, en je hebt geen account nodig om iets te versturen. Versturen kost EUR 1 per transfer of EUR 5 per maand; ontvangen is gratis.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: false },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: false },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: false },
      {
        label: "Hosting / jurisdictie",
        tessil: TESSIL_NL.hosting,
        competitor: "EU (NL); eigendom van Bending Spoons",
      },
      {
        label: "Advertenties en tracking van derden",
        tessil: TESSIL_NL.tracking,
        competitor: "Advertenties op de gratis versie",
      },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis versie + betaalde abonnementen" },
      { label: "Vervaltermijn en downloadlimieten", tessil: TESSIL_NL.expiry, competitor: true },
      { label: "Wachtwoordbeveiliging", tessil: TESSIL_NL.password, competitor: true },
    ],
    verdict: [
      "Wil je gewoon snel een bestand naar iemand sturen en speelt privacy geen rol, dan is WeTransfer prima en wrijvingsloos. Wil je dat de dienst je bestanden simpelweg niet kán lezen, voor klantwerk, documenten of wat dan ook dat gevoelig ligt, dan geeft Tessil je dat zonder dat je de simpele link-flow opgeeft.",
      "WeTransfer heeft een gratis versie en Tessil niet: versturen kost EUR 1 per transfer of EUR 5 per maand. Die prijs, en niet advertenties of je data, betaalt voor zero-knowledge versleuteling.",
    ],
    faq: [
      {
        q: "Is WeTransfer end-to-end versleuteld?",
        a: "Nee. WeTransfer versleutelt bestanden onderweg en in opslag, maar beheert zelf de sleutels, dus de dienst kan bij je bestanden. Tessil versleutelt in je browser en ontvangt de sleutel nooit.",
      },
      {
        q: "Kan ik met Tessil grote bestanden versturen zoals met WeTransfer?",
        a: "Tessil uploadt in delen tot de huidige limiet per transfer. Die limiet ligt lager dan bij de betaalde abonnementen van WeTransfer, in ruil voor echte end-to-end versleuteling en geen advertenties.",
      },
      {
        q: "Heb ik een account nodig om Tessil te gebruiken?",
        a: "Nee. Met een eenmalige pas van EUR 1 verstuur je een transfer zonder account. Een account heb je alleen nodig voor het maandabonnement van EUR 5, en geeft je een overzicht van de transfers die je aanmaakt. Het verandert niets aan de manier waarop bestanden versleuteld worden.",
      },
    ],
  },
];

export function getComparisonNl(slug: string): LocalizedComparison | undefined {
  return comparisonsNl.find((c) => c.slug === slug);
}

/** Dutch slug for an English one, when a translation exists. */
export function nlSlugForEn(enSlug: string): string | undefined {
  return comparisonsNl.find((c) => c.enSlug === enSlug)?.slug;
}
