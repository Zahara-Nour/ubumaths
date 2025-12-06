import { handle as supabaseHandle } from '$lib/server/supabase';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { logError, getUserContext } from '$lib/server/errorMonitoring';
import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import { initEnv } from '$lib/server/env';
import { getUserProfile } from '$lib/server/auth';

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
 * URL Redirect Handle
 * Handles deprecated route redirects to maintain backwards compatibility
 * Currently redirects /edit pages to their parent pages
 */
const redirectHandle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Redirect deprecated /edit pages to parent worksheet page (307 temporary redirect)
	// Pattern: /dashboard/teacher/worksheets/[uuid]/edit -> /dashboard/teacher/worksheets/[uuid]
	if (pathname.match(/^\/dashboard\/teacher\/worksheets\/[a-f0-9-]+\/edit$/)) {
		const worksheetId = pathname.split('/')[5];
		throw redirect(307, `/dashboard/teacher/worksheets/${worksheetId}`);
	}

	return resolve(event);
};

/**
 * User & Profile Loading Handle
 * Loads authenticated user and their profile into locals for all routes
 *
 * PERFORMANCE:
 * - Runs after Supabase handle (requires locals.safeGetSession)
 * - Only fetches profile if user is authenticated
 * - Makes user and profile available to all layouts without parent() calls
 *
 * USAGE IN LAYOUTS:
 * - Access via locals.user and locals.profile instead of await parent()
 */
const userProfileHandle: Handle = async ({ event, resolve }) => {
	// Get user from Supabase session
	const { user } = await event.locals.safeGetSession();
	event.locals.user = user;

	// Fetch profile for authenticated users
	if (user) {
		event.locals.profile = await getUserProfile(event.locals.supabase, user.id);
	} else {
		event.locals.profile = null;
	}

	return resolve(event);
};

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

/**
 * Security Headers Handle
 * Sets Content-Security-Policy and other security headers
 *
 * CSP protects against:
 * - XSS attacks (script injection)
 * - Data exfiltration via unauthorized scripts
 * - Clickjacking (frame-ancestors)
 *
 * External resources allowed:
 * - Supabase: *.supabase.co (backend, auth, realtime)
 * - Google Fonts: fonts.googleapis.com, fonts.gstatic.com
 * - CDNs: cdn.jsdelivr.net (Pyodide, Typst), cdn.plot.ly (Plotly), unpkg.com (Swagger)
 * - Google APIs: googleapis.com (OAuth, Classroom API)
 */
const securityHeadersHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Build CSP directives
	const cspDirectives = [
		// Default: only self
		"default-src 'self'",

		// Scripts: self + CDNs + inline (required for Svelte/Vite)
		// 'wasm-unsafe-eval' for Pyodide and Typst WebAssembly
		[
			"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
			'https://cdn.jsdelivr.net',
			'https://cdn.plot.ly',
			'https://unpkg.com'
		].join(' '),

		// Styles: self + inline (Tailwind) + Google Fonts
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

		// Fonts: self + Google Fonts
		"font-src 'self' https://fonts.gstatic.com",

		// Images: self + data URIs (base64 matplotlib plots) + blob + Supabase storage + Google profile pics + Blockly media
		"img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://unpkg.com",

		// Connect: API calls + WebSocket for realtime
		[
			"connect-src 'self'",
			'https://*.supabase.co',
			'wss://*.supabase.co',
			'https://cdn.jsdelivr.net',
			'https://cdn.plot.ly',
			'https://*.googleapis.com'
		].join(' '),

		// Workers: for Pyodide Web Worker
		"worker-src 'self' blob:",

		// Child/Frame: Supabase auth popups
		"frame-src 'self' https://*.supabase.co",

		// Frame ancestors: prevent clickjacking (allow only self)
		"frame-ancestors 'self'",

		// Base URI: restrict <base> tag
		"base-uri 'self'",

		// Form actions: only submit to same origin + Supabase auth
		"form-action 'self' https://*.supabase.co",

		// Object/Embed: disable plugins
		"object-src 'none'"
	];

	// Join directives with semicolons
	const csp = cspDirectives.join('; ');

	// Set security headers
	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

	// X-Frame-Options (legacy, complementary to frame-ancestors)
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');

	// HSTS only in production (HTTPS required)
	if (!dev) {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}

	return response;
};

// Combine hooks in sequence: Supabase first, then redirects, then user/profile, then CSRF protection, then security headers, then error monitoring
// Order matters: Supabase auth -> Redirects -> User/Profile loading -> CSRF validation -> Security Headers -> Error monitoring
export const handle: Handle = sequence(
	supabaseHandle,
	redirectHandle,
	userProfileHandle,
	csrfHandle,
	securityHeadersHandle,
	errorMonitoringHandle
);
