import { error } from "@sveltejs/kit";
import { ACCESS_KEYS_ANNOUNCED } from "$lib/config/launch";

// Real HTML at build time, like the other public pages, once it is announced.
export const ssr = true;
export const prerender = ACCESS_KEYS_ANNOUNCED;

// The page exists only once the tool is announced.
export const load = () => {
  if (!ACCESS_KEYS_ANNOUNCED) error(404, "Not found");
};
