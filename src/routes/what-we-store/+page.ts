// Static trust page: render to real HTML at build time so crawlers and link
// unfurlers see the content, not the SPA shell. Overrides the app-wide ssr=false.
export const ssr = true;
export const prerender = true;
