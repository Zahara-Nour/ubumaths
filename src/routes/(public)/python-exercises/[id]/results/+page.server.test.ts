/**
 * +page.server.ts (results) — load function tests.
 *
 * Verifies auth/access guards and the multi-source merge that produces
 * `StudentRow[]` for the teacher dashboard:
 *   - assignments (class or direct)
 *   - class_members of teacher's classes
 *   - submissions (per student, sorted desc by created_at)
 *   - mastery (sticky 'mastered' or 'needs_review'; absence = not_started)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess } from 'tests/helpers';

const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const AUTHOR_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_TEACHER_ID = '550e8400-e29b-41d4-a716-446655440002';
const STUDENT_A = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_B = '550e8400-e29b-41d4-a716-446655440011';
const STUDENT_C = '550e8400-e29b-41d4-a716-446655440012';
const CLASS_1 = '550e8400-e29b-41d4-a716-446655440020';
const CLASS_2 = '550e8400-e29b-41d4-a716-446655440021';

const studentAProfile = {
	id: STUDENT_A,
	firstname: 'Alice',
	lastname: 'Aubert',
	email: 'alice@example.com'
};
const studentBProfile = {
	id: STUDENT_B,
	firstname: 'Bob',
	lastname: 'Bernard',
	email: 'bob@example.com'
};
const studentCProfile = {
	id: STUDENT_C,
	firstname: 'Chloé',
	lastname: 'Crouzet',
	email: 'chloe@example.com'
};

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('load (auth/access)', () => {
	it('redirects to /auth/signin when no user is authenticated', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/auth/signin' });
	});

	it('redirects non-teachers to /dashboard', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }); // profile lookup

		const locals = createMockLocals(STUDENT_A, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/dashboard' });
	});

	it('returns 404 when exercise does not exist', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }); // profile
		mockSuccess(supabase, null); // exercise lookup → not found

		const locals = createMockLocals(OTHER_TEACHER_ID, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('grants access to a non-author teacher who has assigned the exercise himself', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'Loops', author_id: AUTHOR_ID });
		// non-author teacher HAS assigned this exo
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_A, class_id: CLASS_1 }], 'then');
		mockSuccess(supabase, [studentAProfile], 'then');
		mockSuccess(supabase, [], 'then');
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(OTHER_TEACHER_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.exercise).toMatchObject({ id: EXERCISE_ID });
		expect(result.rows).toHaveLength(1);
	});

	it('returns 403 when teacher is neither author nor has assigned the exercise', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }); // profile
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'Test', author_id: AUTHOR_ID }); // exercise
		// own assignments query (await query, not .single)
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(OTHER_TEACHER_ID, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});
});

describe('load (merge logic)', () => {
	it('returns a row for an assigned student with no submissions (mastery=not_started)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		// 1. profile (role)
		mockSuccess(supabase, { role: 'teacher' });
		// 2. exercise
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'Loop basics', author_id: AUTHOR_ID });
		// 3. own assignments by this teacher (he is the author)
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		// 4. teacher classes
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		// 5. class members
		mockSuccess(supabase, [{ student_id: STUDENT_A, class_id: CLASS_1 }], 'then');
		// 6. profiles for student ids
		mockSuccess(supabase, [studentAProfile], 'then');
		// 7. submissions
		mockSuccess(supabase, [], 'then');
		// 8. mastery
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]).toMatchObject({
			student: { id: STUDENT_A },
			mastery_status: 'not_started',
			total_attempts: 0,
			last_attempt_at: null,
			last_attempt_correct: null
		});
	});

	it('marks a student with submissions but no mastery row as in_progress', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_A, class_id: CLASS_1 }], 'then');
		mockSuccess(supabase, [studentAProfile], 'then');
		mockSuccess(
			supabase,
			[
				{
					student_id: STUDENT_A,
					is_correct: false,
					attempt_number: 2,
					created_at: '2026-05-09T10:00:00Z'
				},
				{
					student_id: STUDENT_A,
					is_correct: false,
					attempt_number: 1,
					created_at: '2026-05-09T09:00:00Z'
				}
			],
			'then'
		);
		mockSuccess(supabase, [], 'then'); // no mastery row

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows[0]).toMatchObject({
			mastery_status: 'in_progress',
			total_attempts: 2,
			last_attempt_at: '2026-05-09T10:00:00Z',
			last_attempt_correct: false
		});
	});

	it('marks a student with mastery=needs_review and no submissions as in_progress', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_A, class_id: CLASS_1 }], 'then');
		mockSuccess(supabase, [studentAProfile], 'then');
		mockSuccess(supabase, [], 'then'); // no submissions visible (e.g. RLS / cleanup)
		mockSuccess(supabase, [{ student_id: STUDENT_A, status: 'needs_review' }], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows[0].mastery_status).toBe('in_progress');
		expect(result.rows[0].total_attempts).toBe(0);
	});

	it('marks a student with mastery=mastered as mastered regardless of last attempt', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_A, class_id: CLASS_1 }], 'then');
		mockSuccess(supabase, [studentAProfile], 'then');
		mockSuccess(
			supabase,
			[
				{
					student_id: STUDENT_A,
					is_correct: false,
					attempt_number: 3,
					created_at: '2026-05-09T11:00:00Z'
				}
			],
			'then'
		);
		mockSuccess(supabase, [{ student_id: STUDENT_A, status: 'mastered' }], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows[0].mastery_status).toBe('mastered');
	});

	it('deduplicates a student who is in two of the teacher classes', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(
			supabase,
			[
				{ id: CLASS_1, name: '6e A' },
				{ id: CLASS_2, name: '6e B' }
			],
			'then'
		);
		mockSuccess(
			supabase,
			[
				{ student_id: STUDENT_A, class_id: CLASS_1 },
				{ student_id: STUDENT_A, class_id: CLASS_2 } // same student in both classes
			],
			'then'
		);
		mockSuccess(supabase, [studentAProfile], 'then');
		mockSuccess(supabase, [], 'then'); // no submissions
		mockSuccess(supabase, [], 'then'); // no mastery

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].student.id).toBe(STUDENT_A);
	});

	it('includes a student assigned directly via student_id (no class assignment)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: null, student_id: STUDENT_C, due_date: null }],
			'then'
		);
		mockSuccess(supabase, [], 'then'); // teacher has no classes
		// class_members NOT queried when teacher has no classes (load skips the call)
		mockSuccess(supabase, [studentCProfile], 'then');
		mockSuccess(supabase, [], 'then'); // no submissions
		mockSuccess(supabase, [], 'then'); // no mastery

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows.map((r: any) => r.student.id)).toEqual([STUDENT_C]);
	});

	it('ignores submissions from students who are not in any of the teacher classes (free practice not in scope)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_A, class_id: CLASS_1 }], 'then');
		// profiles lookup: only STUDENT_A is in scope. STUDENT_B is a free-practice
		// random user — never appears in the merge.
		mockSuccess(supabase, [studentAProfile], 'then');
		// submissions are queried with .in('student_id', [STUDENT_A]) so STUDENT_B's
		// rows are filtered out at the DB level. The mock returns only STUDENT_A's.
		mockSuccess(supabase, [], 'then');
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].student.id).toBe(STUDENT_A);
		// STUDENT_B (free-practice) explicitly excluded
		expect(result.rows.map((r: any) => r.student.id)).not.toContain(STUDENT_B);
	});

	it('returns empty rows when the author has no classes and no direct assignments (short-circuit)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(supabase, [], 'then'); // own assignments — empty (no class, no direct)
		mockSuccess(supabase, [], 'then'); // teacher classes — empty
		// class_members + profiles + submissions + mastery NOT queried (short-circuit)

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.rows).toEqual([]);
		expect(result.teacherClasses).toEqual([]);
	});

	it('returns the exercise + teacherClasses payload alongside rows', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'Loops', author_id: AUTHOR_ID });
		mockSuccess(
			supabase,
			[{ id: 'a1', class_id: CLASS_1, student_id: null, due_date: null }],
			'then'
		);
		mockSuccess(
			supabase,
			[
				{ id: CLASS_1, name: '6e A' },
				{ id: CLASS_2, name: '6e B' }
			],
			'then'
		);
		mockSuccess(supabase, [{ student_id: STUDENT_B, class_id: CLASS_1 }], 'then');
		mockSuccess(supabase, [studentBProfile], 'then');
		mockSuccess(supabase, [], 'then');
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(result.exercise).toMatchObject({ id: EXERCISE_ID, title: 'Loops' });
		expect(result.teacherClasses).toEqual([
			{ id: CLASS_1, name: '6e A' },
			{ id: CLASS_2, name: '6e B' }
		]);
	});
});
