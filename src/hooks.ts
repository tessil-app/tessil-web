// A Dutch address is served by the same route as its English one: /nl/portalen
// renders src/routes/portals. The page reads its language from the address it
// was asked for, which stays as it is. Runs on the server, in the build and in
// the browser. See src/lib/i18n/routes.js.

import type { Reroute } from "@sveltejs/kit";
import { localeFromPath } from "$lib/i18n/locale";
import { canonicalPath } from "$lib/i18n/paths";

export const reroute: Reroute = ({ url }) => {
  if (localeFromPath(url.pathname) === "en") return;
  return canonicalPath(url.pathname);
};
