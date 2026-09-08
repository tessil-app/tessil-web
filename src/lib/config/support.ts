// Donation destinations. Plain outbound links only: script-src is pinned to
// self, and an embedded Polar/Ko-fi widget would break both that and /verify.

// Two Polar products, because a product's billing type is fixed at creation.
// Both are pay-what-you-want with no benefits attached, which keeps the
// "it unlocks nothing" promise on /pricing literally true.
export const SUPPORT_POLAR_MONTHLY_URL =
  "https://buy.polar.sh/polar_cl_J1ibT1K9Ado5UWQx9zZ8NLxNqqJwqOyZXuRJ31myOW8";
export const SUPPORT_POLAR_ONETIME_URL =
  "https://buy.polar.sh/polar_cl_tjkxwpT7mCaoWpyH7KJhU3Yf8HLSDhRAyVuQf0bB6kJ";

/** Where a monthly supporter cancels. Must stay reachable without an account. */
export const SUPPORT_POLAR_PORTAL_URL = "https://polar.sh/tessil/portal";

export const SUPPORT_KOFI_URL = "https://ko-fi.com/jimmyverburgt";
export const SUPPORT_GITHUB_SPONSORS_URL =
  "https://github.com/sponsors/VerburgtJimmy";

/** Fallback for anyone who cannot find the portal. Answered by a human. */
export const SUPPORT_EMAIL = "hello@tessil.app";
