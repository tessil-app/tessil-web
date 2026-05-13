import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		// phosphor-icons-svelte declares only the "svelte" export condition.
		// Make sure both the dev-server resolver and pre-bundling honor it.
		conditions: ['svelte', 'browser', 'module', 'import', 'default']
	},
	optimizeDeps: {
		// Vite 8's rolldown-based dependency scanner resolves bare specifiers
		// before plugins run, and doesn't honor `resolve.conditions` for the
		// scan — so `phosphor-icons-svelte/IconFoo.svelte` fails with
		// "Package subpath is not defined by exports". Skipping discovery
		// hands resolution back to Vite's runtime resolver, which honors
		// conditions and resolves the icon files correctly.
		noDiscovery: true,
		include: []
	},
	server: {
		// Proxy /api/* to the local API in dev. In prod, the same-origin layout
		// is provided by the reverse proxy. Keeping `/api/*` relative in the
		// frontend lets cookies (notably __Host-session) sit on the visible
		// origin in both environments.
		proxy: {
			'/api': {
				target: API_TARGET,
				changeOrigin: true,
				cookieDomainRewrite: ''
			}
		}
	}
});
