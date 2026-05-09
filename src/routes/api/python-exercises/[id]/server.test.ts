/**
 * GET / PUT / DELETE /api/python-exercises/[id] — Tests
 * ======================================================
 *
 * GET   — visibility/strip rules (RLS for row, strip solution_code for non-author).
 * PUT   — author-only update with Zod validation.
 * DELETE — author-only deletion (CASCADE handles assignments + submissions).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	mockSuccess,
	mockError
} from '$tests/helpers';

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

describe('PUT /api/python-exercises/[id]', () => {
	const validUpdate = { title: 'Updated title' };

	it('returns 401 when not authenticated', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(
			PUT({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(validUpdate)
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when caller is not a teacher', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single');
		const locals = createMockLocals(OTHER_USER_ID, supabase);
		await expect(
			PUT({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(validUpdate)
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 404 when exercise does not exist', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockError(supabase, 'not found', 'single'); // existing exercise lookup
		const locals = createMockLocals(AUTHOR_ID, supabase);
		await expect(
			PUT({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(validUpdate)
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when caller is teacher but not the author', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single'); // belongs to someone else
		const locals = createMockLocals(OTHER_USER_ID, supabase);
		await expect(
			PUT({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(validUpdate)
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 400 when payload is malformed (Zod fail)', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single');
		const locals = createMockLocals(AUTHOR_ID, supabase);
		// title is too long (> TITLE_MAX = 200)
		const tooLong = { title: 'x'.repeat(300) };
		await expect(
			PUT({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(tooLong)
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('updates and returns the new row when caller is the author', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single');
		mockSuccess(supabase, { ...fullExercise, title: 'Updated title' }, 'single'); // update returning
		const locals = createMockLocals(AUTHOR_ID, supabase);

		const response = await PUT({
			params: { id: EXERCISE_ID },
			locals,
			request: createMockRequest(validUpdate)
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { exercise: { title: string } };
		expect(data.exercise.title).toBe('Updated title');
	});

	it('returns 500 when Supabase update fails', async () => {
		const { PUT } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single');
		mockError(supabase, 'db down', 'single');
		const locals = createMockLocals(AUTHOR_ID, supabase);
		await expect(
			PUT({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(validUpdate)
			} as any)
		).rejects.toMatchObject({ status: 500 });
	});
});

describe('DELETE /api/python-exercises/[id]', () => {
	it('returns 401 when not authenticated', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(DELETE({ params: { id: EXERCISE_ID }, locals } as any)).rejects.toMatchObject({
			status: 401
		});
	});

	it('returns 403 when caller is not a teacher', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single');
		const locals = createMockLocals(OTHER_USER_ID, supabase);
		await expect(DELETE({ params: { id: EXERCISE_ID }, locals } as any)).rejects.toMatchObject({
			status: 403
		});
	});

	it('returns 404 when exercise does not exist', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockError(supabase, 'not found', 'single');
		const locals = createMockLocals(AUTHOR_ID, supabase);
		await expect(DELETE({ params: { id: EXERCISE_ID }, locals } as any)).rejects.toMatchObject({
			status: 404
		});
	});

	it('returns 403 when teacher is not the author', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single');
		const locals = createMockLocals(OTHER_USER_ID, supabase);
		await expect(DELETE({ params: { id: EXERCISE_ID }, locals } as any)).rejects.toMatchObject({
			status: 403
		});
	});

	it('deletes and returns success when caller is the author', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single');
		// the actual delete query is awaited implicitly → 'then'
		mockSuccess(supabase, null, 'then');
		const locals = createMockLocals(AUTHOR_ID, supabase);

		const response = await DELETE({ params: { id: EXERCISE_ID }, locals } as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { success: boolean };
		expect(data.success).toBe(true);
	});

	it('returns 500 when delete fails', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, { author_id: AUTHOR_ID }, 'single');
		mockError(supabase, 'db error', 'then');
		const locals = createMockLocals(AUTHOR_ID, supabase);
		await expect(DELETE({ params: { id: EXERCISE_ID }, locals } as any)).rejects.toMatchObject({
			status: 500
		});
	});
});
