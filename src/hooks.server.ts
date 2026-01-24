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
 * Request ID Handle
 * Generates a unique short request ID for tracing requests through logs
 *
 * The request ID is:
 * - 8 characters (first 8 chars of UUID)
 * - Attached to locals for server-side access
 * - Added to X-Request-ID response header for client correlation
 *
 * Use case: When debugging errors, search logs by requestId to see
 * all related log entries for a single request.
 */
const requestIdHandle: Handle = async ({ event, resolve }) => {
	// Generate short request ID (first 8 chars of UUID)
	const requestId = crypto.randomUUID().slice(0, 8);
	event.locals.requestId = requestId;

	const response = await resolve(event);

	// Add request ID to response headers for client correlation
	response.headers.set('X-Request-ID', requestId);

	return response;
};

/**
 * URL Redirect Handle
 * Handles deprecated route redirects to maintain backwards compatibility
 * Includes navigation restructure redirects (2026-01)
 */
const redirectHandle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// === NAVIGATION RESTRUCTURE REDIRECTS (308 Permanent) ===
	// Note: We access event.url.search only when performing actual redirects
	// to avoid "Cannot access url.search on a page with prerendering enabled" errors

	// Contenu group redirects
	if (pathname.startsWith('/dashboard/teacher/templates')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/templates',
			'/dashboard/teacher/contenu/templates'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/exercises')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/exercises',
			'/dashboard/teacher/contenu/exercices'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/riddles')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/riddles',
			'/dashboard/teacher/contenu/enigmes'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/worksheets')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/worksheets',
			'/dashboard/teacher/contenu/worksheets'
		);
		throw redirect(308, newPath + event.url.search);
	}

	// Gamification group redirects
	if (pathname.startsWith('/dashboard/teacher/rewards')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/rewards',
			'/dashboard/teacher/gamification/rewards'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/vip-cards')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/vip-cards',
			'/dashboard/teacher/gamification/vip-cards'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/marketplace')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/marketplace',
			'/dashboard/teacher/gamification/marketplace'
		);
		throw redirect(308, newPath + event.url.search);
	}

	// Moderation group redirects
	if (pathname.startsWith('/dashboard/teacher/warnings')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/warnings',
			'/dashboard/teacher/moderation/avertissements'
		);
		throw redirect(308, newPath + event.url.search);
	}

	// Google Classroom redirect to existing settings/google page
	if (pathname === '/dashboard/teacher/google') {
		throw redirect(308, '/dashboard/teacher/settings/google' + event.url.search);
	}

	// Students redirect (now accessed via Classes)
	if (pathname === '/dashboard/students') {
		throw redirect(308, '/dashboard/teacher/classes');
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
		try {
			event.locals.profile = await getUserProfile(event.locals.supabase, user.id);

			// If profile fetch succeeded but returned null (profile doesn't exist)
			// Sign out and redirect - this prevents "Unexpected token '<'" errors
			// during client-side navigation when pages try to redirect with HTML response
			if (!event.locals.profile) {
				console.error(
					'[userProfileHandle] Profile not found for authenticated user:',
					user.id,
					user.email
				);

				// Log to error_logs table for admin visibility
				try {
					await logError(event.locals.supabase, {
						error_type: 'server_load',
						severity: 'error',
						message: `[profile_not_found] Profile not found for authenticated user`,
						url: event.url.pathname,
						user_agent: event.request.headers.get('user-agent') ?? undefined,
						user_id: user.id,
						context: {
							user_email: user.email,
							request_id: event.locals.requestId || 'unknown'
						}
					});
				} catch (logErr) {
					console.error('[userProfileHandle] Failed to log error:', logErr);
				}

				// Sign out and redirect to login
				await event.locals.supabase.auth.signOut();
				throw redirect(303, '/auth/login?error=' + encodeURIComponent('Profil non trouvé'));
			}
		} catch (err) {
			// Re-throw redirects (from the profile null check above)
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}

			// Log the error
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error('[userProfileHandle] Failed to fetch profile for user:', user.id, errorMessage);

			// Log to error_logs table for admin visibility
			try {
				await logError(event.locals.supabase, {
					error_type: 'server_load',
					severity: 'error',
					message: `[profile_fetch_error] Failed to fetch profile: ${errorMessage}`,
					url: event.url.pathname,
					user_agent: event.request.headers.get('user-agent') ?? undefined,
					user_id: user.id,
					stack_trace: err instanceof Error ? err.stack : undefined,
					context: {
						user_email: user.email,
						request_id: event.locals.requestId || 'unknown'
					}
				});
			} catch (logErr) {
				console.error('[userProfileHandle] Failed to log error:', logErr);
			}

			// Sign out and redirect to login - this prevents "Unexpected token '<'" errors
			// during client-side navigation when downstream pages would redirect with HTML
			await event.locals.supabase.auth.signOut();
			throw redirect(
				303,
				'/auth/login?error=' + encodeURIComponent('Erreur de chargement du profil')
			);
		}
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
						context: { request_id: event.locals.requestId || 'unknown' },
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
				search_params: Object.fromEntries(event.url.searchParams),
				request_id: event.locals.requestId || 'unknown'
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
		// 'unsafe-eval' required for Typst.js compiler (uses new Function() internally)
		[
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
			'https://cdn.jsdelivr.net',
			'https://cdn.plot.ly',
			'https://unpkg.com',
			'https://va.vercel-scripts.com'
		].join(' '),

		// Styles: self + inline (Tailwind) + Google Fonts
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

		// Fonts: self + Google Fonts
		"font-src 'self' https://fonts.gstatic.com",

		// Images: self + data URIs (base64 matplotlib plots) + blob + Supabase storage + Google profile pics + Blockly media + Picsum (test) + YouTube thumbnails + Unsplash (demo) + Giphy (demo)
		"img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://unpkg.com https://picsum.photos https://fastly.picsum.photos https://i.ytimg.com https://images.unsplash.com https://i.giphy.com",

		// Connect: API calls + WebSocket for realtime + Typst packages
		[
			"connect-src 'self'",
			'https://*.supabase.co',
			'wss://*.supabase.co',
			'https://cdn.jsdelivr.net',
			'https://cdn.plot.ly',
			'https://*.googleapis.com',
			'https://packages.typst.org',
			'https://va.vercel-scripts.com',
			'https://vitals.vercel-insights.com'
		].join(' '),

		// Workers: for Pyodide Web Worker
		"worker-src 'self' blob:",

		// Media: video/audio sources
		"media-src 'self' blob: data: https:",

		// Child/Frame: Supabase auth popups + YouTube embeds + Wikipedia (demo)
		"frame-src 'self' https://*.supabase.co https://www.youtube.com https://www.youtube-nocookie.com https://en.wikipedia.org",

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

// Combine hooks in sequence: Request ID first (for tracing), then Supabase, then others
// Order matters: Request ID -> Supabase auth -> Redirects -> User/Profile loading -> CSRF validation -> Security Headers -> Error monitoring
export const handle: Handle = sequence(
	requestIdHandle,
	supabaseHandle,
	redirectHandle,
	userProfileHandle,
	csrfHandle,
	securityHeadersHandle,
	errorMonitoringHandle
);
