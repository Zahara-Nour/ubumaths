/**
 * GET /api/python-exercises/mastery — Tests
 * ==========================================
 *
 * RLS does the visibility filtering on python_exercise_mastery; the handler
 * only enforces auth and pagination. These tests pin the contract.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess, mockError } from '$tests/helpers';

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';
const OTHER_STUDENT_ID = '550e8400-e29b-41d4-a716-446655440099';

const studentRows = [
	{
		exercise_id: '550e8400-e29b-41d4-a716-446655440003',
		status: 'mastered',
		updated_at: '2026-05-09T10:00:00Z'
	},
	{
		exercise_id: '550e8400-e29b-41d4-a716-446655440004',
		status: 'needs_review',
		updated_at: '2026-05-09T09:00:00Z'
	}
];

function makeUrl(params: Record<string, string> = {}) {
	const url = new URL('http://localhost/api/python-exercises/mastery');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

describe('GET /api/python-exercises/mastery', () => {
	it('returns 401 when not authenticated', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(GET({ locals, url: makeUrl() } as any)).rejects.toMatchObject({ status: 401 });
	});

	it('returns 400 when limit is out of range', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(GET({ locals, url: makeUrl({ limit: '999' }) } as any)).rejects.toMatchObject({
			status: 400
		});
	});

	it('student auth: returns own mastery rows', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentRows, 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await GET({ locals, url: makeUrl() } as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { mastery: typeof studentRows };
		expect(data.mastery).toHaveLength(2);
		expect(data.mastery[0].status).toBe('mastered');
	});

	it('teacher auth + ?student_id=X: RLS allows → rows returned', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentRows, 'then');
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({
			locals,
			url: makeUrl({ student_id: STUDENT_ID })
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { mastery: unknown[] };
		expect(data.mastery).toHaveLength(2);
	});

	it('teacher auth + ?student_id=X: RLS filters → empty array', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, [], 'then');
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({
			locals,
			url: makeUrl({ student_id: OTHER_STUDENT_ID })
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { mastery: unknown[] };
		expect(data.mastery).toEqual([]);
	});

	it('returns 500 when Supabase errors out', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockError(supabase, 'connection broken', 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(GET({ locals, url: makeUrl() } as any)).rejects.toMatchObject({ status: 500 });
	});
});
