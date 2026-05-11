import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
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
