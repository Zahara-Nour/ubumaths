/**
 * POST /api/python-exercises/[id]/assign — Tests
 * ===============================================
 *
 * Teacher-only endpoint that assigns an exercise to either a class or a
 * single student (mutually exclusive). Verifies ownership of the target.
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
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';
const OTHER_TEACHER_ID = '550e8400-e29b-41d4-a716-446655440012';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440030';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440040';

const ownExercise = { id: EXERCISE_ID, author_id: TEACHER_ID, is_public: false };
const insertedAssignment = {
	id: ASSIGNMENT_ID,
	exercise_id: EXERCISE_ID,
	class_id: CLASS_ID,
	student_id: null,
	assigned_by: TEACHER_ID,
	due_date: null,
	max_attempts: null,
	created_at: '2026-05-09T00:00:00Z'
};

describe('POST /api/python-exercises/[id]/assign', () => {
	it('returns 401 when not authenticated', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID })
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when caller is not a teacher', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID })
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 404 when exercise does not exist', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockError(supabase, 'not found', 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID })
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when teacher does not own the exercise and it is not public', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(
			supabase,
			{ id: EXERCISE_ID, author_id: OTHER_TEACHER_ID, is_public: false },
			'single'
		);
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID })
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 400 when both class_id and student_id are provided', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, ownExercise, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID, student_id: STUDENT_ID })
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when neither class_id nor student_id is provided', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, ownExercise, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({})
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('class assignment: 403 when teacher does not own the class', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockSuccess(supabase, ownExercise, 'single'); // exercise
		mockSuccess(supabase, { teacher_id: OTHER_TEACHER_ID }, 'single'); // class
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID })
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('class assignment: 201 when teacher owns the class', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single'); // profile
		mockSuccess(supabase, ownExercise, 'single'); // exercise
		mockSuccess(supabase, { teacher_id: TEACHER_ID }, 'single'); // class
		mockSuccess(supabase, insertedAssignment, 'single'); // insert returning
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await POST({
			params: { id: EXERCISE_ID },
			locals,
			request: createMockRequest({ class_id: CLASS_ID })
		} as any);

		expect(response.status).toBe(201);
		const data = (await response.json()) as { assignment: typeof insertedAssignment };
		expect(data.assignment.id).toBe(ASSIGNMENT_ID);
	});

	it('student assignment: 404 when student is not in any of teacher classes', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, ownExercise, 'single');
		// student_classes returns empty
		mockSuccess(supabase, [], 'then');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ student_id: STUDENT_ID })
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('student assignment: 201 when student is in teacher class', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, ownExercise, 'single');
		mockSuccess(supabase, [{ class_id: CLASS_ID, classes: { teacher_id: TEACHER_ID } }], 'then');
		mockSuccess(
			supabase,
			{ ...insertedAssignment, class_id: null, student_id: STUDENT_ID },
			'single'
		);
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await POST({
			params: { id: EXERCISE_ID },
			locals,
			request: createMockRequest({ student_id: STUDENT_ID })
		} as any);

		expect(response.status).toBe(201);
	});

	it('returns 400 on duplicate assignment (PG code 23505)', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, ownExercise, 'single');
		mockSuccess(supabase, { teacher_id: TEACHER_ID }, 'single');
		// insert fails with unique violation
		supabase._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { code: '23505', message: 'duplicate key' }
		});
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ class_id: CLASS_ID })
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});
});
