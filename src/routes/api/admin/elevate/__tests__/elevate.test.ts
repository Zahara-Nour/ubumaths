/**
 * POST /api/admin/elevate — API Unit Tests
 * ========================================
 *
 * Server-side admin elevation (Pattern 2). An authenticated teacher/admin POSTs
 * the **admin account's** email+password; the server verifies the credentials
 * with an EPHEMERAL Supabase client (so the caller's own sb-* session cookies
 * are never touched), confirms the credentials belong to an admin, and on
 * success sets the short-lived httpOnly `ubu-admin-elevation` cookie.
 *
 * Cases:
 *   - 400 invalid body (bad email / missing password)
 *   - 401 bad credentials (signInWithPassword fails)
 *   - 403 credentials belong to a NON-admin account
 *   - 200 + cookie set on valid admin credentials
 *   - 401/403 when the CALLER is not an authenticated teacher/admin
 *
 * The ephemeral client is mocked at the @supabase/supabase-js boundary; the
 * role-confirmation query runs through the mock locals.supabase.
 *
 * @module api/admin/elevate.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase, createMockLocals, createMockRequest } from '$tests/helpers';

// ---------------------------------------------------------------------------
// Module mocks (hoisted)
// ---------------------------------------------------------------------------

// Silence rate limiter (fail-open / allow) and let us assert it was consulted.
// NOTE: the endpoint uses the DEDICATED elevation buckets, not the login ones,
// so we mock the elevation-specific functions here.
vi.mock('$lib/server/rateLimiter', () => ({
	checkElevationRateLimitByIP: vi.fn().mockResolvedValue({ allowed: true }),
	checkElevationRateLimitByEmail: vi.fn().mockResolvedValue({ allowed: true })
}));

// Control the ephemeral verification client created via createClient(...).
// The ephemeral client both signs in AND reads its own profile role, so the
// mock exposes a chainable from().select().eq().single().
const signInWithPassword = vi.fn();
const ephemeralSingle = vi.fn();
vi.mock('@supabase/supabase-js', () => {
	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		single: (...args: unknown[]) => ephemeralSingle(...args)
	};
	return {
		createClient: vi.fn(() => ({
			auth: {
				signInWithPassword,
				signOut: vi.fn().mockResolvedValue({ error: null })
			},
			from: vi.fn(() => chain)
		}))
	};
});

const TEST_IDS = {
	teacher: '550e8400-e29b-41d4-a716-446655440001',
	admin: '550e8400-e29b-41d4-a716-446655440002'
};

const ADMIN_EMAIL = 'admin@voltairedoha.com';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';

/** Caller locals: an authenticated teacher (the common elevation initiator). */
function teacherCaller(supabase: ReturnType<typeof createMockSupabase>) {
	const locals = createMockLocals(TEST_IDS.teacher, supabase, 'teacher') as any;
	locals.user = { id: TEST_IDS.teacher };
	locals.profile = { id: TEST_IDS.teacher, role: 'teacher' };
	return locals;
}

/** A SvelteKit-ish event with the request, locals, cookies, and client addr. */
function makeEvent(request: Request, locals: any) {
	const cookieSet = vi.fn();
	return {
		event: {
			request,
			locals,
			cookies: { set: cookieSet, get: vi.fn(), delete: vi.fn() },
			getClientAddress: () => '203.0.113.7',
			url: new URL('http://localhost/api/admin/elevate')
		} as any,
		cookieSet
	};
}

/** A signInWithPassword success returning a session for the given user id. */
function signInSuccess(userId: string, email: string) {
	const expiresAt = Math.floor(Date.now() / 1000) + 3600;
	return {
		data: {
			user: { id: userId, email },
			session: {
				access_token: 'admin.jwt.token',
				refresh_token: 'admin-refresh',
				expires_at: expiresAt,
				user: { id: userId, email }
			}
		},
		error: null
	};
}

describe('POST /api/admin/elevate', () => {
	beforeEach(() => {
		signInWithPassword.mockReset();
		ephemeralSingle.mockReset();
		return import.meta.hot?.invalidate();
	});

	// -------------------------------------------------------------------------
	// Caller authorization
	// -------------------------------------------------------------------------

	it('rejects an unauthenticated caller with 401', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase) as any; // no user
		const request = createMockRequest({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
		const { event } = makeEvent(request, locals);

		try {
			await POST(event);
			expect.fail('Should have thrown 401');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
		expect(signInWithPassword).not.toHaveBeenCalled();
	});

	it('rejects a student caller with 403', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher, supabase, 'student') as any;
		locals.user = { id: TEST_IDS.teacher };
		locals.profile = { id: TEST_IDS.teacher, role: 'student' };
		const request = createMockRequest({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
		const { event } = makeEvent(request, locals);

		try {
			await POST(event);
			expect.fail('Should have thrown 403');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
		expect(signInWithPassword).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Body validation
	// -------------------------------------------------------------------------

	it('returns 400 for a malformed body (bad email)', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = teacherCaller(supabase);
		const request = createMockRequest({ email: 'not-an-email', password: ADMIN_PASSWORD });
		const { event } = makeEvent(request, locals);

		try {
			await POST(event);
			expect.fail('Should have thrown 400');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
		expect(signInWithPassword).not.toHaveBeenCalled();
	});

	it('returns 400 for invalid JSON', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = teacherCaller(supabase);
		const request = { json: vi.fn().mockRejectedValue(new Error('bad json')) } as any;
		const { event } = makeEvent(request, locals);

		try {
			await POST(event);
			expect.fail('Should have thrown 400');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	// -------------------------------------------------------------------------
	// Credential verification
	// -------------------------------------------------------------------------

	it('returns 401 when the admin credentials are wrong', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = teacherCaller(supabase);

		signInWithPassword.mockResolvedValueOnce({
			data: { user: null, session: null },
			error: { message: 'Invalid login credentials' }
		});

		const request = createMockRequest({ email: ADMIN_EMAIL, password: 'wrong' });
		const { event } = makeEvent(request, locals);

		try {
			await POST(event);
			expect.fail('Should have thrown 401');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
		expect(signInWithPassword).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when the credentials belong to a NON-admin account', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = teacherCaller(supabase);

		// Credentials are valid but for a teacher account.
		signInWithPassword.mockResolvedValueOnce(signInSuccess(TEST_IDS.teacher, ADMIN_EMAIL));
		// Role confirmation via the ephemeral (candidate) client → role 'teacher'.
		ephemeralSingle.mockResolvedValueOnce({
			data: { id: TEST_IDS.teacher, role: 'teacher' },
			error: null
		});

		const request = createMockRequest({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
		const { event, cookieSet } = makeEvent(request, locals);

		try {
			await POST(event);
			expect.fail('Should have thrown 403');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
		// No elevation cookie may be set for a non-admin.
		expect(cookieSet).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Success
	// -------------------------------------------------------------------------

	it('sets the ubu-admin-elevation cookie and returns 200 on valid admin creds', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = teacherCaller(supabase);

		signInWithPassword.mockResolvedValueOnce(signInSuccess(TEST_IDS.admin, ADMIN_EMAIL));
		ephemeralSingle.mockResolvedValueOnce({
			data: { id: TEST_IDS.admin, role: 'admin' },
			error: null
		});

		const request = createMockRequest({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
		const { event, cookieSet } = makeEvent(request, locals);

		const response = await POST(event);
		expect(response.status).toBe(200);

		// httpOnly elevation cookie was set with the right name and options.
		expect(cookieSet).toHaveBeenCalledTimes(1);
		const [name, value, options] = cookieSet.mock.calls[0];
		expect(name).toBe('ubu-admin-elevation');
		expect(typeof value).toBe('string');
		expect(value.length).toBeGreaterThan(0);
		// SameSite=Strict: this cookie grants full admin authority and is only ever
		// read by same-site in-app requests (also blunts CSRF).
		expect(options).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/' });
		expect(options.maxAge).toBeGreaterThan(0);
		expect(options.maxAge).toBeLessThanOrEqual(3600);
	});

	it('does NOT write or modify any sb-* (teacher session) cookie', async () => {
		// The teacher's own session must be untouched: the elevate endpoint verifies
		// admin creds via an EPHEMERAL client (mocked, no cookie store) and only ever
		// writes the dedicated `ubu-admin-elevation` cookie. Guard against a refactor
		// that would accidentally mutate the caller's `sb-*` auth cookies.
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = teacherCaller(supabase);

		signInWithPassword.mockResolvedValueOnce(signInSuccess(TEST_IDS.admin, ADMIN_EMAIL));
		ephemeralSingle.mockResolvedValueOnce({
			data: { id: TEST_IDS.admin, role: 'admin' },
			error: null
		});

		const request = createMockRequest({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
		const { event, cookieSet } = makeEvent(request, locals);

		await POST(event);

		// Every cookie write must be the elevation cookie — never an sb-* one.
		for (const [cookieName] of cookieSet.mock.calls) {
			expect(cookieName).toBe('ubu-admin-elevation');
			expect(String(cookieName).startsWith('sb-')).toBe(false);
		}
		// cookies.delete is also never used to drop an sb-* cookie here.
		const cookieDelete = event.cookies.delete as ReturnType<typeof vi.fn>;
		expect(cookieDelete).not.toHaveBeenCalled();
	});
});
