/**
 * POST /api/admin/elevate/revoke
 * ==============================
 *
 * Clears the admin elevation cookie ("quitter le mode admin"). After this the
 * caller is no longer elevated and admin routes return 403 until they
 * re-elevate. Clearing an absent cookie is idempotent.
 *
 * Any authenticated user may revoke their OWN elevation (the cookie is scoped
 * to their browser); we still require authentication to avoid drive-by clears
 * from cross-site requests (CSRF is also enforced globally in hooks).
 *
 * ## Server-side invalidation & accepted risk window
 * When the caller is currently elevated, we make a BEST-EFFORT `signOut()` on
 * the admin-context client so the admin's GoTrue session is invalidated
 * server-side, not just dropped from the browser. This is best-effort: if it
 * fails (network/GoTrue hiccup) we still clear the cookie — losing the cookie
 * already removes all admin authority in-app.
 *
 * **Accepted risk (conscious decision):** if the server-side `signOut()` is not
 * performed (handle didn't populate `adminSupabase`, or the call fails), the
 * admin **access token** stays valid at GoTrue until its natural expiry
 * (≤ 1 h). The exposure is deliberately minimal: access-token-only (NO refresh
 * token is ever stored), the cookie is httpOnly + secure + SameSite=Strict, and
 * there is a single admin account. We accept this ≤ 1 h leak window rather than
 * add token-revocation infrastructure. See docs/wip/admin-elevation-progress.md.
 *
 * Responses:
 * - 200: cookie cleared
 * - 401: not authenticated
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ADMIN_ELEVATION_COOKIE } from '$lib/server/adminElevation';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	// Must be authenticated (401 otherwise). A bare user check is sufficient here
	// — revoking elevation needs no role/profile, and avoids an unnecessary DB
	// round-trip. CSRF is enforced globally in hooks.server.ts.
	if (!locals.user) {
		throw error(401, 'Non autorisé - Authentification requise');
	}

	// Best-effort server-side invalidation of the admin session. The admin client
	// (set by adminElevationHandle) authenticates with `Authorization: Bearer
	// <admin access token>`, so `signOut()` issues GoTrue's logout against that
	// session and revokes it server-side — closing the access-token leak window
	// instead of leaving it valid until natural expiry. Wrapped in try/catch and
	// intentionally ignored on failure: clearing the cookie below is what
	// actually removes admin authority in-app, so revoke must never fail on this.
	if (locals.adminElevation?.active && locals.adminSupabase) {
		try {
			await locals.adminSupabase.auth.signOut();
		} catch {
			// Ignore — see "Accepted risk" in the module doc: worst case the token
			// stays valid at GoTrue for the remainder of its ≤ 1 h lifetime.
		}
	}

	// Path must match how the cookie was set so the browser actually drops it.
	// SameSite=Strict mirrors the cookie's `set` options.
	cookies.delete(ADMIN_ELEVATION_COOKIE, { path: '/', sameSite: 'strict' });

	return json({ success: true });
};
