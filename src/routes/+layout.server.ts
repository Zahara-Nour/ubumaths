/**
 * Root Layout Server Load Function
 *
 * AUTHENTICATION FLOW - Step 2 (Server-Side Data Loading):
 * This runs on the server for every page request and provides verified auth data
 * to the client-side layout.
 *
 * FLOW:
 * 1. Uses safeGetSession() from the server hook (see src/lib/server/supabase.ts)
 * 2. Returns verified session and user data
 * 3. Also returns cookies needed for client-side Supabase initialization
 *
 * SECURITY:
 * - The session and user are VERIFIED by safeGetSession() via getUser()
 * - Never trust session data without verification
 * - This data is safe to use throughout the app
 *
 * USED BY:
 * - +layout.ts (client-side layout) receives this data
 * - All child routes inherit this data via SvelteKit's data flow
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	// Get verified session and user from the server hook
	const { session, user } = await safeGetSession();

	return {
		// Verified session (contains auth tokens)
		session,
		// Verified user object (authenticated via getUser())
		user,
		// All cookies (needed for client-side Supabase initialization)
		cookies: cookies.getAll()
	};
};
