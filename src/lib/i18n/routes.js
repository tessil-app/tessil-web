// Every page that exists in more than one language: its English address,
// which is also the route in src/routes, and its address in each other
// language. The one place this is written down. Read by the router
// (src/hooks.ts), the head tags (Seo.svelte), the language switch and the
// build (svelte.config.js), so a page is translated by adding it here and
// giving it Dutch text.
//
// Plain JavaScript, because svelte.config.js reads it before TypeScript runs.

/** @type {Record<string, { nl: string }>} */
export const LOCALIZED = {
  "/": { nl: "/nl" },
  "/portals": { nl: "/nl/portalen" },
  "/forms": { nl: "/nl/formulieren" },
  "/pricing": { nl: "/nl/prijzen" },
  "/what-we-store": { nl: "/nl/wat-we-bewaren" },
  "/security": { nl: "/nl/beveiliging" },
  "/privacy": { nl: "/nl/privacy" },
  "/terms": { nl: "/nl/voorwaarden" },
  "/verify": { nl: "/nl/controleren" },
  "/abuse": { nl: "/nl/misbruik" },
  "/compare": { nl: "/nl/vergelijken" },
  "/compare/wetransfer-alternative": { nl: "/nl/vergelijken/wetransfer-alternatief" },
  "/compare/zivver-alternative": { nl: "/nl/vergelijken/zivver-alternatief" },
  "/compare/dropbox-file-request-alternative": { nl: "/nl/vergelijken/dropbox-bestandsverzoek-alternatief" },
  "/compare/google-forms-alternative": { nl: "/nl/vergelijken/google-forms-alternatief" },
  "/compare/typeform-alternative": { nl: "/nl/vergelijken/typeform-alternatief" },
  "/compare/jotform-alternative": { nl: "/nl/vergelijken/jotform-alternatief" },
  "/compare/formdesk-alternative": { nl: "/nl/vergelijken/formdesk-alternatief" },
};

/** Every non-English address, for the build to prerender. */
export const LOCALIZED_ENTRIES = Object.values(LOCALIZED).map((paths) => paths.nl);
