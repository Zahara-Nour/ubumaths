/**
 * +page.server.ts (per-student cross-exos) — load function tests.
 *
 * Lists the exercises that interest THIS teacher about THIS student:
 *   - exos I assigned (directly or via a class the student belongs to)
 *   - exos I authored on which the student has submitted
 *
 * Auth: teacher only, plus scope check (student must be in one of my
 * active classes OR I must have at least one direct assignment to them).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess } from 'tests/helpers';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440000';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_OUT = '550e8400-e29b-41d4-a716-446655440099';
const CLASS_1 = '550e8400-e29b-41d4-a716-446655440020';
const EXO_A = '550e8400-e29b-41d4-a716-446655440030'; // I authored, student submitted
const EXO_B = '550e8400-e29b-41d4-a716-446655440031'; // I assigned via class
const EXO_C = '550e8400-e29b-41d4-a716-446655440032'; // I assigned directly + I authored (dedupe)

const studentProfile = {
	id: STUDENT_ID,
	firstname: 'Alice',
	lastname: 'Aubert',
	email: 'alice@example.com'
};

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('per-student load (auth)', () => {
	it('redirects unauthenticated to /auth/signin', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(load({ params: { student_id: STUDENT_ID }, locals } as any)).rejects.toMatchObject(
			{ status: 303, location: '/auth/signin' }
		);
	});

	it('redirects non-teacher to /dashboard', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		const locals = createMockLocals(STUDENT_ID, supabase);

		await expect(load({ params: { student_id: STUDENT_ID }, locals } as any)).rejects.toMatchObject(
			{ status: 303, location: '/dashboard' }
		);
	});

	it('returns 404 when student profile is missing', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, null); // student profile not found
		const locals = createMockLocals(TEACHER_ID, supabase);

		await expect(load({ params: { student_id: STUDENT_ID }, locals } as any)).rejects.toMatchObject(
			{ status: 404 }
		);
	});
});

describe('per-student load (scope)', () => {
	it('returns 403 when student is in no class of mine and I never assigned them anything', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, studentProfile);
		// my classes
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		// class_members of my classes — STUDENT_OUT not present
		mockSuccess(supabase, [], 'then');
		// my direct assignments to this student — none
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(TEACHER_ID, supabase);

		await expect(
			load({ params: { student_id: STUDENT_OUT }, locals } as any)
		).rejects.toMatchObject({ status: 403 });
	});
});

describe('per-student load (composition)', () => {
	it('lists exos I authored on which the student submitted', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, studentProfile);
		// my classes
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		// class_members of my classes — student is in scope
		mockSuccess(supabase, [{ student_id: STUDENT_ID, class_id: CLASS_1 }], 'then');
		// my direct assignments to this student — none
		mockSuccess(supabase, [], 'then');
		// my class assignments touching this student (none assigned via class)
		mockSuccess(supabase, [], 'then');
		// student's submissions (all exos)
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
		// my exos among the submitted exo ids
		mockSuccess(
			supabase,
			[{ id: EXO_A, title: 'Boucles for', level: 'lycee', author_id: TEACHER_ID }],
			'then'
		);
		// mastery for the union
		mockSuccess(supabase, [{ exercise_id: EXO_A, status: 'mastered' }], 'then');

		const locals = createMockLocals(TEACHER_ID, supabase);

		const result = await load({ params: { student_id: STUDENT_ID }, locals } as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]).toMatchObject({
			exercise: { id: EXO_A, title: 'Boucles for', level: 'lycee' },
			mastery_status: 'mastered',
			total_attempts: 2,
			last_attempt_at: '2026-05-09T11:00:00Z',
			last_attempt_correct: true
		});
	});

	it('lists exos I assigned (directly or via class) even without my authorship', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, studentProfile);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_ID, class_id: CLASS_1 }], 'then');
		// my direct assignments to this student
		mockSuccess(supabase, [{ id: 'a-direct', exercise_id: EXO_C }], 'then');
		// my class assignments touching this student
		mockSuccess(supabase, [{ id: 'a-class', exercise_id: EXO_B, class_id: CLASS_1 }], 'then');
		// student's submissions — none on these exos
		mockSuccess(supabase, [], 'then');
		// (impl skips the "authored among submitted" lookup when submissions is empty)
		// fetch full exercise rows for the assigned union (EXO_B + EXO_C)
		mockSuccess(
			supabase,
			[
				{ id: EXO_B, title: 'Listes', level: 'college', author_id: 'someone-else' },
				{ id: EXO_C, title: 'Récursion', level: 'lycee', author_id: TEACHER_ID }
			],
			'then'
		);
		// mastery
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(TEACHER_ID, supabase);

		const result = await load({ params: { student_id: STUDENT_ID }, locals } as any);

		expect(result.rows.map((r: any) => r.exercise.id).sort()).toEqual([EXO_B, EXO_C].sort());
		// assigned but never tried → not_started
		expect(result.rows.find((r: any) => r.exercise.id === EXO_B).mastery_status).toBe(
			'not_started'
		);
	});

	it('deduplicates an exo that is both authored-and-submitted and assigned by me', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, studentProfile);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_ID, class_id: CLASS_1 }], 'then');
		// EXO_C: directly assigned
		mockSuccess(supabase, [{ id: 'a1', exercise_id: EXO_C }], 'then');
		// no class assignments
		mockSuccess(supabase, [], 'then');
		// EXO_C also has submissions
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
		// EXO_C authored by me
		mockSuccess(
			supabase,
			[{ id: EXO_C, title: 'Récursion', level: 'lycee', author_id: TEACHER_ID }],
			'then'
		);
		// fetch full rows for union (EXO_C only)
		mockSuccess(
			supabase,
			[{ id: EXO_C, title: 'Récursion', level: 'lycee', author_id: TEACHER_ID }],
			'then'
		);
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(TEACHER_ID, supabase);

		const result = await load({ params: { student_id: STUDENT_ID }, locals } as any);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].exercise.id).toBe(EXO_C);
	});

	it('returns empty rows when student is in scope but no exo is relevant', async () => {
		const { load } = await import('../+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, studentProfile);
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_ID, class_id: CLASS_1 }], 'then');
		mockSuccess(supabase, [], 'then'); // no direct assignments
		mockSuccess(supabase, [], 'then'); // no class assignments
		mockSuccess(supabase, [], 'then'); // no submissions
		// Authored exos lookup is skipped when no submissions, but we mock anyway
		// to be defensive against impl changes.
		mockSuccess(supabase, [], 'then');
		mockSuccess(supabase, [], 'then'); // mastery

		const locals = createMockLocals(TEACHER_ID, supabase);

		const result = await load({ params: { student_id: STUDENT_ID }, locals } as any);

		expect(result.rows).toEqual([]);
		expect(result.student.id).toBe(STUDENT_ID);
	});
});
