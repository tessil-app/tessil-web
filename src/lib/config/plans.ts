// What each plan includes, for the pricing page and the homepage. The
// limits mirror the API's defaults (tessil-api/src/config/tiers.ts and its
// PLAN_* settings); change both together. Prices are charged by Polar,
// so these numbers must match the products there.

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
      "Links that last up to 3 days",
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
export const COMPARISON: ComparisonGroup[] = [
  {
    title: "Sending",
    rows: [
      { label: "Size of one transfer", values: { free: "1 GB", pro: "10 GB", max: "10 GB" } },
      { label: "Size of one file", values: { free: "1 GB", pro: "5 GB", max: "5 GB" } },
      {
        label: "How long a link can last",
        note: "You pick per transfer, from one hour up to this.",
        values: { free: "3 days", pro: "30 days", max: "90 days" },
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
  ...(FORMS_ANNOUNCED
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
  ...(ACCESS_KEYS_ANNOUNCED
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

export function priceLabel(plan: Plan, cycle: Cycle): string {
  if (!plan.price) return "€0";
  return `€${plan.price[cycle]}`;
}

export function priceUnit(plan: Plan, cycle: Cycle): string {
  if (!plan.price) return "always";
  return cycle === "annual" ? "a year" : "a month";
}
