import type { Handle } from "@sveltejs/kit";
import { HTML_LANG, localeFromPath } from "$lib/i18n/locale";

// The lang attribute lives on <html>, outside the Svelte tree, so a component
// cannot set it. This runs during prerendering too, so each prerendered page
// gets the right value baked into its static HTML.
//
// Client-side navigation between locales does not re-run this. That is fine
// while Dutch exists only on prerendered content pages, which are full page
// loads from search. Revisit if the app itself becomes localised.
// The link-preview image has to be in the static HTML for crawlers, and only
// the first og:image counts, so it is filled in here per page as well.
const PREVIEW_IMAGES: Record<string, string> = {
  "/portals": "/og-portals.png",
};
const DEFAULT_PREVIEW_IMAGE = "/og-image.png";

export const handle: Handle = async ({ event, resolve }) => {
  const lang = HTML_LANG[localeFromPath(event.url.pathname)];
  const image = PREVIEW_IMAGES[event.url.pathname] ?? DEFAULT_PREVIEW_IMAGE;
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace("%tessil.lang%", lang).replaceAll("%tessil.ogimage%", image),
  });
};
