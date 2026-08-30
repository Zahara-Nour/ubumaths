/**
 * Security M4 — teacher form actions enforce role (defense in depth)
 * =================================================================
 * These privileged form actions previously guarded on `!user` alone, so a
 * `student` session could POST to them and rely on RLS as the sole defense
 * (the exact pattern behind the C1/C4 incidents). Each now calls
 * `requireRoles(locals, ['teacher', 'admin'])` as its first statement.
 *
 * We assert the DENIAL paths — 401 unauthenticated, 403 student — across a
 * representative sample of the newly-guarded actions (one per touched file,
 * covering each guard shape: bare guard, `const { user } = ...`, and the
 * `locals` re-bind used where the action destructured `locals`).
 *
 * Mirrors the mock-locals pattern from templates/__tests__/routes.test.ts:
 * requireRoles → requireAuth reads the role from a `profiles` select().single(),
 * stubbed here via `mockSupabase._mockChain.single`.
 *
 * @module routes/teacher/m4-action-role-guards.test
 */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals } from '$tests/helpers';

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440003';
const SOME_UUID = '550e8400-e29b-41d4-a716-446655440010';

type ActionFn = (event: never) => Promise<unknown>;

function makeRequest(): Request {
	return new Request('http://localhost', { method: 'POST', body: new FormData() });
}

/**
 * A privileged action must reject an unauthenticated caller (401) and an
 * authenticated `student` (403) before doing any work. `extra` supplies any
 * event fields the action destructures (e.g. `params`); they are never reached
 * because the role guard is the first statement.
 */
async function assertRoleGuarded(
	action: ActionFn,
	extra: Record<string, unknown> = {}
): Promise<void> {
	// Unauthenticated → 401 (requireAuth throws before any DB access).
	const anonLocals = createMockLocals();
	await expect(
		action({ request: makeRequest(), locals: anonLocals, ...extra } as never)
	).rejects.toMatchObject({ status: 401 });

	// Authenticated student → 403 (profiles lookup resolves to role 'student').
	const supabase = createMockSupabase();
	const studentLocals = createMockLocals(STUDENT_ID, supabase);
	supabase._mockChain.single.mockResolvedValueOnce({ data: { role: 'student' }, error: null });
	await expect(
		action({ request: makeRequest(), locals: studentLocals, ...extra } as never)
	).rejects.toMatchObject({ status: 403 });
}

describe('Security M4 — teacher form actions enforce role', () => {
	it('assessments/[id]/assign · assign', async () => {
		const { actions } = await import('../assessments/[id]/assign/+page.server');
		await assertRoleGuarded(actions.assign as ActionFn, { params: { id: SOME_UUID } });
	});

	it('assessments/[id]/assign · unassign', async () => {
		const { actions } = await import('../assessments/[id]/assign/+page.server');
		await assertRoleGuarded(actions.unassign as ActionFn, { params: { id: SOME_UUID } });
	});

	it('assessments/[id]/edit · default', async () => {
		const { actions } = await import('../assessments/[id]/edit/+page.server');
		await assertRoleGuarded(actions.default as ActionFn, { params: { id: SOME_UUID } });
	});

	it('classes · createScheduleEntry', async () => {
		const { actions } = await import('../classes/+page.server');
		await assertRoleGuarded(actions.createScheduleEntry as ActionFn);
	});

	it('classes · deleteScheduleEntry', async () => {
		const { actions } = await import('../classes/+page.server');
		await assertRoleGuarded(actions.deleteScheduleEntry as ActionFn);
	});

	it('notifications · create', async () => {
		const { actions } = await import('../notifications/+page.server');
		await assertRoleGuarded(actions.create as ActionFn);
	});

	it('contenu/worksheets · delete', async () => {
		const { actions } = await import('../contenu/worksheets/+page.server');
		await assertRoleGuarded(actions.delete as ActionFn);
	});

	it('contenu/exercices · delete', async () => {
		const { actions } = await import('../contenu/exercices/+page.server');
		await assertRoleGuarded(actions.delete as ActionFn);
	});

	it('contenu/enigmes · delete', async () => {
		const { actions } = await import('../contenu/enigmes/+page.server');
		await assertRoleGuarded(actions.delete as ActionFn);
	});

	it('contenu/enigmes · toggleStatus', async () => {
		const { actions } = await import('../contenu/enigmes/+page.server');
		await assertRoleGuarded(actions.toggleStatus as ActionFn);
	});

	it('contenu/enigmes/of-the-day · setRiddle', async () => {
		const { actions } = await import('../contenu/enigmes/of-the-day/+page.server');
		await assertRoleGuarded(actions.setRiddle as ActionFn);
	});

	it('contenu/enigmes/new · default', async () => {
		const { actions } = await import('../contenu/enigmes/new/+page.server');
		await assertRoleGuarded(actions.default as ActionFn);
	});

	it('contenu/enigmes/[id]/edit · default', async () => {
		const { actions } = await import('../contenu/enigmes/[id]/edit/+page.server');
		await assertRoleGuarded(actions.default as ActionFn, { params: { id: SOME_UUID } });
	});
});
