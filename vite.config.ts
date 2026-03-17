import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('/node_modules/heic2any/')) return 'heic-converter';
					if (id.includes('/node_modules/jszip/')) return 'zip-export';
				}
			}
		}
	}
});
