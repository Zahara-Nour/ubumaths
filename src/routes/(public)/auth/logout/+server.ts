/**
 * Server-side Logout Endpoint
 *
 * WHY SERVER-SIDE LOGOUT?
 * -----------------------
 * Similar to login, the Supabase client in the browser uses localStorage,
 * while the server uses cookies. If we logout on the client:
 * - Browser: Session cleared from localStorage ✅
 * - Server: Cookies NOT cleared ❌
 * - Result: Server still sees user as logged in
 * - UI doesn't update until page refresh
 *
 * By handling logout on the SERVER:
 * - Server: Clears auth cookies ✅
 * - Browser: Detects auth change via onAuthStateChange ✅
 * - Browser: Calls invalidate() to refresh data ✅
 * - Result: UI updates instantly
 *
 * FLOW:
 * 1. User clicks logout button
 * 2. Form POSTs to /auth/logout
 * 3. Server calls signOut() → clears cookies
 * 4. Server redirects to home page
 * 5. Browser's onAuthStateChange fires (SIGNED_OUT event)
 * 6. Browser calls invalidate('supabase:auth')
 * 7. Layout re-runs → server returns null session → UI updates
 *
 * CALLED FROM:
 * - src/lib/components/Header.svelte (logout button)
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLogger } from '$lib/utils/logger';
import {
	ADMIN_ELEVATION_COOKIE,
	createAdminClient,
	decodeElevationCookie
} from '$lib/server/adminElevation';

const logger = createLogger('auth/logout');

export const POST: RequestHandler = async ({ locals: { supabase }, cookies }) => {
	// Get user email before signing out for logging purposes
	const {
		data: { user }
	} = await supabase.auth.getUser();

	// Sign out on the server - this is the key!
	// The server Supabase client will clear cookies via the cookie handlers
	// defined in src/lib/server/supabase.ts
	await supabase.auth.signOut();

	// L'élévation admin part avec la session (constat B4) : sinon, sur un poste partagé,
	// le jeton admin (≤ 1 h) restait dans le navigateur après le logout. Révocation
	// côté GoTrue au mieux, comme /api/admin/elevate/revoke ; le cookie est effacé
	// quoi qu'il arrive.
	const elevation = decodeElevationCookie(cookies.get(ADMIN_ELEVATION_COOKIE) ?? '');
	if (elevation) {
		try {
			await createAdminClient(elevation.accessToken).auth.signOut();
		} catch {
			// Le cookie effacé ci-dessous suffit à retirer l'autorité dans l'app.
		}
	}
	cookies.delete(ADMIN_ELEVATION_COOKIE, { path: '/', sameSite: 'strict' });

	// Log successful logout
	if (user?.email) {
		logger.info('User disconnected:', user.email);
	}

	// Redirect to home page - the layout will detect the auth change
	// and update the UI to show the login button
	throw redirect(303, '/');
};
