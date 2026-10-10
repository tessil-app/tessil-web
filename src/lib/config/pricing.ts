// Prices shown in the UI. Polar holds the amounts actually charged, so a
// change there must be mirrored here.
export const PASS_PRICE = "€1";
export const PLAN_PRICE = "€5";

/** Where a subscriber cancels. Must stay reachable without an account. */
export const BILLING_PORTAL_URL = "https://polar.sh/tessil/portal";

/** Fallback for anyone who cannot find the portal. Answered by a human. */
export const BILLING_EMAIL = "hello@tessil.app";
