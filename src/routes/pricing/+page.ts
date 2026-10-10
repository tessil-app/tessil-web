// Static content page: render to real HTML at build time so crawlers and link
// unfurlers see it. Prices come from $lib/config/pricing; checkout itself is
// started from the upload page and from account settings, not from here.
export const ssr = true;
export const prerender = true;
