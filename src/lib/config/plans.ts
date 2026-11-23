// What each plan includes, for the pricing page and the homepage. The
// limits mirror the API's defaults (tessil-api/src/config/tiers.ts and its
// PLAN_* settings); change both together. Prices are charged by Polar,
// so these numbers must match the products there.

import type { Locale } from "$lib/i18n/locale";
import { ACCESS_KEYS_ANNOUNCED, FORMS_ANNOUNCED } from "./launch";

export type PlanId = "free" | "pro" | "max";
export type Cycle = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  /** One line under the name. */
  pitch: string;
  /** Euros. Null for the free plan. */
  price: Record<Cycle, number> | null;
  /** Shown above the list, e.g. "Everything in Free, and:". */
  lead: string | null;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    pitch: "For sending.",
    price: null,
    lead: null,
    features: [
      "Send up to 1 GB per transfer",
      "2 GB a month, 20 transfers a day",
      "Links that last up to 7 days",
      "A list of what you sent",
      "Can be invited to someone's portal",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pitch: "For receiving too.",
    price: { monthly: 9, annual: 90 },
    lead: "Everything in Free, and:",
    features: [
      "3 portals, each with its own checklist and texts",
      ...(FORMS_ANNOUNCED ? ["3 forms of up to 15 questions"] : []),
      "20 GB of storage",
      "Transfers and portal files kept up to 30 days",
      "Send up to 5 GB per file",
      "Share a portal with one person",
    ],
  },
  {
    id: "max",
    name: "Max",
    pitch: "More room, and a page that looks like yours.",
    price: { monthly: 19, annual: 190 },
    lead: "Everything in Pro, and:",
    features: [
      "10 portals",
      ...(FORMS_ANNOUNCED ? ["10 forms of up to 50 questions"] : []),
      "100 GB of storage",
      "Transfers and portal files kept up to 90 days",
      "Your logo, a password and files going back",
    ],
  },
];

/** A cell in the comparison: a limit in words, or simply included or not. */
export type PlanValue = string | boolean;

export interface ComparisonRow {
  label: string;
  /** A short clarification under the label. */
  note?: string;
  values: Record<PlanId, PlanValue>;
}

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

const all = (value: PlanValue): Record<PlanId, PlanValue> => ({ free: value, pro: value, max: value });
const paid = { free: false, pro: true, max: true } as const;
const maxOnly = { free: false, pro: false, max: true } as const;

// Every limit per plan. Same source as the lists above: the API's tiers.
/** The table for a set of launched products. */
export function comparisonGroups(shown: { forms: boolean; accessKeys: boolean }): ComparisonGroup[] {
  return [
  {
    title: "Sending",
    rows: [
      { label: "Size of one transfer", values: { free: "1 GB", pro: "10 GB", max: "10 GB" } },
      { label: "Size of one file", values: { free: "1 GB", pro: "5 GB", max: "5 GB" } },
      {
        label: "How long a link can last",
        note: "You pick per transfer, from one hour up to this.",
        values: { free: "7 days", pro: "30 days", max: "90 days" },
      },
      {
        label: "Sent per month",
        note: "On the paid plans a fair-use ceiling; storage is the limit that counts.",
        values: { free: "2 GB", pro: "100 GB", max: "500 GB" },
      },
      { label: "Transfers per day", values: { free: "20", pro: "100", max: "100" } },
      { label: "Password and download limit on a link", values: all(true) },
      { label: "List of what you sent", values: all(true) },
    ],
  },
  {
    title: "Receiving through portals",
    rows: [
      { label: "Portals", values: { free: false, pro: "3", max: "10" } },
      {
        label: "Storage",
        note: "Everything you hold at one time: files in your portals and your own transfers.",
        values: { free: false, pro: "20 GB", max: "100 GB" },
      },
      { label: "How long files in a portal are kept", values: { free: false, pro: "30 days", max: "90 days" } },
      { label: "What one person can send to a portal at once", values: { free: false, pro: "10 GB", max: "10 GB" } },
      { label: "Checklist of what you ask for", values: paid },
      { label: "Confirmation for the sender, record for you", values: paid },
      { label: "Share a portal with one person", values: paid },
      {
        label: "Be invited to someone else's portal",
        values: all(true),
      },
    ],
  },
  {
    title: "Options per portal",
    rows: [
      { label: "Welcome message and thank-you note", values: paid },
      { label: "A field of your own", note: "A name, client number or reference.", values: paid },
      { label: "Closing date", values: paid },
      { label: "Email when files arrive", values: paid },
      { label: "Duplicate a portal", values: paid },
      { label: "Your logo on the page", values: maxOnly },
      {
        label: "Send files back",
        note: "Kept as long as your links can last.",
        values: maxOnly,
      },
      { label: "Password on a portal", values: maxOnly },
    ],
  },
  // Shown once forms are announced. Counts mirror PLAN_*_MAX_FORMS in the API
  // and questionLimit in $lib/form/questions.
  ...(shown.forms
    ? [
        {
          title: "Asking through forms",
          rows: [
            { label: "Forms", values: { free: false, pro: "3", max: "10" } },
            { label: "Questions per form", values: { free: false, pro: "15", max: "50" } },
            {
              label: "Kinds of question",
              note: "Short and long text, one choice, several choices, yes or no, date, file.",
              values: paid,
            },
            {
              label: "How long responses are kept",
              note: "Files in responses count towards your storage.",
              values: { free: false, pro: "30 days", max: "90 days" },
            },
            { label: "Summary per question and export to CSV", values: paid },
            { label: "Confirmation for the sender, record for you", values: paid },
            { label: "Welcome message, thank-you note and closing date", values: paid },
            { label: "Email when someone answers", values: paid },
            { label: "Share a form with one person", values: paid },
            { label: "Your logo on the form", values: maxOnly },
            { label: "Password on a form", values: maxOnly },
          ],
        } satisfies ComparisonGroup,
      ]
    : []),
  // Shown once the command-line tool is released.
  ...(shown.accessKeys
    ? [
        {
          title: "From a terminal or an AI assistant",
          rows: [
            {
              label: "Access keys",
              note: "One per computer or assistant that uses the tessil tool.",
              values: { free: "1", pro: "3", max: "10" },
            },
            { label: "Send, fetch and list transfers", values: all(true) },
            { label: "Read portals you hand to a key", note: "List and download what arrived.", values: paid },
            { label: "Use it from an assistant (MCP)", note: "It never receives a link or a key.", values: all(true) },
          ],
        } satisfies ComparisonGroup,
      ]
    : []),
  {
    title: "On every plan",
    rows: [
      { label: "End-to-end encryption", note: "Files, names, titles and notes.", values: all(true) },
      { label: "No tracking, no ads, no data selling", values: all(true) },
      { label: "Vault with passkeys and a recovery phrase", values: all(true) },
    ],
  },
];
}

export const COMPARISON: ComparisonGroup[] = comparisonGroups({
  forms: FORMS_ANNOUNCED,
  accessKeys: ACCESS_KEYS_ANNOUNCED,
});

// The same plans in Dutch. Numbers and order as above; only the words differ.
const PLAN_TEXT_NL: Record<PlanId, Pick<Plan, "name" | "pitch" | "lead" | "features">> = {
  free: {
    name: "Gratis",
    pitch: "Om te versturen.",
    lead: null,
    features: [
      "Verstuur tot 1 GB per transfer",
      "2 GB per maand, 20 transfers per dag",
      "Links die tot 7 dagen geldig blijven",
      "Een lijst met wat je verstuurde",
      "Kan uitgenodigd worden voor iemands portaal",
    ],
  },
  pro: {
    name: "Pro",
    pitch: "Ook om te ontvangen.",
    lead: "Alles van Gratis, plus:",
    features: [
      "3 portalen, elk met een eigen checklist en teksten",
      ...(FORMS_ANNOUNCED ? ["3 formulieren met tot 15 vragen"] : []),
      "20 GB opslag",
      "Transfers en portaalbestanden tot 30 dagen bewaard",
      "Verstuur tot 5 GB per bestand",
      "Deel een portaal met één persoon",
    ],
  },
  max: {
    name: "Max",
    pitch: "Meer ruimte, en een pagina die eruitziet als de jouwe.",
    lead: "Alles van Pro, plus:",
    features: [
      "10 portalen",
      ...(FORMS_ANNOUNCED ? ["10 formulieren met tot 50 vragen"] : []),
      "100 GB opslag",
      "Transfers en portaalbestanden tot 90 dagen bewaard",
      "Je logo, een wachtwoord en bestanden terugsturen",
    ],
  },
};

/** The plans with their words in a language. */
export function plansFor(locale: Locale): Plan[] {
  return locale === "nl" ? PLANS.map((p) => ({ ...p, ...PLAN_TEXT_NL[p.id] })) : PLANS;
}

export function priceLabel(plan: Plan, cycle: Cycle): string {
  if (!plan.price) return "€0";
  return `€${plan.price[cycle]}`;
}

export function priceUnit(plan: Plan, cycle: Cycle, locale: Locale = "en"): string {
  if (locale === "nl") {
    if (!plan.price) return "altijd";
    return cycle === "annual" ? "per jaar" : "per maand";
  }
  if (!plan.price) return "always";
  return cycle === "annual" ? "a year" : "a month";
}

// The comparison's words in Dutch, by their English wording. Numbers stay as
// they are. plans.test.ts checks that every row has its Dutch.
const COMPARISON_NL: Record<string, string> = {
  Sending: "Versturen",
  "Size of one transfer": "Grootte van één transfer",
  "Size of one file": "Grootte van één bestand",
  "How long a link can last": "Hoe lang een link geldig kan blijven",
  "You pick per transfer, from one hour up to this.": "Je kiest per transfer, van een uur tot dit maximum.",
  "Sent per month": "Verstuurd per maand",
  "On the paid plans a fair-use ceiling; storage is the limit that counts.":
    "Bij de betaalde abonnementen een redelijk-gebruikgrens; opslag is de grens die telt.",
  "Transfers per day": "Transfers per dag",
  "Password and download limit on a link": "Wachtwoord en downloadlimiet op een link",
  "List of what you sent": "Lijst met wat je verstuurde",
  "Receiving through portals": "Ontvangen via portalen",
  Portals: "Portalen",
  Storage: "Opslag",
  "Everything you hold at one time: files in your portals and your own transfers.":
    "Alles wat je tegelijk bewaart: bestanden in je portalen en je eigen transfers.",
  "How long files in a portal are kept": "Hoe lang bestanden in een portaal bewaard blijven",
  "What one person can send to a portal at once": "Wat één persoon in één keer naar een portaal kan sturen",
  "Checklist of what you ask for": "Checklist van wat je vraagt",
  "Confirmation for the sender, record for you": "Bevestiging voor de afzender, overzicht voor jou",
  "Share a portal with one person": "Deel een portaal met één persoon",
  "Be invited to someone else's portal": "Uitgenodigd worden voor het portaal van een ander",
  "Options per portal": "Opties per portaal",
  "Welcome message and thank-you note": "Welkomstbericht en bedankje",
  "A field of your own": "Een eigen veld",
  "A name, client number or reference.": "Een naam, klantnummer of referentie.",
  "Closing date": "Sluitingsdatum",
  "Email when files arrive": "E-mail als er bestanden binnenkomen",
  "Duplicate a portal": "Een portaal dupliceren",
  "Your logo on the page": "Je logo op de pagina",
  "Send files back": "Bestanden terugsturen",
  "Kept as long as your links can last.": "Bewaard zo lang als je links geldig kunnen blijven.",
  "Password on a portal": "Wachtwoord op een portaal",
  "Asking through forms": "Vragen via formulieren",
  Forms: "Formulieren",
  "Questions per form": "Vragen per formulier",
  "Kinds of question": "Soorten vragen",
  "Short and long text, one choice, several choices, yes or no, date, file.":
    "Korte en lange tekst, één keuze, meerdere keuzes, ja of nee, datum, bestand.",
  "How long responses are kept": "Hoe lang reacties bewaard blijven",
  "Files in responses count towards your storage.": "Bestanden in reacties tellen mee voor je opslag.",
  "Summary per question and export to CSV": "Samenvatting per vraag en export naar CSV",
  "Welcome message, thank-you note and closing date": "Welkomstbericht, bedankje en sluitingsdatum",
  "Email when someone answers": "E-mail als iemand antwoordt",
  "Share a form with one person": "Deel een formulier met één persoon",
  "Your logo on the form": "Je logo op het formulier",
  "Password on a form": "Wachtwoord op een formulier",
  "From a terminal or an AI assistant": "Vanuit een terminal of een AI-assistent",
  "Access keys": "Toegangssleutels",
  "One per computer or assistant that uses the tessil tool.": "Eén per computer of assistent die de tessil-tool gebruikt.",
  "Send, fetch and list transfers": "Transfers versturen, ophalen en opsommen",
  "Read portals you hand to a key": "Portalen lezen die je aan een sleutel geeft",
  "List and download what arrived.": "Bekijk en download wat er binnenkwam.",
  "Use it from an assistant (MCP)": "Gebruik vanuit een assistent (MCP)",
  "It never receives a link or a key.": "Die krijgt nooit een link of een sleutel.",
  "On every plan": "Bij elk abonnement",
  "End-to-end encryption": "End-to-end versleuteling",
  "Files, names, titles and notes.": "Bestanden, namen, titels en notities.",
  "No tracking, no ads, no data selling": "Geen tracking, geen advertenties, geen verkoop van gegevens",
  "Vault with passkeys and a recovery phrase": "Kluis met passkeys en een herstelzin",
};

/** A value such as "30 days" in Dutch; sizes and counts need nothing. */
export function valueNl(value: PlanValue): PlanValue {
  if (typeof value !== "string") return value;
  return value.replace(/^(\d+) days?$/, (_, n) => `${n} ${n === "1" ? "dag" : "dagen"}`);
}

/** The comparison with its words in a language. Unknown words stay English. */
export function comparisonFor(locale: Locale): ComparisonGroup[] {
  if (locale === "en") return COMPARISON;
  const w = (text: string) => COMPARISON_NL[text] ?? text;
  return COMPARISON.map((group) => ({
    title: w(group.title),
    rows: group.rows.map((row) => ({
      label: w(row.label),
      note: row.note === undefined ? undefined : w(row.note),
      values: { free: valueNl(row.values.free), pro: valueNl(row.values.pro), max: valueNl(row.values.max) },
    })),
  }));
}

/** English words in the comparison with no Dutch yet. For the test. */
export function untranslatedComparison(): string[] {
  return comparisonGroups({ forms: true, accessKeys: true }).flatMap((g) => [g.title, ...g.rows.flatMap((r) => [r.label, ...(r.note ? [r.note] : [])])]).filter(
    (text) => !(text in COMPARISON_NL),
  );
}

