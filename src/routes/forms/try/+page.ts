import { error } from "@sveltejs/kit";
import { FORMS_ANNOUNCED } from "$lib/config/launch";

export const prerender = false;

export const load = () => {
  if (!FORMS_ANNOUNCED) error(404, "Not found");
};
