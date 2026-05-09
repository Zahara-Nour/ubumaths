/**
 * +page.server.ts (my-progress) — load function tests.
 *
 * Builds a per-exercise dashboard for the LOGGED-IN STUDENT: every exo
 * the student has any trace on (submission, mastery row, or assignment
 * targeting them). Non-students are redirected away.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess } from 'tests/helpers';

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440000';
const CLASS_1 = '550e8400-e29b-41d4-a716-446655440020';
const EXO_A = '550e8400-e29b-41d4-a716-446655440030'; // submitted only
const EXO_B = '550e8400-e29b-41d4-a716-446655440031'; // assigned via class only
const EXO_C = '550e8400-e29b-41d4-a716-446655440032'; // submitted + directly assigned (dedupe)

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('my-progress load (auth)', () => {
	it('redirects unauthenticated to /auth/signin', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(load({ locals } as any)).rejects.toMatchObject({
			status: 303,
			location: '/auth/signin'
		});
	});

	it('redirects a teacher to /python-exercises/mine', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		const locals = createMockLocals(TEACHER_ID, supabase);

		await expect(load({ locals } as any)).rejects.toMatchObject({
			status: 303,
			location: '/python-exercises/mine'
		});
	});
});

describe('my-progress load (composition)', () => {
	it('lists exos the student submitted on, with last attempt + mastery', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		// my classes (none)
		mockSuccess(supabase, [], 'then');
		// my assignments (none)
		mockSuccess(supabase, [], 'then');
		// my submissions
		mockSuccess(
			supabase,
			[
				{
					exercise_id: EXO_A,
					is_correct: true,
					attempt_number: 2,
					created_at: '2026-05-09T11:00:00Z'
				},
				{
					exercise_id: EXO_A,
					is_correct: false,
					attempt_number: 1,
					created_at: '2026-05-09T10:00:00Z'
				}
			],
			'then'
		);
		// my mastery
		mockSuccess(supabase, [{ exercise_id: EXO_A, status: 'mastered' }], 'then');
		// fetch exo details
		mockSuccess(supabase, [{ id: EXO_A, title: 'Boucles', level: 'lycee' }], 'then');

		const locals = createMockLocals(STUDENT_ID, supabase);

		const result = await load({ locals } as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]).toMatchObject({
			exercise: { id: EXO_A, title: 'Boucles', level: 'lycee' },
			mastery_status: 'mastered',
			total_attempts: 2,
			last_attempt_at: '2026-05-09T11:00:00Z',
			last_attempt_correct: true
		});
	});

	it('lists exos assigned via the student class even with no submission', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		// my classes
		mockSuccess(supabase, [{ class_id: CLASS_1 }], 'then');
		// my assignments — 1 class assignment on EXO_B
		mockSuccess(
			supabase,
			[{ id: 'a1', exercise_id: EXO_B, class_id: CLASS_1, student_id: null }],
			'then'
		);
		// no submissions
		mockSuccess(supabase, [], 'then');
		// no mastery
		mockSuccess(supabase, [], 'then');
		// exo details
		mockSuccess(supabase, [{ id: EXO_B, title: 'Listes', level: 'college' }], 'then');

		const locals = createMockLocals(STUDENT_ID, supabase);

		const result = await load({ locals } as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]).toMatchObject({
			exercise: { id: EXO_B },
			mastery_status: 'not_started',
			total_attempts: 0,
			last_attempt_at: null,
			last_attempt_correct: null
		});
	});

	it('deduplicates an exo that is both submitted and directly assigned', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		mockSuccess(supabase, [], 'then');
		// directly assigned
		mockSuccess(
			supabase,
			[{ id: 'a1', exercise_id: EXO_C, class_id: null, student_id: STUDENT_ID }],
			'then'
		);
		// also submitted
		mockSuccess(
			supabase,
			[
				{
					exercise_id: EXO_C,
					is_correct: true,
					attempt_number: 1,
					created_at: '2026-05-09T11:00:00Z'
				}
			],
			'then'
		);
		mockSuccess(supabase, [{ exercise_id: EXO_C, status: 'mastered' }], 'then');
		mockSuccess(supabase, [{ id: EXO_C, title: 'Récursion', level: 'lycee' }], 'then');

		const locals = createMockLocals(STUDENT_ID, supabase);

		const result = await load({ locals } as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].exercise.id).toBe(EXO_C);
	});

	it('maps a needs_review mastery row to the needs_review status', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		mockSuccess(supabase, [], 'then');
		mockSuccess(supabase, [], 'then');
		mockSuccess(
			supabase,
			[
				{
					exercise_id: EXO_A,
					is_correct: false,
					attempt_number: 1,
					created_at: '2026-05-09T10:00:00Z'
				}
			],
			'then'
		);
		mockSuccess(supabase, [{ exercise_id: EXO_A, status: 'needs_review' }], 'then');
		mockSuccess(supabase, [{ id: EXO_A, title: 'X', level: 'lycee' }], 'then');

		const locals = createMockLocals(STUDENT_ID, supabase);

		const result = await load({ locals } as any);

		expect(result.rows[0].mastery_status).toBe('needs_review');
	});

	it('returns empty rows when the student has no trace at all', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		mockSuccess(supabase, [], 'then'); // no classes
		mockSuccess(supabase, [], 'then'); // no assignments
		mockSuccess(supabase, [], 'then'); // no submissions
		mockSuccess(supabase, [], 'then'); // no mastery
		// exo details lookup is skipped when union is empty

		const locals = createMockLocals(STUDENT_ID, supabase);

		const result = await load({ locals } as any);

		expect(result.rows).toEqual([]);
	});
});
