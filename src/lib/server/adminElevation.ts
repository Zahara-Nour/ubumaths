/**
 * Server-Side Admin Elevation (Pattern 2 — "step-up")
 * ===================================================
 *
 * A teacher stays logged in (their own `sb-*` session, `profile.role==='teacher'`).
 * To act as admin they POST the **admin account's** credentials to
 * `/api/admin/elevate`; the server verifies them with an EPHEMERAL client and
 * sets a short-lived httpOnly cookie holding the admin **access token**. On each
 * subsequent request, {@link createAdminElevationHandle} reads that cookie,
 * verifies the token with Supabase (`getUser(token)`), confirms the resolved
 * user is an admin, and exposes a request-scoped admin-context Supabase client
 * as `locals.adminSupabase` (RLS runs as `auth.uid() = <admin>`).
 *
 * The teacher's own JWT never gains admin power — admin authority lives entirely
 * in this parallel state, gated by {@link createAdminElevationHandle}.
 *
 * ## Cookie design (decided)
 * - Name `ubu-admin-elevation` — deliberately NOT `sb-*` so `@supabase/ssr`
 *   ignores it and it's filtered out of the client payload by `+layout.server.ts`.
 * - Value: base64url-encoded JSON `{ adminUserId, accessToken, expiresAt }`.
 *   The access token is a real Supabase JWT — its integrity comes from the
 *   token's own signature (verified by `getUser(token)`), exactly like the
 *   `sb-*` cookies, so NO custom crypto/secret is needed. `adminUserId` +
 *   `expiresAt` are stored alongside for cheap pre-checks; `getUser(token)`
 *   remains the source of truth.
 * - httpOnly + secure(!dev) + sameSite=lax; TTL ≈ access-token lifetime (~1h).
 *   On expiry → not elevated → re-elevate (no silent refresh).
 *
 * ## Security boundaries
 * - This module NEVER touches `locals.supabase` or the `sb-*` cookies.
 * - `createAdminClient` / `createEphemeralAuthClient` never persist a session
 *   (`persistSession:false`, `autoRefreshToken:false`) and never write cookies.
 *
 * @module server/adminElevation
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('server/adminElevation.ts');

/**
 * Name of the elevation cookie. MUST NOT start with `sb-` (otherwise
 * `@supabase/ssr` would try to interpret it as part of the auth session).
 */
export const ADMIN_ELEVATION_COOKIE = 'ubu-admin-elevation';

/**
 * Decoded contents of the elevation cookie.
 * - `accessToken`: the admin's Supabase access token (a signed JWT).
 * - `adminUserId`: the admin's `auth.users.id` (for cheap pre-checks).
 * - `expiresAt`: Unix epoch in **milliseconds** (token expiry).
 */
export interface ElevationCookiePayload {
	adminUserId: string;
	accessToken: string;
	expiresAt: number;
}

// ============================================================================
// PURE COOKIE HELPERS (unit-testable, no I/O)
// ============================================================================

/**
 * Encode an elevation payload into an opaque cookie value (base64url JSON).
 * No encryption: the payload's integrity is the access token's JWT signature,
 * verified later by {@link createAdminElevationHandle} via `getUser(token)`.
 */
export function encodeElevationCookie(payload: ElevationCookiePayload): string {
	const json = JSON.stringify(payload);
	return Buffer.from(json, 'utf8').toString('base64url');
}

/**
 * Decode an elevation cookie value.
 *
 * Returns `null` (treated as "not elevated") when the value is:
 * - malformed (not base64url / not JSON / missing or wrong-typed fields), or
 * - expired (`expiresAt < now`).
 *
 * This is a structural + freshness check only; the token signature is still
 * verified separately by `getUser(token)` before any elevation is granted.
 */
export function decodeElevationCookie(value: string): ElevationCookiePayload | null {
	if (!value) return null;

	let parsed: unknown;
	try {
		const json = Buffer.from(value, 'base64url').toString('utf8');
		parsed = JSON.parse(json);
	} catch {
		return null;
	}

	if (typeof parsed !== 'object' || parsed === null) return null;
	const candidate = parsed as Record<string, unknown>;

	const { adminUserId, accessToken, expiresAt } = candidate;
	if (
		typeof adminUserId !== 'string' ||
		typeof accessToken !== 'string' ||
		typeof expiresAt !== 'number' ||
		!Number.isFinite(expiresAt)
	) {
		return null;
	}

	// Expired → not elevated.
	if (expiresAt < Date.now()) return null;

	return { adminUserId, accessToken, expiresAt };
}

// ============================================================================
// REQUEST-SCOPED CLIENTS (no session persistence, no cookie writes)
// ============================================================================

/**
 * Build a request-scoped Supabase client that authenticates AS the admin by
 * sending `Authorization: Bearer <accessToken>` on every request, so RLS runs
 * with `auth.uid() = <admin>`.
 *
 * The client does NOT persist a session and does NOT manage cookies — it lives
 * only for the duration of the current request.
 */
export function createAdminClient(accessToken: string): SupabaseClient<Database> {
	return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		},
		global: {
			headers: { Authorization: `Bearer ${accessToken}` }
		}
	});
}

/**
 * Build an EPHEMERAL client used solely to verify admin credentials in the
 * elevate endpoint (`signInWithPassword`). Crucially it persists nothing and
 * writes no cookies, so verifying the admin's password NEVER touches the
 * caller's (teacher's) `sb-*` session.
 *
 * The plain `@supabase/supabase-js` `createClient` (not the SSR/cookie variant)
 * is used on purpose: there is no cookie store to mutate.
 */
export function createEphemeralAuthClient(): SupabaseClient<Database> {
	return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		}
	});
}

// ============================================================================
// HANDLE
// ============================================================================

/**
 * Build the elevation Handle. Wire it into `hooks.server.ts` AFTER
 * `userProfileHandle` and BEFORE `csrfHandle`.
 *
 * Behaviour:
 * 1. Read the `ubu-admin-elevation` cookie. Absent / malformed / expired →
 *    leave `locals` untouched (not elevated) and continue.
 * 2. Verify the access token with Supabase (`getUser(token)`). Invalid → ignore.
 * 3. Confirm the resolved user's `profiles.role === 'admin'` (role from DB,
 *    never the JWT). Not an admin → ignore (defence in depth; the cookie should
 *    only ever hold an admin token, but we re-check).
 * 4. On success: set `locals.adminSupabase` (admin-context client) and
 *    `locals.adminElevation = { active: true, adminUserId, expiresAt }`.
 *
 * This handle NEVER reads/writes `sb-*` cookies and NEVER touches
 * `locals.supabase`.
 *
 * The `verifyToken` dependency is injected (defaults to a one-shot admin client)
 * so the handle is unit-testable without a live Supabase.
 */
export function createAdminElevationHandle(
	deps: {
		verifyToken?: (
			accessToken: string
		) => Promise<{ userId: string | null; client: SupabaseClient<Database> }>;
	} = {}
): Handle {
	const verifyToken =
		deps.verifyToken ??
		(async (accessToken: string) => {
			const client = createAdminClient(accessToken);
			const {
				data: { user },
				error
			} = await client.auth.getUser(accessToken);
			return { userId: error ? null : (user?.id ?? null), client };
		});

	return async ({ event, resolve }) => {
		// Perf/DoS guard: this handle runs on EVERY request, but elevation only
		// matters for admin routes. Early-return BEFORE any I/O (no cookie read, no
		// getUser(), no profiles query) when the path isn't an admin path, so a
		// stale/forged cookie can't make every unrelated request pay a getUser() +
		// DB round-trip. The elevate endpoint lives under /api/admin, so the handle
		// still runs there (fine: the cookie isn't set yet on that request).
		const { pathname } = event.url;
		if (!pathname.startsWith('/dashboard/admin') && !pathname.startsWith('/api/admin')) {
			event.locals.adminElevation = null;
			return resolve(event);
		}

		const raw = event.cookies.get(ADMIN_ELEVATION_COOKIE);

		if (raw) {
			const payload = decodeElevationCookie(raw);

			if (payload) {
				try {
					const { userId, client } = await verifyToken(payload.accessToken);

					// The token must verify AND resolve to the same user the cookie claims.
					if (userId && userId === payload.adminUserId) {
						// Re-check the role from the DB (never trust the JWT for role).
						const { data: profile, error: profileError } = await client
							.from('profiles')
							.select('role')
							.eq('id', userId)
							.single();

						if (!profileError && profile?.role === 'admin') {
							event.locals.adminSupabase = client;
							event.locals.adminElevation = {
								active: true,
								adminUserId: userId,
								expiresAt: payload.expiresAt
							};
						} else {
							logger.warn('Elevation cookie token is not an admin; ignoring', {
								adminUserId: userId
							});
						}
					}
				} catch (err) {
					// Network/verification failure → treat as not elevated (fail closed).
					logger.error('Failed to verify admin elevation token:', err);
				}
			}
		}

		// Default: not elevated unless the block above set it.
		if (!event.locals.adminElevation) {
			event.locals.adminElevation = null;
		}

		return resolve(event);
	};
}

/** Production handle, wired into hooks.server.ts after userProfileHandle. */
export const adminElevationHandle: Handle = createAdminElevationHandle();
