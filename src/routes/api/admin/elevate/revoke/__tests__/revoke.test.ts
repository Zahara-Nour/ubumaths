/**
 * POST /api/admin/elevate/revoke — API Unit Tests
 * ===============================================
 *
 * Clears the admin elevation cookie ("quitter le mode admin"). Returns 200 for
 * any authenticated caller; clearing an already-absent cookie is idempotent.
 *
 * @module api/admin/elevate/revoke.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase, createMockLocals } from '$tests/helpers';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeEvent(locals: any) {
	const cookieDelete = vi.fn();
	return {
		event: {
			locals,
			cookies: { delete: cookieDelete, get: vi.fn(), set: vi.fn() },
			url: new URL('http://localhost/api/admin/elevate/revoke')
		} as any,
		cookieDelete
	};
}

describe('POST /api/admin/elevate/revoke', () => {
	beforeEach(() => import.meta.hot?.invalidate());

	it('clears the ubu-admin-elevation cookie and returns 200', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(TEACHER_ID, supabase, 'teacher') as any;
		locals.user = { id: TEACHER_ID };
		locals.profile = { id: TEACHER_ID, role: 'teacher' };

		const { event, cookieDelete } = makeEvent(locals);
		const response = await POST(event);

		expect(response.status).toBe(200);
		expect(cookieDelete).toHaveBeenCalledTimes(1);
		const [name, options] = cookieDelete.mock.calls[0];
		expect(name).toBe('ubu-admin-elevation');
		// SameSite=Strict mirrors the cookie's `set` options so the browser drops it.
		expect(options).toMatchObject({ path: '/', sameSite: 'strict' });
	});

	it('best-effort signs out the admin session server-side when currently elevated', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(TEACHER_ID, supabase, 'teacher') as any;
		locals.user = { id: TEACHER_ID };
		locals.profile = { id: TEACHER_ID, role: 'teacher' };
		// Simulate an active elevation with an admin-context client.
		const signOut = vi.fn().mockResolvedValue({ error: null });
		locals.adminElevation = {
			active: true,
			adminUserId: '550e8400-e29b-41d4-a716-446655440002',
			expiresAt: Date.now() + 3600_000
		};
		locals.adminSupabase = { auth: { signOut } };

		const { event, cookieDelete } = makeEvent(locals);
		const response = await POST(event);

		expect(response.status).toBe(200);
		// Server-side invalidation attempted, then cookie cleared.
		expect(signOut).toHaveBeenCalledTimes(1);
		expect(cookieDelete).toHaveBeenCalledTimes(1);
	});

	it('still clears the cookie (200) when the best-effort signOut throws', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(TEACHER_ID, supabase, 'teacher') as any;
		locals.user = { id: TEACHER_ID };
		locals.profile = { id: TEACHER_ID, role: 'teacher' };
		const signOut = vi.fn().mockRejectedValue(new Error('GoTrue unreachable'));
		locals.adminElevation = {
			active: true,
			adminUserId: '550e8400-e29b-41d4-a716-446655440002',
			expiresAt: Date.now() + 3600_000
		};
		locals.adminSupabase = { auth: { signOut } };

		const { event, cookieDelete } = makeEvent(locals);
		const response = await POST(event);

		// signOut failure must NOT break revoke — cookie still cleared.
		expect(response.status).toBe(200);
		expect(signOut).toHaveBeenCalledTimes(1);
		expect(cookieDelete).toHaveBeenCalledTimes(1);
	});

	it('rejects an unauthenticated caller with 401', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase) as any;

		const { event } = makeEvent(locals);
		try {
			await POST(event);
			expect.fail('Should have thrown 401');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});
});
