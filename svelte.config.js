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
		// All origins are allowed by default, except those that don't match the server's origin
		// Add additional trusted origins here if needed (e.g., for mobile apps)
		csrf: {
			checkOrigin: true
			// trustedOrigins can be configured here if you need to allow specific cross-origin requests
			// Example: trustedOrigins: ['https://mobile-app.ubumaths.com']
		}
	}
};

export default config;
