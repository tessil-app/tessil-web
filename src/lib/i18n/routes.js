// Every page that exists in more than one language: its English address,
// which is also the route in src/routes, and its address in each other
// language. The one place this is written down. Read by the router
// (src/hooks.ts), the head tags (Seo.svelte), the language switch and the
// build (svelte.config.js), so a page is translated by adding it here and
// giving it Dutch text.
//
// Plain JavaScript, because svelte.config.js reads it before TypeScript runs.

// `needs` names the launch flag a page waits for, so the build skips its
// Dutch address until the English page exists too.

/** @typedef {"VITE_PORTALS_ANNOUNCED" | "VITE_FORMS_ANNOUNCED" | "VITE_ACCESS_KEYS_ANNOUNCED"} Flag */
/** @type {Record<string, { nl: string, needs?: Flag }>} */
export const LOCALIZED = {
  "/": { nl: "/nl" },
  "/portals": { nl: "/nl/portalen" },
  "/forms": { nl: "/nl/formulieren", needs: "VITE_FORMS_ANNOUNCED" },
  "/pricing": { nl: "/nl/prijzen" },
  "/what-we-store": { nl: "/nl/wat-we-bewaren" },
  "/security": { nl: "/nl/beveiliging" },
  "/privacy": { nl: "/nl/privacy" },
  "/terms": { nl: "/nl/voorwaarden" },
  "/verify": { nl: "/nl/controleren" },
  "/abuse": { nl: "/nl/misbruik" },
  "/cli": { nl: "/nl/cli", needs: "VITE_ACCESS_KEYS_ANNOUNCED" },
  "/compare": { nl: "/nl/vergelijken" },
  "/compare/wetransfer-alternative": { nl: "/nl/vergelijken/wetransfer-alternatief" },
  "/compare/boomerang-alternative": { nl: "/nl/vergelijken/boomerang-alternatief" },
  "/compare/proton-drive-alternative": { nl: "/nl/vergelijken/proton-drive-alternatief" },
  "/compare/tresorit-send-alternative": { nl: "/nl/vergelijken/tresorit-send-alternatief" },
  "/compare/wormhole-alternative": { nl: "/nl/vergelijken/wormhole-alternatief" },
  "/compare/zivver-alternative": { nl: "/nl/vergelijken/zivver-alternatief", needs: "VITE_PORTALS_ANNOUNCED" },
  "/compare/dropbox-file-request-alternative": { nl: "/nl/vergelijken/dropbox-bestandsverzoek-alternatief", needs: "VITE_PORTALS_ANNOUNCED" },
  "/compare/google-forms-alternative": { nl: "/nl/vergelijken/google-forms-alternatief", needs: "VITE_FORMS_ANNOUNCED" },
  "/compare/typeform-alternative": { nl: "/nl/vergelijken/typeform-alternatief", needs: "VITE_FORMS_ANNOUNCED" },
  "/compare/jotform-alternative": { nl: "/nl/vergelijken/jotform-alternatief", needs: "VITE_FORMS_ANNOUNCED" },
  "/compare/formdesk-alternative": { nl: "/nl/vergelijken/formdesk-alternatief", needs: "VITE_FORMS_ANNOUNCED" },
};

/** Every non-English address. */
export const LOCALIZED_ENTRIES = Object.values(LOCALIZED).map((paths) => paths.nl);

/**
 * The non-English addresses the build should render, given its settings.
 * @param {Record<string, string | undefined>} env
 */
export function entriesFor(env) {
  return Object.values(LOCALIZED)
    .filter((paths) => !paths.needs || env[paths.needs] === "true")
    .map((paths) => paths.nl);
}
