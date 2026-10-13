import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

/**
 * CSRF Protection Handle
 * Validates origin header for all state-changing requests (POST, PUT, DELETE, PATCH)
 *
 * SECURITY: Prevents Cross-Site Request Forgery attacks
 * - Checks origin header matches host header
 * - Only enforced for state-changing methods
 * - Critical for API endpoints and form submissions
 */
export const csrfHandle: Handle = async ({ event, resolve }) => {
	// Allow safe methods (read-only)
	const method = event.request.method;
	if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		return resolve(event);
	}

	// For state-changing methods, validate origin
	const origin = event.request.headers.get('origin');
	const host = event.request.headers.get('host');

	// Missing headers - check if internal server-to-server call
	if (!origin || !host) {
		// Internal fetch calls from server actions/load functions don't have origin/host headers
		// These are safe as they don't come from a browser (no CSRF risk)
		// Allow if BOTH are missing (indicates internal SvelteKit fetch)
		if (!origin && !host) {
			return resolve(event);
		}

		// In development, allow localhost without origin (for testing tools)
		if (dev && host?.includes('localhost')) {
			return resolve(event);
		}

		throw error(403, {
			message: 'Requête refusée : origine ou hôte absent'
		});
	}

	// L'analyse de l'URL seule dans le `try` : un refus levé dedans serait rattrapé
	// et ressortirait en « origine illisible » (écart C7).
	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		throw error(403, {
			message: 'Requête refusée : origine illisible'
		});
	}
	if (originHost !== host) {
		throw error(403, {
			message: 'Requête refusée : origine différente du site'
		});
	}

	return resolve(event);
};
