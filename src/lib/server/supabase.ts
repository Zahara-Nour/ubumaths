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
	 * safeGetSession - Securely retrieve and verify the user
	 *
	 * SECURITY PATTERN (recommended by Supabase):
	 * - Call getUser() to verify the user with Supabase's auth server
	 * - This makes a network request to validate the session
	 * - Prevents using tampered/fake sessions from cookies
	 * - Returns only the verified user object
	 *
	 * WHY WE DON'T CALL getSession():
	 * - getSession() reads directly from cookies and shows security warnings
	 * - The session tokens are managed automatically by the Supabase client via cookies
	 * - We only need the verified user object for authorization checks
	 * - The client-side Supabase client handles session management automatically
	 *
	 * PERFORMANCE OPTIMIZATION:
	 * - Added 15-second timeout to prevent hanging on slow Supabase connections
	 * - Falls back to no user if timeout is reached
	 *
	 * @returns {Object} { user } - Verified user object (or null if not authenticated)
	 */
	event.locals.safeGetSession = async () => {
		logger.trace('Verifying user with Supabase auth server...');

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
			// Verify the user with Supabase's auth server (with 15s timeout)
			// This is the ONLY security check needed - never skip this!
			const {
				data: { user },
				error
			} = await withTimeout(event.locals.supabase.auth.getUser(), 15000);

			// If verification fails, return null (user not authenticated)
			if (error || !user) {
				// No logging needed - unauthenticated state is normal and expected
				return { user: null };
			}

			// User verified successfully (no need to log on every request)
			return { user };
		} catch (error) {
			// Timeout or other error - log and return no user
			logger.error('Error in safeGetSession:', error);
			return { user: null };
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
