/**
 * GET / POST /api/python-exercises — Tests
 * =========================================
 *
 * GET   — list exercises with filters and pagination (teacher vs student paths).
 * POST  — create a new exercise (teacher only).
 *
 * Auth + role + Zod + Supabase error paths are exercised. The teacher/student
 * branching for GET is tested at the high-level (no row-level filter assertions).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	mockSuccess,
	mockError
} from '$tests/helpers';

// Stub tag-resolution helpers so tests don't need to mock junction queries.
// The GET list handler uses fetchExerciseIdsByAnyTag for tag filtering, and
// the POST handler uses resolveTagsToIds + syncExerciseTagJunction after insert.
vi.mock('$lib/server/tags-resolution', () => ({
	resolveTagsToIds: vi.fn().mockResolvedValue([]),
	syncExerciseTagJunction: vi.fn().mockResolvedValue(undefined),
	fetchTagNamesForExercise: vi.fn().mockResolvedValue([]),
	fetchExerciseIdsByAnyTag: vi.fn().mockResolvedValue([])
}));

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';

const validExercisePayload = {
	title: 'Test exercise',
	description: 'desc',
	instructions: '# instr',
	starter_code: 'pass',
	solution_code: 'print("hi")',
	validation_config: {
		behavior: {
			kind: 'output',
			test_cases: [{ input: '', expected_output: 'hi\n' }],
			comparison: { kind: 'exact' }
		}
	},
	level: 'lycee',
	tags: ['print'],
	is_public: true
};

const createdExercise = {
	id: '550e8400-e29b-41d4-a716-446655440099',
	...validExercisePayload,
	author_id: TEACHER_ID,
	created_at: '2026-05-09T00:00:00Z',
	updated_at: '2026-05-09T00:00:00Z'
};

function makeUrl(params: Record<string, string> = {}) {
	const url = new URL('http://localhost/api/python-exercises');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

describe('POST /api/python-exercises (create)', () => {
	it('returns 401 when not authenticated', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(
			POST({ locals, request: createMockRequest(validExercisePayload) } as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when caller is not a teacher', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single');
		const locals = createMockLocals(STUDENT_ID, supabase);
		await expect(
			POST({ locals, request: createMockRequest(validExercisePayload) } as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 400 when payload fails Zod validation', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		// Missing required fields (title)
		await expect(
			POST({ locals, request: createMockRequest({ solution_code: 'x' }) } as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('creates an exercise and returns 201 with the new row', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		// 1st single() = profile lookup, 2nd single() = insert returning row
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockSuccess(supabase, createdExercise, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await POST({
			locals,
			request: createMockRequest(validExercisePayload)
		} as any);

		expect(response.status).toBe(201);
		const data = (await response.json()) as { exercise: typeof createdExercise };
		expect(data.exercise.id).toBe(createdExercise.id);
		expect(data.exercise.author_id).toBe(TEACHER_ID);
	});

	it('returns 500 when Supabase insert fails', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockError(supabase, 'unique violation', 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(
			POST({ locals, request: createMockRequest(validExercisePayload) } as any)
		).rejects.toMatchObject({ status: 500 });
	});
});

describe('GET /api/python-exercises (list)', () => {
	it('returns 401 when not authenticated', async () => {
		const { GET } = await import('./+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		await expect(GET({ locals, url: makeUrl() } as any)).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when profile is not found', async () => {
		const { GET } = await import('./+server');
		const supabase = createMockSupabase();
		mockError(supabase, 'no profile', 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(GET({ locals, url: makeUrl() } as any)).rejects.toMatchObject({ status: 403 });
	});

	it('returns 400 when query params are malformed', async () => {
		const { GET } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);
		// invalid level value
		await expect(GET({ locals, url: makeUrl({ level: 'bogus' }) } as any)).rejects.toMatchObject({
			status: 400
		});
	});

	it('teacher path: returns exercises with full payload (incl solution_code)', async () => {
		const { GET } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		// Final query (range/order) is awaited implicitly → use 'then'
		mockSuccess(supabase, [createdExercise], 'then');
		const locals = createMockLocals(TEACHER_ID, supabase);

		const response = await GET({ locals, url: makeUrl({ limit: '20' }) } as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			exercises: { solution_code?: string }[];
			pagination: { limit: number; offset: number };
		};
		expect(data.exercises).toHaveLength(1);
		expect(data.exercises[0].solution_code).toBeDefined();
		expect(data.pagination.limit).toBe(20);
	});

	it('student path: empty assignments → empty list short-circuit', async () => {
		const { GET } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'student' }, 'single'); // profile
		// getStudentClassIds: class_members query (then)
		mockSuccess(supabase, [], 'then');
		// assignments query (then)
		mockSuccess(supabase, [], 'then');
		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await GET({ locals, url: makeUrl() } as any);
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			exercises: unknown[];
			pagination: { total: number };
		};
		expect(data.exercises).toEqual([]);
		expect(data.pagination.total).toBe(0);
	});

	it('returns 500 when Supabase query fails', async () => {
		const { GET } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { role: 'teacher' }, 'single');
		mockError(supabase, 'connection broken', 'then');
		const locals = createMockLocals(TEACHER_ID, supabase);
		await expect(GET({ locals, url: makeUrl() } as any)).rejects.toMatchObject({ status: 500 });
	});
});
