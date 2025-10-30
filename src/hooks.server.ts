import { handle as supabaseHandle } from '$lib/server/supabase';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { logError, getUserContext } from '$lib/server/errorMonitoring';
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { initEnv } from '$lib/server/env';

// ====================================================================
// Environment Variable Validation
// Validate on application startup - fails fast if config is invalid
// ====================================================================
try {
	initEnv();
} catch (err) {
	const errorMessage = err instanceof Error ? err.message : String(err);
	console.error('Failed to initialize environment:', errorMessage);
	// Application won't start with invalid env vars in production
	// In development, validation errors are logged but execution continues
}

/**
 * CSRF Protection Handle
 * Validates origin header for all state-changing requests (POST, PUT, DELETE, PATCH)
 *
 * SECURITY: Prevents Cross-Site Request Forgery attacks
 * - Checks origin header matches host header
 * - Only enforced for state-changing methods
 * - Critical for API endpoints and form submissions
 */
const csrfHandle: Handle = async ({ event, resolve }) => {
	// Allow safe methods (read-only)
	const method = event.request.method;
	if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		return resolve(event);
	}

	// For state-changing methods, validate origin
	const origin = event.request.headers.get('origin');
	const host = event.request.headers.get('host');

	// Missing headers - reject request
	if (!origin || !host) {
		// In development, allow localhost without origin (for testing tools)
		if (dev && host?.includes('localhost')) {
			return resolve(event);
		}

		throw error(403, {
			message: 'CSRF validation failed: Missing origin or host header'
		});
	}

	// Validate origin matches host
	try {
		const originUrl = new URL(origin);
		if (originUrl.host !== host) {
			throw error(403, {
				message: 'CSRF validation failed: Origin mismatch'
			});
		}
	} catch (_err) {
		// Invalid origin URL
		throw error(403, {
			message: 'CSRF validation failed: Invalid origin header'
		});
	}

	return resolve(event);
};

/**
 * Error monitoring handle
 * Captures unhandled server errors and slow requests
 */
const errorMonitoringHandle: Handle = async ({ event, resolve }) => {
	const startTime = Date.now();

	try {
		// Resolve the request
		const response = await resolve(event);

		// Track response time for performance monitoring
		const responseTime = Date.now() - startTime;

		// Skip logging for static assets and favicon to prevent cascade
		const isStaticAsset =
			event.url.pathname.startsWith('/_app/') ||
			event.url.pathname === '/favicon.ico' ||
			event.url.pathname.endsWith('.png') ||
			event.url.pathname.endsWith('.jpg') ||
			event.url.pathname.endsWith('.svg');

		// Log slow requests (> 3 seconds) - but non-blocking
		if (responseTime > 3000 && !isStaticAsset) {
			// Fire-and-forget to prevent blocking the response
			// Use Promise without awaiting to avoid slowing down the response
			Promise.resolve().then(async () => {
				try {
					// Add timeout to prevent getUserContext from hanging
					const getUserContextWithTimeout = async (
						supabase: typeof event.locals.supabase,
						userId: string
					) => {
						const timeoutPromise = new Promise<Record<string, never>>((_, reject) =>
							setTimeout(() => reject(new Error('Timeout')), 2000)
						);
						const contextPromise = getUserContext(supabase, userId);
						return Promise.race([contextPromise, timeoutPromise]).catch(() => ({}));
					};

					const { user } = await event.locals.safeGetSession();
					const userContext = user?.id
						? await getUserContextWithTimeout(event.locals.supabase, user.id)
						: {};

					await logError(event.locals.supabase, {
						error_type: 'performance',
						severity: responseTime > 10000 ? 'error' : 'warning',
						message: `Slow request: ${responseTime}ms`,
						url: event.url.pathname,
						request_method: event.request.method,
						response_time: responseTime,
						status_code: response.status,
						...(userContext as Record<string, unknown>),
						tags: ['slow_request']
					});
				} catch (error) {
					// Silently fail - don't let logging errors break the app
					if (dev) {
						console.error('Error logging slow request:', error);
					}
				}
			});
		}

		return response;
	} catch (error) {
		// Capture the error
		const errorMessage = error instanceof Error ? error.message : String(error);
		const stackTrace = error instanceof Error ? error.stack : undefined;

		// Get user context if available
		const { user } = await event.locals.safeGetSession();
		const userContext = user?.id ? await getUserContext(event.locals.supabase, user.id) : {};

		// Determine error type based on route
		const errorType = event.url.pathname.startsWith('/api/')
			? 'server_api'
			: event.url.pathname.includes('+page.server.ts')
				? 'server_load'
				: event.url.pathname.includes('+server.ts')
					? 'server_action'
					: 'server_api';

		// Log the error
		await logError(event.locals.supabase, {
			error_type: errorType,
			severity: 'error',
			message: errorMessage,
			url: event.url.pathname,
			stack_trace: stackTrace,
			request_method: event.request.method,
			response_time: Date.now() - startTime,
			...userContext,
			context: {
				search_params: Object.fromEntries(event.url.searchParams)
			}
		});

		// Log to console in development
		if (dev) {
			console.error('[Server Error]', {
				url: event.url.pathname,
				method: event.request.method,
				error: errorMessage
			});
		}

		// Re-throw to allow SvelteKit's error handling
		throw error;
	}
};

// Combine hooks in sequence: Supabase first, then CSRF protection, then error monitoring
// Order matters: Supabase auth -> CSRF validation -> Error monitoring
export const handle: Handle = sequence(supabaseHandle, csrfHandle, errorMonitoringHandle);
