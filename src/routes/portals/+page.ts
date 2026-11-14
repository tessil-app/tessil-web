import { error } from "@sveltejs/kit";
import { PORTALS_ANNOUNCED } from "$lib/config/launch";

// Real HTML at build time, like the other public pages, once it is announced.
export const ssr = true;
export const prerender = PORTALS_ANNOUNCED;

// The page exists only once portals are announced.
export const load = () => {
  if (!PORTALS_ANNOUNCED) error(404, "Not found");
};
