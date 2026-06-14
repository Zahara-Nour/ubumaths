/**
 * GET /api/python-exercises/[id]/results — Tests
 * ===============================================
 *
 * Teacher-only endpoint that aggregates student submissions on an exercise.
 * Tests cover auth/role gates and the high-level happy path. The aggregation
 * details (best_attempt, latest_attempt) are exercised end-to-end with a
 * single multi-submission scenario rather than per-branch.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess, mockError } from '$tests/helpers';

const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';
const OTHER_TEACHER_ID = '550e8400-e29b-41d4-a716-446655440012';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440030';

function makeUrl(params: Record<string, string> = {}) {
	const url = new URL('http://localhost/api/python-exercises/x/results');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

describe('GET /api/python-exercises/[id]/results', () => {
	it('returns 401 when not authenticated', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(
			GET({ params: { id: EXERCISE_ID }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 400 when id is not a UUID', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			GET({ params: { id: 'not-a-uuid' }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('returns 403 when caller is not a teacher', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			GET({ params: { id: EXERCISE_ID }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 404 when exercise does not exist', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockError(supabase, 'not found', 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			GET({ params: { id: EXERCISE_ID }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when teacher is not the author and has no assignments', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: OTHER_TEACHER_ID }, 'single');
		mockSuccess(supabase, [], 'then'); // assignments
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			GET({ params: { id: EXERCISE_ID }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('class filter: empty class members → empty results array', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockSuccess(supabase, { author_id: TEACHER_ID }, 'single'); // exercise (own)
		mockSuccess(supabase, [], 'then'); // assignments check (passes because author)
		mockSuccess(supabase, [], 'then'); // class_members
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl({ class_id: CLASS_ID })
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { results: unknown[] };
		expect(data.results).toEqual([]);
	});

	it('no class filter, teacher has no classes → empty results', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: TEACHER_ID }, 'single');
		mockSuccess(supabase, [], 'then'); // assignments check
		mockSuccess(supabase, [], 'then'); // teacher_classes
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { results: unknown[] };
		expect(data.results).toEqual([]);
	});

	it('happy path: aggregates student stats from submissions', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockSuccess(supabase, { author_id: TEACHER_ID }, 'single'); // exercise
		mockSuccess(supabase, [], 'then'); // assignments check
		mockSuccess(supabase, [{ id: CLASS_ID }], 'then'); // teacher_classes
		mockSuccess(supabase, [{ student_id: STUDENT_ID }], 'then'); // class_members
		// Final query: submissions
		const studentInfo = {
			id: STUDENT_ID,
			first_name: 'Alice',
			last_name: 'Test',
			email: 'a@t.fr'
		};
		mockSuccess(
			supabase,
			[
				{
					id: 'sub-2',
					student: studentInfo,
					code: 'ok',
					validation_result: { valid: true },
					is_correct: true,
					attempt_number: 2,
					execution_time_ms: 5,
					created_at: '2026-05-09T11:00:00Z',
					assignment: null
				},
				{
					id: 'sub-1',
					student: studentInfo,
					code: 'ko',
					validation_result: { valid: false },
					is_correct: false,
					attempt_number: 1,
					execution_time_ms: 4,
					created_at: '2026-05-09T10:00:00Z',
					assignment: null
				}
			],
			'then'
		);
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			results: unknown[];
			summary: Array<{
				student: { id: string };
				total_attempts: number;
				successful_attempts: number;
				best_attempt: { id: string };
				latest_attempt: { id: string };
			}>;
		};
		expect(data.results).toHaveLength(2);
		expect(data.summary).toHaveLength(1);
		expect(data.summary[0].total_attempts).toBe(2);
		expect(data.summary[0].successful_attempts).toBe(1);
		expect(data.summary[0].best_attempt.id).toBe('sub-2');
		expect(data.summary[0].latest_attempt.id).toBe('sub-2');
	});
});
