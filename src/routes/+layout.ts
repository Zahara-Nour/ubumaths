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

const logger = createLogger('+layout.ts', 'error');

// =============================================================================
// AUTH STATE THROTTLING
// =============================================================================
// Prevents unnecessary layout reloads when switching virtual screens/tabs.
// Uses sessionStorage to persist state across Vite HMR reloads (dev) and page refreshes.

let authListenerInitialized = false;

const STORAGE_KEY_USER_ID = 'ubumaths_auth_user_id';
const STORAGE_KEY_LAST_REFRESH = 'ubumaths_auth_last_refresh';
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get persisted user ID (survives Vite HMR)
 */
function getPersistedUserId(): string | null {
	if (typeof sessionStorage === 'undefined') return null;
	return sessionStorage.getItem(STORAGE_KEY_USER_ID);
}

/**
 * Set persisted user ID
 */
function setPersistedUserId(userId: string | null): void {
	if (typeof sessionStorage === 'undefined') return;
	if (userId) {
		sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
	} else {
		sessionStorage.removeItem(STORAGE_KEY_USER_ID);
	}
}

/**
 * Get last refresh timestamp (survives Vite HMR)
 */
function getLastRefresh(): number {
	if (typeof sessionStorage === 'undefined') return 0;
	const stored = sessionStorage.getItem(STORAGE_KEY_LAST_REFRESH);
	return stored ? parseInt(stored, 10) : 0;
}

/**
 * Set last refresh timestamp
 */
function setLastRefresh(timestamp: number): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(STORAGE_KEY_LAST_REFRESH, timestamp.toString());
}

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	// Register this load function to re-run when 'supabase:auth' is invalidated
	// This enables reactive auth state updates throughout the app
	depends('supabase:auth');
	console.log('🎨 [ROOT LAYOUT] Exécution');

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

	// Use the verified user from the server
	// The server already verified this with getUser() - safe to trust
	logger.info('User from server:', data.user ? `User: ${data.user.email}` : 'No user');

	/**
	 * Set up auth state change listener (browser only)
	 *
	 * This listens for authentication events like:
	 * - SIGNED_IN: User just logged in
	 * - SIGNED_OUT: User just logged out
	 * - TOKEN_REFRESHED: Session was refreshed automatically
	 *
	 * IMPORTANT: We DON'T use the session/user from this callback!
	 * Why? It's unverified (comes from localStorage/cookies).
	 *
	 * Instead, we:
	 * 1. Detect that auth state changed
	 * 2. Invalidate 'supabase:auth' to trigger re-running this load function
	 * 3. The load function runs again, which calls +layout.server.ts
	 * 4. +layout.server.ts verifies the user with getUser()
	 * 5. Verified data flows back to this function and to all components
	 *
	 * This ensures all auth data in the app is always verified by the server.
	 *
	 * OPTIMIZATION: TOKEN_REFRESHED events are throttled to avoid unnecessary
	 * reloads when switching virtual screens or tabs. A full refresh only occurs
	 * if more than 30 minutes have passed since the last one.
	 */
	if (isBrowser() && !authListenerInitialized) {
		// Only set up listener once (persists across load function executions)
		authListenerInitialized = true;

		// Initialize persisted state if not already set
		if (!getPersistedUserId() && data.user?.id) {
			setPersistedUserId(data.user.id);
		}
		if (!getLastRefresh()) {
			setLastRefresh(Date.now());
		}

		supabase.auth.onAuthStateChange((event, session) => {
			// Always log the event for debugging
			console.log(`🔐 [AUTH] Event: ${event}`);

			// Handle SIGNED_OUT - always reload
			if (event === 'SIGNED_OUT') {
				console.log('🔐 [AUTH] Invalidating (signed out)');
				setPersistedUserId(null);
				invalidate('supabase:auth');
				setLastRefresh(Date.now());
				return;
			}

			// Handle SIGNED_IN - only reload if user changed (not just Vite HMR)
			if (event === 'SIGNED_IN') {
				const newUserId = session?.user?.id ?? null;
				const currentUserId = getPersistedUserId();

				if (newUserId && newUserId === currentUserId) {
					// Same user - this is likely Vite HMR or tab refocus, skip reload
					console.log('🔐 [AUTH] Skipping invalidation (same user already signed in)');
					return;
				}
				// Different user or first sign-in - reload
				console.log('🔐 [AUTH] Invalidating (new user signed in)');
				setPersistedUserId(newUserId);
				invalidate('supabase:auth');
				setLastRefresh(Date.now());
				return;
			}

			// Throttle TOKEN_REFRESHED: only reload if > 30 min since last refresh
			// This avoids unnecessary reloads when switching virtual screens/tabs
			if (event === 'TOKEN_REFRESHED') {
				const lastRefresh = getLastRefresh();
				const timeSinceLastRefresh = Date.now() - lastRefresh;
				if (timeSinceLastRefresh > REFRESH_INTERVAL_MS) {
					console.log(
						`🔐 [AUTH] Invalidating (token refresh after ${Math.round(timeSinceLastRefresh / 60000)} min)`
					);
					invalidate('supabase:auth');
					setLastRefresh(Date.now());
				} else {
					console.log(
						`🔐 [AUTH] Skipping invalidation (only ${Math.round(timeSinceLastRefresh / 60000)} min since last refresh)`
					);
				}
				return;
			}

			// INITIAL_SESSION is emitted on first load - no action needed
			if (event === 'INITIAL_SESSION') {
				console.log('🔐 [AUTH] Initial session detected (no action needed)');
				return;
			}

			// Log any other events we might have missed
			console.log(`🔐 [AUTH] Unhandled event: ${event} (no action taken)`);
		});
	}

	// Return verified data and Supabase client to all components
	return {
		// Supabase client for making authenticated requests
		supabase,
		// Verified user from server (safe to use)
		user: data.user,
		// User profile from server (includes role, gender, etc.)
		profile: data.profile,
		// VIP card templates from server (for client-side store)
		vipCardTemplates: data.vipCardTemplates
	};
};
