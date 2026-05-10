/**
 * GET /api/python-exercises/[id]/my-submissions — Tests
 * ======================================================
 *
 * The endpoint relies on RLS for visibility filtering. The handler itself
 * only enforces auth and pagination. These tests pin those behaviours down.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess, mockError } from '$tests/helpers';

const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';

const studentRows = [
	{
		id: 'sub-1',
		code: 'print(1)',
		validation_result: {
			valid: true,
			failed_layer: null,
			behavior_kind: 'output',
			test_results: [],
			execution_time_ms: 5
		},
		is_correct: true,
		attempt_number: 2,
		execution_time_ms: 5,
		created_at: '2026-05-09T10:00:00Z',
		assignment_id: null,
		student_id: STUDENT_ID
	},
	{
		id: 'sub-0',
		code: 'print(0)',
		validation_result: {
			valid: false,
			failed_layer: 'behavior',
			behavior_kind: 'output',
			test_results: [],
			execution_time_ms: 4
		},
		is_correct: false,
		attempt_number: 1,
		execution_time_ms: 4,
		created_at: '2026-05-09T09:00:00Z',
		assignment_id: null,
		student_id: STUDENT_ID
	}
];

function makeUrl(params: Record<string, string> = {}) {
	const url = new URL('http://localhost/api/python-exercises/x/my-submissions');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

describe('GET /api/python-exercises/[id]/my-submissions', () => {
	it('B8: returns the caller’s own submissions for an authenticated student', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, studentRows, 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { submissions: typeof studentRows };
		expect(data.submissions).toHaveLength(2);
		expect(data.submissions[0].id).toBe('sub-1');
	});

	it('B9: a teacher receives whatever RLS allows (mock returns all rows)', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		// Teacher view — RLS returns submissions across multiple students.
		const teacherRows = [
			...studentRows,
			{
				...studentRows[0],
				id: 'sub-2',
				student_id: '550e8400-e29b-41d4-a716-446655440099'
			}
		];
		mockSuccess(supabase, teacherRows, 'then');
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { submissions: typeof teacherRows };
		expect(data.submissions).toHaveLength(3);
	});

	it('B10: anonymous caller receives 401', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase); // no userId → anon

		await expect(
			GET({
				params: { id: EXERCISE_ID },
				locals,
				url: makeUrl()
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns an empty array when RLS filters everything out', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, [], 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { submissions: unknown[] };
		expect(data.submissions).toEqual([]);
	});

	it('returns 500 when Supabase errors out', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockError(supabase, 'connection broken', 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);

		await expect(
			GET({
				params: { id: EXERCISE_ID },
				locals,
				url: makeUrl()
			} as any)
		).rejects.toMatchObject({ status: 500 });
	});

	it('clamps limit to MAX_LIMIT', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, [], 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);

		await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl({ limit: '999' })
		} as any);

		// Verify the chain was called with limit() at most 50
		const limitCalls = (supabase._mockChain.limit as any).mock.calls;
		expect(limitCalls.length).toBeGreaterThan(0);
		expect(limitCalls[limitCalls.length - 1][0]).toBe(50);
	});
});
