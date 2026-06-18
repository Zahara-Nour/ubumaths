/**
 * requireAdmin Middleware — Unit Tests
 * ====================================
 *
 * Server-side admin elevation (Pattern 2). `requireAdmin(locals)` is the gate
 * for admin routes. It returns an admin-scoped Supabase client + the admin's
 * user id, regardless of whether admin power comes from:
 *   - a step-up *elevation* (a teacher who elevated → locals.adminSupabase), or
 *   - a real admin login (profile.role === 'admin' → locals.supabase).
 *
 * Cases:
 *   - elevated locals → ok, returns locals.adminSupabase + adminUserId
 *   - real admin login (no elevation) → ok, returns locals.supabase + user.id
 *   - authenticated non-admin, not elevated → 403
 *   - unauthenticated → 401
 *
 * Uses the mock-locals pattern (role lives on locals.profile, populated by
 * userProfileHandle in hooks.server.ts).
 *
 * @module server/middleware/requireAdmin.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals } from '$tests/helpers';
import { requireAdmin } from '../auth';

const TEST_IDS = {
	teacher: '550e8400-e29b-41d4-a716-446655440001',
	admin: '550e8400-e29b-41d4-a716-446655440002',
	student: '550e8400-e29b-41d4-a716-446655440003',
	elevatedAdmin: '550e8400-e29b-41d4-a716-446655440099'
};

/** Build mock locals with an explicit role on locals.profile (as hooks do). */
function localsWithRole(
	userId: string,
	role: 'teacher' | 'admin' | 'student',
	supabase: ReturnType<typeof createMockSupabase>
) {
	const locals = createMockLocals(userId, supabase, role) as any;
	locals.user = { id: userId };
	locals.profile = { id: userId, role };
	return locals;
}

describe('requireAdmin — elevated (step-up) path', () => {
	it('returns the admin-scoped client + adminUserId when elevation is active', async () => {
		const callerSupabase = createMockSupabase();
		const adminSupabase = createMockSupabase();

		// Caller is a teacher who has elevated.
		const locals = localsWithRole(TEST_IDS.teacher, 'teacher', callerSupabase);
		locals.adminSupabase = adminSupabase;
		locals.adminElevation = {
			active: true,
			adminUserId: TEST_IDS.elevatedAdmin,
			expiresAt: Date.now() + 3600_000
		};

		const result = await requireAdmin(locals);

		// Privileged writes must go through the admin-scoped client, NOT the teacher's.
		expect(result.supabase).toBe(adminSupabase);
		expect(result.supabase).not.toBe(callerSupabase);
		expect(result.adminUserId).toBe(TEST_IDS.elevatedAdmin);
	});
});

describe('requireAdmin — real admin login path', () => {
	it('returns locals.supabase + user.id for a genuine admin with no elevation', async () => {
		const supabase = createMockSupabase();
		const locals = localsWithRole(TEST_IDS.admin, 'admin', supabase);
		// No adminElevation / adminSupabase set.

		const result = await requireAdmin(locals);

		expect(result.supabase).toBe(supabase);
		expect(result.adminUserId).toBe(TEST_IDS.admin);
	});

	it('ignores an inactive elevation object and falls back to the admin login', async () => {
		const supabase = createMockSupabase();
		const locals = localsWithRole(TEST_IDS.admin, 'admin', supabase);
		locals.adminElevation = { active: false, adminUserId: '', expiresAt: 0 } as any;

		const result = await requireAdmin(locals);
		expect(result.supabase).toBe(supabase);
		expect(result.adminUserId).toBe(TEST_IDS.admin);
	});
});

describe('requireAdmin — denial', () => {
	it('throws 403 for an authenticated teacher who has NOT elevated', async () => {
		const supabase = createMockSupabase();
		const locals = localsWithRole(TEST_IDS.teacher, 'teacher', supabase);

		try {
			await requireAdmin(locals);
			expect.fail('Should have thrown 403');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Admin elevation required');
		}
	});

	it('throws 403 for an authenticated student', async () => {
		const supabase = createMockSupabase();
		const locals = localsWithRole(TEST_IDS.student, 'student', supabase);

		try {
			await requireAdmin(locals);
			expect.fail('Should have thrown 403');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Admin elevation required');
		}
	});

	it('throws 401 when the caller is not authenticated at all', async () => {
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase) as any; // no user, no profile

		try {
			await requireAdmin(locals);
			expect.fail('Should have thrown 401');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});
});
