/**
 * Client-Side Hooks
 *
 * This file runs in the browser and sets up client-side initialization,
 * including error monitoring, Web Vitals collection, and freeze detection.
 *
 * IMPORTANT: handleError captures errors from SvelteKit's internal error boundary
 * (component rendering, $effect, load functions) that window.onerror does NOT catch.
 */

import { browser } from '$app/env';
import { initErrorMonitoring, initWebVitals } from '#lib/utils/errorMonitoring.ts';
import { initFreezeDetection } from '#lib/utils/freezeDetection.ts';
import { installFormulaSpeech } from '#lib/utils/formula-speech/install.ts';
import type { HandleClientError } from '@sveltejs/kit/hooks';

// Initialize all client-side monitoring when browser is ready
if (browser) {
	// Error monitoring and Web Vitals
	initErrorMonitoring();
	initWebVitals();

	// Freeze detection (Long Task Observer + Heartbeat)
	initFreezeDetection();

	// Lecteurs d'écran : formules lues en français, sans balises (E32)
	installFormulaSpeech();

	console.log('[Hooks Client] Error monitoring, Web Vitals, and freeze detection initialized');
}

// Serveur de dev seulement : garder les erreurs de console pour le bouton « signaler »
// (`import.meta.env.DEV` vaut `false` au build, qui n'embarque pas ce module)
if (browser && import.meta.env.DEV) {
	import('#lib/dev/feedback-collector.ts')
		.then((module) => module.startCollectingErrors())
		.catch((e) => console.debug('[Signaler] Collecte des erreurs impossible :', e));
}

/**
 * SvelteKit client-side error handler
 *
 * Catches errors from:
 * - Component rendering failures
 * - $effect() exceptions
 * - Client-side load function failures
 * - Hydration mismatches
 *
 * These errors are NOT caught by window.onerror because SvelteKit
 * intercepts them internally before they reach the global handler.
 *
 * SvelteKit 3 passe ici TOUTES les erreurs, distinguées par `kind` :
 * - `app` : une erreur voulue (`error(403, …)`) — pas une panne, rien n'est
 *   journalisé, le message reste celui de l'appel ;
 * - `framework` : une erreur de SvelteKit, surtout la 404 d'un lien interne cassé,
 *   journalisée en avertissement ;
 * - `unknown` : une exception — journalisée en erreur ; le détail technique part
 *   dans `detail`, que la page d'erreur replie sous « Détails techniques », et le
 *   message reste celui de SvelteKit (« Internal Error »).
 * Ne rien rendre garde le statut et le message par défaut.
 */
export const handleError: HandleClientError = async ({ kind, error, event }) => {
	if (kind === 'app') return;

	const notFound = kind === 'framework' && error.status === 404;
	const err =
		kind === 'unknown'
			? error instanceof Error
				? error
				: new Error(String(error))
			: new Error(error.message);
	const status = kind === 'framework' ? error.status : 500;

	console.error('[SvelteKit Client Error]', {
		kind,
		status,
		error: err.message,
		stack: err.stack,
		url: event.url.href
	});

	// Send to error logging API (fire-and-forget)
	try {
		const browserInfo = browser
			? {
					user_agent: navigator.userAgent,
					viewport_width: window.innerWidth,
					viewport_height: window.innerHeight
				}
			: {};

		await fetch('/api/errors/log', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				error_type: 'client_js',
				severity: notFound ? 'warning' : 'error',
				message: notFound
					? `[SvelteKit handleError] Page introuvable : ${event.url.pathname}`
					: `[SvelteKit handleError] ${kind}: ${err.message}`,
				url: event.url.href,
				stack_trace: err.stack,
				error_name: err.name,
				...browserInfo,
				context: {
					sveltekit_status: status,
					sveltekit_kind: kind,
					source: 'handleError_client'
				}
			})
		});
	} catch {
		// Ignore logging failures
	}

	if (kind !== 'unknown') return;
	return {
		detail: `${err.message} | ${err.stack?.split('\n').slice(0, 3).join(' | ') || 'no stack'}`
	};
};
