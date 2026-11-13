import { error } from "@sveltejs/kit";
import { PORTALS_ANNOUNCED } from "$lib/config/launch";

// The page exists only once portals are announced.
export const load = () => {
  if (!PORTALS_ANNOUNCED) error(404, "Not found");
};
