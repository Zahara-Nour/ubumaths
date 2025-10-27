import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ runtime: 'nodejs22.x' }),
		// CSRF Protection - validates Origin/Referer headers for POST/PUT/DELETE/PATCH requests
		// Protection is enabled by default - requests from different origins are blocked
		// Add trusted origins here if you need to allow specific cross-origin requests
		csrf: {
			// trustedOrigins: ['https://mobile-app.ubumaths.com']
		}
	}
};

export default config;
