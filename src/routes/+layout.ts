import { auth } from "$lib/stores/auth.svelte";

export const prerender = true;
export const ssr = false;

export const load = async () => {
	if (typeof window === "undefined") return {};
	if (!auth.loaded) {
		await auth.refresh();
	}
	return {};
};
