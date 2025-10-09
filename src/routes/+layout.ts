/**
 * Root Layout Client Load Function
 *
 * AUTHENTICATION FLOW - Step 3 (Client-Side Setup):
 * This runs in the browser AND during SSR, setting up the Supabase client
 * and handling real-time auth state changes.
 *
 * ARCHITECTURE:
 * SvelteKit runs both +layout.server.ts and +layout.ts:
 * - +layout.server.ts: Runs ONLY on server, verifies auth, returns data
 * - +layout.ts: Runs on server during SSR, then in browser for hydration
 *
 * FLOW:
 * 1. Receives verified session/user data from +layout.server.ts
 * 2. Creates a Supabase client (browser or server based on environment)
 * 3. Sets up auth state change listener (browser only)
 * 4. Returns session, user, and supabase client to components
 *
 * REACTIVITY & REAL-TIME UPDATES:
 * - depends('supabase:auth') tells SvelteKit to reload when this invalidates
 * - onAuthStateChange() detects login/logout events
 * - invalidate('supabase:auth') triggers a fresh server-side verification
 * - This creates a reactive loop: auth change → invalidate → server verify → UI update
 *
 * SECURITY:
 * - We use verified data from server (data.session, data.user)
 * - We DON'T use session from onAuthStateChange (it's unverified)
 * - Instead, we trigger server-side re-verification via invalidate()
 */

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { invalidate } from '$app/navigation';
import type { LayoutLoad } from './$types';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('+layout.ts');

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	// Register this load function to re-run when 'supabase:auth' is invalidated
	// This enables reactive auth state updates throughout the app
	depends('supabase:auth');

	logger.info('Loading, isBrowser:', isBrowser());

	/**
	 * Create a Supabase client appropriate for the environment
	 *
	 * BROWSER:
	 * - Uses createBrowserClient which manages auth state in localStorage
	 * - Automatically handles token refresh and session management
	 *
	 * SERVER (during SSR):
	 * - Uses createServerClient which reads from cookies
	 * - Cookies are passed from +layout.server.ts
	 * - Read-only during SSR (can't write cookies from here)
	 */
	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					fetch // Use SvelteKit's fetch for better performance
				}
			})
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					fetch
				},
				cookies: {
					// Read cookies from server data
					getAll() {
						return data.cookies;
					}
					// Note: We can't write cookies here during SSR
					// Cookie writes happen in the server hook
				}
			});

	logger.trace('Supabase client created');

	// Use the verified session and user from the server
	// The server already verified these with getUser() - safe to trust
	logger.info('Session from server:', data.session ? `User: ${data.session.user.email}` : 'No session');
	logger.info('User from server:', data.user ? data.user.email : 'No user');

	/**
	 * Set up auth state change listener (browser only)
	 *
	 * This listens for authentication events like:
	 * - SIGNED_IN: User just logged in
	 * - SIGNED_OUT: User just logged out
	 * - TOKEN_REFRESHED: Session was refreshed automatically
	 *
	 * IMPORTANT: We DON'T use the session from this callback!
	 * Why? It's unverified (comes from localStorage/cookies).
	 *
	 * Instead, we:
	 * 1. Detect that auth state changed
	 * 2. Invalidate 'supabase:auth' to trigger re-running this load function
	 * 3. The load function runs again, which calls +layout.server.ts
	 * 4. +layout.server.ts verifies the new session with getUser()
	 * 5. Verified data flows back to this function and to all components
	 *
	 * This ensures all auth data in the app is always verified by the server.
	 */
	if (isBrowser()) {
		supabase.auth.onAuthStateChange((event, session) => {
			logger.info('Auth state changed:', event, session ? 'has session' : 'no session');

			// On these events, reload verified data from server
			if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
				logger.info('Invalidating supabase:auth');
				// This triggers the reactive chain:
				// invalidate → depends() → re-run this load → +layout.server.ts → verified data
				invalidate('supabase:auth');
			}
		});
	}

	// Return verified data and Supabase client to all components
	return {
		// Verified session from server (safe to use)
		session: data.session,
		// Supabase client for making authenticated requests
		supabase,
		// Verified user from server (safe to use)
		user: data.user
	};
};
