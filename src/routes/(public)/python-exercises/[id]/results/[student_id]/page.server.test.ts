/**
 * +page.server.ts (drill-down) — load function tests.
 *
 * Same auth gates as the parent /results page, plus a scope check: the
 * student_id requested must be a member of one of the teacher's active
 * classes OR have been assigned this exercise directly by this teacher.
 * Otherwise the load returns 403 — we won't leak submissions of arbitrary
 * students to a teacher who happens to be the exercise's author.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess } from 'tests/helpers';

const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const AUTHOR_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_TEACHER_ID = '550e8400-e29b-41d4-a716-446655440002';
const STUDENT_IN_SCOPE = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_OUT_OF_SCOPE = '550e8400-e29b-41d4-a716-446655440099';
const CLASS_1 = '550e8400-e29b-41d4-a716-446655440020';

const studentProfile = {
	id: STUDENT_IN_SCOPE,
	firstname: 'Alice',
	lastname: 'Aubert',
	email: 'alice@example.com'
};

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('drill-down load (auth)', () => {
	it('redirects unauthenticated user to /auth/signin', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
				locals
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/auth/signin' });
	});

	it('redirects non-teacher to /dashboard', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' });
		const locals = createMockLocals(STUDENT_IN_SCOPE, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
				locals
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/dashboard' });
	});

	it('returns 404 when the exercise does not exist', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, null);
		const locals = createMockLocals(AUTHOR_ID, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
				locals
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when the teacher is neither author nor has assigned the exercise', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(supabase, [], 'then'); // own assignments empty

		const locals = createMockLocals(OTHER_TEACHER_ID, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
				locals
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});
});

describe('drill-down load (scope check)', () => {
	it('returns 403 when the requested student is not in the teacher scope', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		// teacher is the author, so authz passes regardless of own assignments
		mockSuccess(supabase, [], 'then');
		// teacher classes
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		// class members → only STUDENT_IN_SCOPE; STUDENT_OUT_OF_SCOPE not listed
		mockSuccess(supabase, [{ student_id: STUDENT_IN_SCOPE }], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		await expect(
			load({
				params: { id: EXERCISE_ID, student_id: STUDENT_OUT_OF_SCOPE },
				locals
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('grants access when the student is in one of the teacher classes', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'Loops', author_id: AUTHOR_ID });
		mockSuccess(supabase, [{ id: 'a1', class_id: CLASS_1, student_id: null }], 'then');
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_IN_SCOPE }], 'then');
		// student profile
		mockSuccess(supabase, studentProfile);
		// submissions: empty
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
			locals
		} as any);

		expect(result.student.id).toBe(STUDENT_IN_SCOPE);
		expect(result.exercise.title).toBe('Loops');
		expect(result.submissions).toEqual([]);
	});

	it('grants access when the student was assigned directly (no class)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(supabase, [{ id: 'a1', class_id: null, student_id: STUDENT_IN_SCOPE }], 'then');
		// teacher has no classes
		mockSuccess(supabase, [], 'then');
		// class_members not queried (no teacher classes)
		mockSuccess(supabase, studentProfile);
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
			locals
		} as any);

		expect(result.student.id).toBe(STUDENT_IN_SCOPE);
	});
});

describe('drill-down load (data)', () => {
	it('returns submissions sorted desc by created_at with full payload (code + validation_result)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(supabase, [{ id: 'a1', class_id: CLASS_1, student_id: null }], 'then');
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_IN_SCOPE }], 'then');
		mockSuccess(supabase, studentProfile);
		mockSuccess(
			supabase,
			[
				{
					id: 's2',
					code: 'print("v2")',
					validation_result: { valid: true, failed_layer: null, behavior_kind: 'output' },
					is_correct: true,
					attempt_number: 2,
					assignment_id: 'a1',
					execution_time_ms: 12,
					created_at: '2026-05-09T11:00:00Z'
				},
				{
					id: 's1',
					code: 'print("v1")',
					validation_result: { valid: false, failed_layer: 'behavior', behavior_kind: 'output' },
					is_correct: false,
					attempt_number: 1,
					assignment_id: 'a1',
					execution_time_ms: 10,
					created_at: '2026-05-09T10:00:00Z'
				}
			],
			'then'
		);

		const locals = createMockLocals(AUTHOR_ID, supabase);

		const result = await load({
			params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
			locals
		} as any);

		expect(result.submissions).toHaveLength(2);
		expect(result.submissions[0]).toMatchObject({
			id: 's2',
			code: 'print("v2")',
			is_correct: true,
			attempt_number: 2
		});
		expect(result.submissions[1].id).toBe('s1');
	});

	it('caps the submissions list at 50 (LIMIT clause)', async () => {
		const { load } = await import('./+page.server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' });
		mockSuccess(supabase, { id: EXERCISE_ID, title: 'X', author_id: AUTHOR_ID });
		mockSuccess(supabase, [{ id: 'a1', class_id: CLASS_1, student_id: null }], 'then');
		mockSuccess(supabase, [{ id: CLASS_1, name: '6e A' }], 'then');
		mockSuccess(supabase, [{ student_id: STUDENT_IN_SCOPE }], 'then');
		mockSuccess(supabase, studentProfile);
		mockSuccess(supabase, [], 'then');

		const locals = createMockLocals(AUTHOR_ID, supabase);

		await load({
			params: { id: EXERCISE_ID, student_id: STUDENT_IN_SCOPE },
			locals
		} as any);

		// The .limit(50) call must have been made on the chain
		expect(supabase._mockChain.limit).toHaveBeenCalledWith(50);
	});
});
