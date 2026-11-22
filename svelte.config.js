import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { LOCALIZED_ENTRIES } from './src/lib/i18n/routes.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// The SPA fallback must NOT be index.html: the homepage prerenders to
		// index.html, and the adapter would overwrite it with the empty shell.
		// nginx serves this as the last try_files candidate.
		adapter: adapter({
			fallback: '200.html'
		}),

		// Pages in other languages are listed so the build renders them even
		// where no link on an English page points to them yet.
		prerender: {
			entries: ['*', ...LOCALIZED_ENTRIES]
		},

		// Script policy only; every other directive is the nginx header
		// (tessil-api/infra/nginx/snippets/security-headers.conf). `hash` pins
		// SvelteKit's inline bootstrap, whose hash changes per build, so
		// 'unsafe-inline' is ignored and injected inline scripts cannot run.
		// wasm-unsafe-eval is for hash-wasm (Argon2id) at vault unlock.
		csp: {
			mode: 'hash',
			directives: {
				'script-src': ['self', 'wasm-unsafe-eval']
			}
		}
	}
};

export default config;
