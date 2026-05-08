/**
 * GET /api/python-exercises/[id] — Tests
 * =======================================
 *
 * Verifies the visibility / strip behavior of the GET endpoint after the
 * 20260508125858_python_exercises_public_anon migration:
 *
 *   - anon access to a public exercise → 200, solution_code stripped
 *   - any caller, RLS-filtered row (returns null) → 404
 *   - authenticated non-author + public → 200, solution_code stripped
 *   - authenticated author → 200, full exercise (solution_code included)
 *   - Supabase error → 500
 *
 * RLS does the row-visibility filtering; this endpoint is responsible for
 * stripping the `solution_code` column for any caller who is not the author.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals, mockSuccess, mockError } from '$tests/helpers';

const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const AUTHOR_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

const fullExercise = {
	id: EXERCISE_ID,
	title: 'Add two numbers',
	description: 'Easy warm-up',
	instructions: '# Write add(a, b)',
	starter_code: 'def add(a, b):\n    pass\n',
	solution_code: 'def add(a, b):\n    return a + b\n',
	validation_config: {
		type: 'unit_test',
		function_name: 'add',
		test_cases: [{ args: [1, 2], expected: 3 }]
	},
	level: 'lycee',
	tags: ['arithmetic'],
	author_id: AUTHOR_ID,
	is_public: true,
	created_at: '2026-05-08T12:00:00Z',
	updated_at: '2026-05-08T12:00:00Z'
};

describe('GET /api/python-exercises/[id]', () => {
	it('returns the exercise without solution_code for an anonymous caller', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, fullExercise, 'maybeSingle');
		const locals = createMockLocals(undefined, supabase); // no userId → anon

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { exercise: Record<string, unknown> };
		expect(data.exercise.id).toBe(EXERCISE_ID);
		expect(data.exercise.title).toBe('Add two numbers');
		expect(data.exercise.starter_code).toBeDefined();
		expect(data.exercise.solution_code).toBeUndefined();
	});

	it('returns 404 when RLS filters out the row (maybeSingle returns null)', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, null, 'maybeSingle');
		const locals = createMockLocals(undefined, supabase);

		await expect(
			GET({
				params: { id: EXERCISE_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('strips solution_code for an authenticated non-author', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, fullExercise, 'maybeSingle');
		const locals = createMockLocals(OTHER_USER_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { exercise: Record<string, unknown> };
		expect(data.exercise.solution_code).toBeUndefined();
	});

	it('returns the full exercise (including solution_code) for the author', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, fullExercise, 'maybeSingle');
		const locals = createMockLocals(AUTHOR_ID, supabase);

		const response = await GET({
			params: { id: EXERCISE_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { exercise: Record<string, unknown> };
		expect(data.exercise.solution_code).toBe(fullExercise.solution_code);
	});

	it('returns 500 when Supabase returns an error', async () => {
		const { GET } = await import('./+server');

		const supabase = createMockSupabase();
		mockError(supabase, 'connection broken', 'maybeSingle');
		const locals = createMockLocals(undefined, supabase);

		await expect(
			GET({
				params: { id: EXERCISE_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 500 });
	});
});
