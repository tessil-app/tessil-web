// Locale-keyed UI strings. Long-form prose does not belong here: legal texts
// and comparison copy are documents and live in per-locale content files
// (see $lib/compare). This file is for chrome and short labels only.
//
// New user-facing labels go in here rather than inline in a component, so
// adding a locale stays a data change.

import type { Locale } from "./locale";

export interface HowItWorksStrings {
  heading: string;
  steps: { action: string; transparency: string }[];
}

export const howItWorksStrings: Record<Locale, HowItWorksStrings> = {
  en: {
    heading: "How it works",
    steps: [
      { action: "You drop a file.", transparency: "We never know what it's called." },
      { action: "Your browser encrypts it.", transparency: "We never have the key." },
      {
        action: "We store ciphertext.",
        transparency: "We can't read it. Not for police, not for ourselves.",
      },
      {
        action: "The recipient decrypts in their browser.",
        transparency: "The key never reaches our server.",
      },
    ],
  },
  nl: {
    heading: "Hoe het werkt",
    steps: [
      { action: "Je sleept een bestand naar de pagina.", transparency: "Wij weten nooit hoe het heet." },
      { action: "Je browser versleutelt het.", transparency: "Wij krijgen de sleutel nooit." },
      {
        action: "Wij bewaren alleen versleutelde data.",
        transparency: "Onleesbaar voor ons. Niet voor de politie, en niet voor onszelf.",
      },
      {
        action: "De ontvanger ontsleutelt in zijn eigen browser.",
        transparency: "De sleutel bereikt onze server nooit.",
      },
    ],
  },
};

export interface CompareStrings {
  breadcrumbHome: string;
  breadcrumbCompare: string;
  feature: string;
  yes: string;
  no: string;
  verdictHeading: string;
  faqHeading: string;
  moreHeading: string;
  ctaPrimary: string;
  ctaSecondary: string;
  otherLanguage: string;
  tableCaption: (competitor: string) => string;
  lastVerified: (competitor: string, date: string) => string;
}

export const compareStrings: Record<Locale, CompareStrings> = {
  en: {
    breadcrumbHome: "Home",
    breadcrumbCompare: "Compare",
    feature: "Feature",
    yes: "Yes",
    no: "No",
    verdictHeading: "The honest verdict",
    faqHeading: "Frequently asked questions",
    moreHeading: "More comparisons",
    ctaPrimary: "Send a file with Tessil",
    ctaSecondary: "How the encryption works",
    otherLanguage: "Nederlands",
    tableCaption: (competitor) =>
      `Feature comparison: Tessil versus ${competitor}`,
    lastVerified: (competitor, date) =>
      `${competitor} details last verified ${date}. Competitor features and pricing change often - check the provider's own site for current details.`,
  },
  nl: {
    breadcrumbHome: "Home",
    breadcrumbCompare: "Vergelijken",
    feature: "Functie",
    yes: "Ja",
    no: "Nee",
    verdictHeading: "Het eerlijke oordeel",
    faqHeading: "Veelgestelde vragen",
    moreHeading: "Meer vergelijkingen",
    ctaPrimary: "Verstuur een bestand met Tessil",
    ctaSecondary: "Zo werkt de versleuteling",
    otherLanguage: "English",
    tableCaption: (competitor) =>
      `Functievergelijking: Tessil versus ${competitor}`,
    lastVerified: (competitor, date) =>
      `Gegevens over ${competitor} voor het laatst gecontroleerd in ${date}. Functies en prijzen van aanbieders veranderen vaak - controleer de site van de aanbieder zelf voor de actuele stand.`,
  },
};
