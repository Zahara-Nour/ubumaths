/**
 * GET /api/python-exercises/[id]/mastery — Tests
 * ===============================================
 *
 * Returns { status: 'mastered' | 'needs_review' | null } for the caller (or
 * a specific student via ?student_id=X). RLS handles visibility.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess, mockError } from '$tests/helpers';

const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';

function makeUrl(params: Record<string, string> = {}) {
	const url = new URL('http://localhost/api/python-exercises/x/mastery');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

describe('GET /api/python-exercises/[id]/mastery', () => {
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
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			GET({ params: { id: 'not-a-uuid' }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when student_id query is not a UUID', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			GET({
				params: { id: EXERCISE_ID },
				locals,
				url: makeUrl({ student_id: 'bogus' })
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('student auth + existing row: returns the status', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { status: 'mastered' }, 'maybeSingle');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { status: string };
		expect(data.status).toBe('mastered');
	});

	it('student auth + no row: returns null', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, null, 'maybeSingle');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals,
			url: makeUrl()
		} as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { status: null };
		expect(data.status).toBeNull();
	});

	it('returns 500 when Supabase errors out', async () => {
		const { GET } = await import('../+server');
		const supabase = createMockSupabase();
		mockError(supabase, 'connection broken', 'maybeSingle');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			GET({ params: { id: EXERCISE_ID }, locals, url: makeUrl() } as any)
		).rejects.toMatchObject({ status: 500 });
	});
});
