/**
 * Page server load — Teacher dashboard /python-notebook/[id]/results
 *
 * Tests cover the authz gate (anonymous, non-teacher, non-author non-assigner)
 * and the happy-path composition of notebook content + class members +
 * checkpoint runs into StudentRow[].
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from 'vitest';
import { createMockSupabase, mockSuccess } from '$tests/helpers';

const NOTEBOOK_ID = '550e8400-e29b-41d4-a716-446655440100';
const AUTHOR_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_TEACHER_ID = '550e8400-e29b-41d4-a716-446655440002';
const STUDENT_A_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_B_ID = '550e8400-e29b-41d4-a716-446655440011';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';

function makeLocals(user: { id: string } | null, supabase: ReturnType<typeof createMockSupabase>) {
	return {
		supabase,
		user,
		safeGetSession: vi.fn().mockResolvedValue({ user, session: user ? {} : null })
	};
}

const notebookWithCheckpoints = {
	id: NOTEBOOK_ID,
	title: 'Découverte des listes',
	author_id: AUTHOR_ID,
	content: {
		version: '1.0',
		metadata: {},
		cells: [
			{ id: 'code-1', type: 'code', source: '', execution_count: null, outputs: [], state: 'idle' },
			{
				id: 'cp-1',
				type: 'checkpoint',
				source: 'assert x == 6',
				execution_count: null,
				outputs: [],
				state: 'idle',
				title: 'Étape 1 : moyenne',
				checkpoint: { mode: 'assert', code: 'assert x == 6' }
			},
			{
				id: 'cp-2',
				type: 'checkpoint',
				source: '',
				execution_count: null,
				outputs: [],
				state: 'idle',
				checkpoint: {
					mode: 'unit_test',
					function_name: 'moyenne',
					test_cases: [{ args: [[1, 2, 3]], expected: 2 }]
				}
			}
		]
	}
};

describe('GET /python-notebook/[id]/results — authz', () => {
	it('redirects anonymous callers to signin', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		const locals = makeLocals(null, supabase);

		await expect(load({ params: { id: NOTEBOOK_ID }, locals } as any)).rejects.toMatchObject({
			status: 303,
			location: '/auth/signin'
		});
	});

	it('redirects non-teacher to /dashboard', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single');
		const locals = makeLocals({ id: STUDENT_A_ID }, supabase);

		await expect(load({ params: { id: NOTEBOOK_ID }, locals } as any)).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});

	it('rejects a teacher that did not author nor assign the notebook with 403', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		// 1. profile → teacher
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		// 2. notebook → exists but author is someone else
		mockSuccess(supabase, notebookWithCheckpoints, 'maybeSingle');
		// 3. own assignments → empty
		mockSuccess(supabase, [], 'then');

		const locals = makeLocals({ id: OTHER_TEACHER_ID }, supabase);

		await expect(load({ params: { id: NOTEBOOK_ID }, locals } as any)).rejects.toMatchObject({
			status: 403
		});
	});

	it('returns 404 when the notebook does not exist', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, null, 'maybeSingle');

		const locals = makeLocals({ id: AUTHOR_ID }, supabase);
		await expect(load({ params: { id: NOTEBOOK_ID }, locals } as any)).rejects.toMatchObject({
			status: 404
		});
	});

	it('rejects invalid notebook UUIDs with 400', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		const locals = makeLocals({ id: AUTHOR_ID }, supabase);

		await expect(load({ params: { id: 'not-a-uuid' }, locals } as any)).rejects.toMatchObject({
			status: 400
		});
	});
});

describe('GET /python-notebook/[id]/results — composition', () => {
	it('returns notebook + checkpoints + empty rows when no students are in scope', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, notebookWithCheckpoints, 'maybeSingle');
		// Author is the caller — short-circuits the assigned-by check
		mockSuccess(supabase, [], 'then'); // ownAssignments (ignored when author)
		mockSuccess(supabase, [], 'then'); // teacherClasses
		// No class_members query since teacherClassIds is empty

		const locals = makeLocals({ id: AUTHOR_ID }, supabase);
		const result = (await load({ params: { id: NOTEBOOK_ID }, locals } as any)) as {
			notebook: { id: string; title: string };
			checkpoints: Array<{ cell_id: string; title: string | null; mode: string }>;
			rows: unknown[];
			teacherClasses: unknown[];
			classMembers: unknown[];
		};

		expect(result.notebook.id).toBe(NOTEBOOK_ID);
		expect(result.checkpoints).toHaveLength(2);
		expect(result.checkpoints[0]).toEqual({
			cell_id: 'cp-1',
			title: 'Étape 1 : moyenne',
			mode: 'assert'
		});
		expect(result.checkpoints[1]).toEqual({
			cell_id: 'cp-2',
			title: null,
			mode: 'unit_test'
		});
		expect(result.rows).toEqual([]);
		expect(result.teacherClasses).toEqual([]);
	});

	it('composes student rows with their last status per checkpoint', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockSuccess(supabase, notebookWithCheckpoints, 'maybeSingle'); // notebook
		mockSuccess(supabase, [], 'then'); // ownAssignments (author, so unused)
		mockSuccess(supabase, [{ id: CLASS_ID, name: 'Terminale NSI' }], 'then'); // teacherClasses
		mockSuccess(
			supabase,
			[
				{ student_id: STUDENT_A_ID, class_id: CLASS_ID },
				{ student_id: STUDENT_B_ID, class_id: CLASS_ID }
			],
			'then'
		); // class_members
		mockSuccess(
			supabase,
			[
				{ id: STUDENT_A_ID, firstname: 'Alice', lastname: 'Dupont', email: 'alice@example.com' },
				{ id: STUDENT_B_ID, firstname: 'Bob', lastname: 'Martin', email: 'bob@example.com' }
			],
			'then'
		); // profiles
		mockSuccess(
			supabase,
			[
				// Alice passed cp-1 on first try, failed cp-2 after 5 attempts with hint
				{
					user_id: STUDENT_A_ID,
					cell_id: 'cp-1',
					status: 'passed',
					attempt_count: 1,
					first_attempted_at: '2026-06-04T10:00:00Z',
					succeeded_at: '2026-06-04T10:00:00Z',
					hint_revealed: false
				},
				{
					user_id: STUDENT_A_ID,
					cell_id: 'cp-2',
					status: 'failed',
					attempt_count: 5,
					first_attempted_at: '2026-06-04T10:05:00Z',
					succeeded_at: null,
					hint_revealed: true
				},
				// Bob passed cp-1 only
				{
					user_id: STUDENT_B_ID,
					cell_id: 'cp-1',
					status: 'passed',
					attempt_count: 3,
					first_attempted_at: '2026-06-04T10:10:00Z',
					succeeded_at: '2026-06-04T10:13:00Z',
					hint_revealed: false
				}
			],
			'then'
		); // runs

		const locals = makeLocals({ id: AUTHOR_ID }, supabase);
		const result = (await load({ params: { id: NOTEBOOK_ID }, locals } as any)) as {
			rows: Array<{
				student: { id: string };
				details: Record<
					string,
					{
						status: 'passed' | 'failed';
						attemptCount: number;
						firstAttemptedAt: string | null;
						succeededAt: string | null;
						hintRevealed: boolean;
					}
				>;
			}>;
		};

		expect(result.rows).toHaveLength(2);
		const alice = result.rows.find((r) => r.student.id === STUDENT_A_ID);
		expect(alice?.details['cp-1']).toMatchObject({
			status: 'passed',
			attemptCount: 1,
			hintRevealed: false
		});
		expect(alice?.details['cp-2']).toMatchObject({
			status: 'failed',
			attemptCount: 5,
			hintRevealed: true
		});
		const bob = result.rows.find((r) => r.student.id === STUDENT_B_ID);
		expect(bob?.details['cp-1']).toMatchObject({
			status: 'passed',
			attemptCount: 3,
			hintRevealed: false
		});
	});

	it('accepts a teacher that has assigned the notebook (non-author)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockSuccess(supabase, notebookWithCheckpoints, 'maybeSingle'); // notebook (author is someone else)
		mockSuccess(supabase, [{ id: 'asn-1', class_id: CLASS_ID }], 'then'); // ownAssignments NOT empty
		mockSuccess(supabase, [{ id: CLASS_ID, name: 'Terminale NSI' }], 'then'); // teacherClasses
		// No class_members → empty rows but no 403
		mockSuccess(supabase, [], 'then');

		const locals = makeLocals({ id: OTHER_TEACHER_ID }, supabase);
		const result = (await load({ params: { id: NOTEBOOK_ID }, locals } as any)) as {
			notebook: { id: string };
			rows: unknown[];
		};

		expect(result.notebook.id).toBe(NOTEBOOK_ID);
		expect(result.rows).toEqual([]);
	});

	it('returns empty checkpoints array when the notebook has no checkpoint cells', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(
			supabase,
			{
				id: NOTEBOOK_ID,
				title: 'Notebook simple',
				author_id: AUTHOR_ID,
				content: {
					version: '1.0',
					metadata: {},
					cells: [
						{
							id: 'code-1',
							type: 'code',
							source: '',
							execution_count: null,
							outputs: [],
							state: 'idle'
						}
					]
				}
			},
			'maybeSingle'
		);
		mockSuccess(supabase, [], 'then'); // ownAssignments
		mockSuccess(supabase, [], 'then'); // teacherClasses

		const locals = makeLocals({ id: AUTHOR_ID }, supabase);
		const result = (await load({ params: { id: NOTEBOOK_ID }, locals } as any)) as {
			checkpoints: unknown[];
			rows: unknown[];
		};

		expect(result.checkpoints).toEqual([]);
		expect(result.rows).toEqual([]);
	});
});
