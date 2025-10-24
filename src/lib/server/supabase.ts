/**
 * Supabase Server Hook
 *
 * This hook runs on every server-side request and sets up:
 * 1. A Supabase client instance with cookie management
 * 2. A secure session verification method
 *
 * AUTHENTICATION FLOW:
 * - This is the entry point for all server-side authentication
 * - Creates a Supabase client that can read/write auth cookies
 * - Provides safeGetSession() which verifies user authenticity
 *
 * SECURITY CONSIDERATIONS:
 * - Cookies can be tampered with, so we never trust them blindly
 * - Always verify with Supabase's auth server using getUser()
 * - Only after verification do we use the session tokens
 */

import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('server/supabase.ts');

export const handle: Handle = async ({ event, resolve }) => {
	logger.trace('Creating server client for URL:', PUBLIC_SUPABASE_URL);

	/**
	 * Create a Supabase client for this request
	 *
	 * The client is configured to:
	 * - Read auth cookies from the request
	 * - Write auth cookies to the response
	 * - Manage session state across requests
	 */
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			// Read all cookies from the incoming request
			getAll: () => event.cookies.getAll(),
			// Write cookies to the response (e.g., after login/logout)
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * safeGetSession - Securely retrieve and verify the user session
	 *
	 * SECURITY PATTERN (recommended by Supabase):
	 * 1. Call getUser() to verify the user with Supabase's auth server
	 *    - This makes a network request to validate the session
	 *    - Prevents using tampered/fake sessions from cookies
	 * 2. Only if user is verified, get the session tokens
	 *    - The session contains access tokens needed for API calls
	 *    - Safe to use because we've verified authenticity first
	 *
	 * WHY THE WARNING APPEARS:
	 * Supabase shows a console warning when getSession() is called because
	 * it reads directly from cookies without server verification. However,
	 * this is SAFE in our case because:
	 * - We verify the user FIRST with getUser()
	 * - We only use the session AFTER verification
	 * - This follows Supabase's recommended security pattern
	 *
	 * PERFORMANCE OPTIMIZATION:
	 * - Added 5-second timeout to prevent hanging on slow Supabase connections
	 * - Falls back to no session if timeout is reached
	 *
	 * @returns {Object} { session, user } - Both verified and safe to use
	 */
	event.locals.safeGetSession = async () => {
		logger.trace('Checking and verifying session...');

		// Helper to add timeout to promises
		const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
			return Promise.race([
				promise,
				new Promise<T>((_, reject) =>
					setTimeout(() => reject(new Error('Supabase timeout')), timeoutMs)
				)
			]);
		};

		try {
			// STEP 1: Verify the user with Supabase's auth server (with 5s timeout)
			// This is the critical security step - never skip this!
			const {
				data: { user },
				error
			} = await withTimeout(event.locals.supabase.auth.getUser(), 5000);

			// If verification fails, return null (user not authenticated)
			if (error || !user) {
				logger.info('No valid session found');
				return { session: null, user: null };
			}

			logger.info('User verified:', user.email);

			// STEP 2: Get the session tokens (safe because user is verified, with 3s timeout)
			// The session contains access/refresh tokens needed for authenticated requests
			// Supabase will warn about this, but it's safe because we verified above
			const {
				data: { session }
			} = await withTimeout(event.locals.supabase.auth.getSession(), 3000);

			return { session, user };
		} catch (error) {
			// Timeout or other error - log and return no session
			logger.error('Error in safeGetSession:', error);
			return { session: null, user: null };
		}
	};

	// Continue with the request, ensuring Supabase headers are preserved
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// These headers are needed for Supabase to work correctly
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
