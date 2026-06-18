/**
 * POST /api/admin/elevate
 * =======================
 *
 * Server-side admin elevation (Pattern 2 — "step-up"). An authenticated
 * teacher/admin POSTs the **admin account's** email + password. The server:
 *
 *   1. confirms the CALLER is a teacher/admin (requireRoles),
 *   2. validates the body (Zod) + rate-limits like the login route,
 *   3. verifies the admin credentials with an EPHEMERAL client
 *      (`signInWithPassword`) — this NEVER touches the caller's `sb-*` session
 *      because the ephemeral client persists nothing and writes no cookies,
 *   4. confirms the signed-in user's `profiles.role === 'admin'` (role from DB),
 *   5. on success, sets the short-lived httpOnly `ubu-admin-elevation` cookie
 *      carrying the admin access token (TTL ≈ token lifetime, ≤ 1h).
 *
 * The caller's own JWT is never modified and gains no admin power; admin
 * authority lives entirely in the elevation cookie + `adminElevationHandle`.
 *
 * Responses:
 * - 200: elevation granted (cookie set)
 * - 400: invalid body / JSON
 * - 401: caller not authenticated, OR admin credentials invalid
 * - 403: caller not a teacher/admin, OR credentials belong to a non-admin
 * - 429: rate limited
 */

import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { adminElevateSchema } from '$lib/server/validation/admin-elevation';
import {
	ADMIN_ELEVATION_COOKIE,
	createEphemeralAuthClient,
	encodeElevationCookie
} from '$lib/server/adminElevation';
import {
	checkElevationRateLimitByIP,
	checkElevationRateLimitByEmail
} from '$lib/server/rateLimiter';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('api/admin/elevate');

/** Hard ceiling on the elevation cookie lifetime (seconds) — ~1h. */
const MAX_ELEVATION_MAX_AGE = 3600;

export const POST: RequestHandler = async ({ request, locals, cookies, getClientAddress }) => {
	// 1. The caller must already be an authenticated teacher or admin. We read
	//    the role from locals.profile (populated by userProfileHandle in
	//    hooks.server.ts) rather than re-querying — it's the same source of truth
	//    used elsewhere (e.g. /api/moderation/restrict-user).
	if (!locals.user) {
		throw error(401, 'Non autorisé - Authentification requise');
	}
	if (!locals.profile || !['teacher', 'admin'].includes(locals.profile.role ?? '')) {
		throw error(403, 'Interdit - Enseignants et administrateurs uniquement');
	}

	// 2. Parse + validate body.
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = adminElevateSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}
	const { email, password } = validation.data;

	// 3. Rate limit. Same dual IP + email scheme as the login route, but on
	//    DEDICATED buckets (ratelimit:elevate:*) so a fat-fingered admin password
	//    can't burn the /auth/login budget and lock the admin out of the real
	//    login page (also avoids a targeted-lockout vector against login).
	const ip = getClientAddress();
	const ipLimit = await checkElevationRateLimitByIP(ip);
	if (!ipLimit.allowed) {
		throw error(429, ipLimit.message ?? 'Trop de tentatives. Réessayez plus tard.');
	}
	const emailLimit = await checkElevationRateLimitByEmail(email);
	if (!emailLimit.allowed) {
		throw error(429, emailLimit.message ?? 'Trop de tentatives. Réessayez plus tard.');
	}

	// 4. Verify the ADMIN credentials with an ephemeral client. This client
	//    persists no session and writes no cookies → the caller's sb-* session
	//    is untouched.
	const ephemeral = createEphemeralAuthClient();
	const { data: signInData, error: signInError } = await ephemeral.auth.signInWithPassword({
		email,
		password
	});

	if (signInError || !signInData.session || !signInData.user) {
		// Do not reveal whether the account exists — generic invalid-credentials.
		throw error(401, 'Identifiants administrateur invalides');
	}

	const adminUserId = signInData.user.id;
	const accessToken = signInData.session.access_token;
	// Supabase session expires_at is a Unix epoch in SECONDS.
	const expiresAtSec =
		signInData.session.expires_at ?? Math.floor(Date.now() / 1000) + MAX_ELEVATION_MAX_AGE;

	// 5. Confirm the signed-in account is actually an admin (role from the DB).
	//    We read the role through the EPHEMERAL client — which is now authed as
	//    the candidate — so the check uses the candidate's own "view own profile"
	//    RLS path and never depends on the caller's (teacher's) RLS visibility of
	//    the admin row. Role always comes from the DB, never the JWT.
	const { data: profile, error: profileError } = await ephemeral
		.from('profiles')
		.select('id, role')
		.eq('id', adminUserId)
		.single();

	if (profileError || !profile) {
		logger.error('Failed to confirm role for elevation candidate:', profileError);
		throw error(403, 'Compte non administrateur');
	}

	if (profile.role !== 'admin') {
		logger.warn('Non-admin credentials presented to /api/admin/elevate', { role: profile.role });
		throw error(403, 'Compte non administrateur');
	}

	// 6. Mint the elevation cookie. Cap the TTL at the token lifetime (≤ 1h).
	const expiresAtMs = expiresAtSec * 1000;
	const maxAge = Math.min(
		MAX_ELEVATION_MAX_AGE,
		Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
	);

	const cookieValue = encodeElevationCookie({ adminUserId, accessToken, expiresAt: expiresAtMs });

	cookies.set(ADMIN_ELEVATION_COOKIE, cookieValue, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		// Strict: this cookie grants full admin authority and is only ever read by
		// same-site, in-app navigations/fetches → no legitimate cross-site need.
		// Strict also blunts CSRF (no cross-site request ever carries it).
		sameSite: 'strict',
		maxAge
	});

	// Mask the admin UUID — never log the raw id (PII / correlation) or the token.
	logger.info('Admin elevation granted', { adminUserId: `${adminUserId.slice(0, 8)}***` });

	return json({ success: true, expiresAt: expiresAtMs });
};
