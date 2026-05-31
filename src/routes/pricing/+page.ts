import { redirect } from "@sveltejs/kit";

// Pro / pricing is disabled for v1 (Free-only launch — see launch strategy).
// The page component is kept in git for v1.5; this redirect makes the route
// inert in the meantime so any old links land on home.
export const load = () => {
  redirect(307, "/");
};
