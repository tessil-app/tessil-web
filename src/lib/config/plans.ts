// What each plan includes, for the pricing page and the homepage. The
// limits mirror the API's defaults (tessil-api/src/config/tiers.ts and its
// PLAN_* settings); change both together. Prices are charged by Polar,
// so these numbers must match the products there.

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
      "A dashboard of what you sent",
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
      "3 portals",
      "20 GB of storage",
      "Deliveries kept for 30 days",
      "Send up to 5 GB per file",
      "Links that last up to 30 days",
      "Share a portal with one person",
    ],
  },
  {
    id: "max",
    name: "Max",
    pitch: "For a lot of it.",
    price: { monthly: 19, annual: 190 },
    lead: "Everything in Pro, and:",
    features: [
      "10 portals",
      "100 GB of storage",
      "Deliveries kept for 90 days",
      "Links that last up to 90 days",
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
