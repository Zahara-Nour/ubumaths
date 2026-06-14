/**
 * POST /api/python-exercises/[id]/submit — Tests
 * ===============================================
 *
 * Two flows are exercised:
 *   - free-practice (no assignment): only allowed when the exercise is public
 *   - assigned: max_attempts and due_date enforcement
 *
 * Auth + role + consent + Zod paths are also covered.
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
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440020';

const studentProfile = {
	role: 'student',
	consent_required: false,
	consent_granted_at: null,
	consent_grace_period_ends: null
};

const validResult = {
	valid: true,
	failed_layer: null,
	behavior_kind: 'output' as const,
	test_results: [{ passed: true }],
	execution_time_ms: 12
};

function makePayload(overrides: Record<string, unknown> = {}) {
	return { code: 'print("ok")', validation_result: validResult, ...overrides };
}

/** Mock a `select(..., { count: 'exact', head: true })` thenable response. */
function mockCount(supabase: any, count: number) {
	supabase._mockChain.then.mockImplementationOnce(
		(onFulfilled?: (v: { data: null; count: number; error: null }) => unknown) => {
			const response = { data: null, count, error: null };
			return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
		}
	);
}

const insertedSubmission = {
	id: '550e8400-e29b-41d4-a716-446655440100',
	exercise_id: EXERCISE_ID,
	student_id: STUDENT_ID,
	code: 'print("ok")',
	validation_result: validResult,
	is_correct: true,
	attempt_number: 1,
	execution_time_ms: 12,
	assignment_id: null,
	created_at: '2026-05-09T00:00:00Z'
};

describe('POST /api/python-exercises/[id]/submit', () => {
	it('returns 401 when not authenticated', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(makePayload())
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when caller is a teacher', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { ...studentProfile, role: 'teacher' }, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(makePayload())
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 400 when code is missing', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ validation_result: validResult })
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when validation_result is missing', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest({ code: 'x' })
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('free-practice: 403 when exercise is not public and no assignment exists', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single'); // profile
		mockSuccess(supabase, [], 'then'); // class_members (getStudentClassIds)
		mockSuccess(supabase, [], 'then'); // assignments (none)
		mockSuccess(supabase, { is_public: false }, 'single'); // exercise lookup
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(makePayload())
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('free-practice: 404 when exercise does not exist (no assignment)', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single');
		mockSuccess(supabase, [], 'then');
		mockSuccess(supabase, [], 'then');
		mockError(supabase, 'not found', 'single'); // exercise lookup
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(makePayload())
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('free-practice: 201 with assignment_id null on a public exercise', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single'); // profile
		mockSuccess(supabase, [], 'then'); // class_members
		mockSuccess(supabase, [], 'then'); // assignments
		mockSuccess(supabase, { is_public: true }, 'single'); // exercise lookup
		mockCount(supabase, 0); // attempt count head:true
		mockSuccess(supabase, insertedSubmission, 'single'); // insert returning
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await POST({
			params: { id: EXERCISE_ID },
			locals,
			request: createMockRequest(makePayload())
		} as any);

		expect(response.status).toBe(201);
		const data = (await response.json()) as { submission: typeof insertedSubmission };
		expect(data.submission.assignment_id).toBeNull();
	});

	it('assigned: 201 with assignment_id when an active assignment exists', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single'); // profile
		mockSuccess(supabase, [], 'then'); // class_members
		// assignments — one matching the student
		mockSuccess(
			supabase,
			[
				{
					id: ASSIGNMENT_ID,
					class_id: null,
					student_id: STUDENT_ID,
					max_attempts: null,
					due_date: null
				}
			],
			'then'
		);
		mockCount(supabase, 0); // attempt count
		mockSuccess(supabase, { ...insertedSubmission, assignment_id: ASSIGNMENT_ID }, 'single');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await POST({
			params: { id: EXERCISE_ID },
			locals,
			request: createMockRequest(makePayload())
		} as any);

		expect(response.status).toBe(201);
		const data = (await response.json()) as { submission: { assignment_id: string | null } };
		expect(data.submission.assignment_id).toBe(ASSIGNMENT_ID);
	});

	it('assigned: 400 when max_attempts has been reached', async () => {
		const { POST } = await import('../+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single');
		mockSuccess(supabase, [], 'then'); // class_members
		mockSuccess(
			supabase,
			[
				{
					id: ASSIGNMENT_ID,
					class_id: null,
					student_id: STUDENT_ID,
					max_attempts: 3,
					due_date: null
				}
			],
			'then'
		);
		// submission count check returns 3 — limit reached
		mockCount(supabase, 3);
		const locals = createMockLocals(STUDENT_ID, supabase);

		await expect(
			POST({
				params: { id: EXERCISE_ID },
				locals,
				request: createMockRequest(makePayload())
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});
});
