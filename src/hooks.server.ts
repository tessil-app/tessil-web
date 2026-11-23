import type { Handle } from "@sveltejs/kit";
import { HTML_LANG, localeFromPath } from "$lib/i18n/locale";
import { canonicalPath } from "$lib/i18n/paths";

// The lang attribute lives on <html>, outside the Svelte tree, so a component
// cannot set it. This runs during prerendering too, so each prerendered page
// gets the right value baked into its static HTML.
//
// Client-side navigation does not re-run this; the root layout sets the
// attribute again whenever the language changes.
// The link-preview image has to be in the static HTML for crawlers, and only
// the first og:image counts, so it is filled in here per page as well.
const PREVIEW_IMAGES: Record<string, string> = {
  "/portals": "/og-portals.png",
};
const DEFAULT_PREVIEW_IMAGE = "/og-image.png";

export const handle: Handle = async ({ event, resolve }) => {
  const lang = HTML_LANG[localeFromPath(event.url.pathname)];
  const image = PREVIEW_IMAGES[canonicalPath(event.url.pathname)] ?? DEFAULT_PREVIEW_IMAGE;
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace("%tessil.lang%", lang).replaceAll("%tessil.ogimage%", image),
  });
};
