import { error } from "@sveltejs/kit";
import { FORMS_ANNOUNCED } from "$lib/config/launch";

// Real HTML at build time, like the other public pages, once it is announced.
export const ssr = true;
export const prerender = FORMS_ANNOUNCED;

// The page exists only once forms are announced.
export const load = () => {
  if (!FORMS_ANNOUNCED) error(404, "Not found");
};
