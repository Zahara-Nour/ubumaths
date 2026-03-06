/**
 * Client-Side Hooks
 *
 * This file runs in the browser and sets up client-side initialization,
 * including error monitoring, Web Vitals collection, and freeze detection.
 *
 * IMPORTANT: handleError captures errors from SvelteKit's internal error boundary
 * (component rendering, $effect, load functions) that window.onerror does NOT catch.
 */

import { browser } from '$app/environment';
import { initErrorMonitoring, initWebVitals } from '$lib/utils/errorMonitoring';
import { initFreezeDetection } from '$lib/utils/freezeDetection';
import type { HandleClientError } from '@sveltejs/kit';

// Initialize all client-side monitoring when browser is ready
if (browser) {
	// Error monitoring and Web Vitals
	initErrorMonitoring();
	initWebVitals();

	// Freeze detection (Long Task Observer + Heartbeat)
	initFreezeDetection();

	console.log('[Hooks Client] Error monitoring, Web Vitals, and freeze detection initialized');
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
 */
export const handleError: HandleClientError = async ({ error, event, status, message }) => {
	const err = error instanceof Error ? error : new Error(String(error));

	console.error('[SvelteKit Client Error]', {
		status,
		message,
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
				severity: 'error',
				message: `[SvelteKit handleError] ${message}: ${err.message}`,
				url: event.url.href,
				stack_trace: err.stack,
				error_name: err.name,
				...browserInfo,
				context: {
					sveltekit_status: status,
					sveltekit_message: message,
					source: 'handleError_client'
				}
			})
		});
	} catch {
		// Ignore logging failures
	}

	return {
		message: `Erreur: ${err.message} | ${err.stack?.split('\n').slice(0, 3).join(' | ') || 'no stack'}`
	};
};
