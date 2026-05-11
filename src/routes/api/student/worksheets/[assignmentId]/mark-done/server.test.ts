/**
 * POST/DELETE /api/student/worksheets/[assignmentId]/mark-done — Tests
 * ======================================================================
 *
 * Covers:
 *  - auth (401 unauthenticated, 403 non-student)
 *  - access control via `can_access_assignment` RPC (404 when hidden)
 *  - POST creates a ghost instance when none exists (variant_seed=0, instance_data={})
 *  - POST updates an existing instance, preserving variant_seed
 *  - POST is idempotent (calling twice doesn't error)
 *  - DELETE clears submitted_at on an existing instance
 *  - DELETE is idempotent (no-op when no instance)
 *
 * Mock pattern follows `api/python-exercises/[id]/assign/server.test.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	mockSuccess,
	mockRpcSuccess
} from '$tests/helpers';

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440000';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440011';
const INSTANCE_ID = '550e8400-e29b-41d4-a716-446655440020';

const studentProfile = { role: 'student' };
const teacherProfile = { role: 'teacher' };

// ============================================================================
// POST — mark done
// ============================================================================

describe('POST /api/student/worksheets/[assignmentId]/mark-done', () => {
	it('returns 401 when not authenticated', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(
			POST({
				params: { assignmentId: ASSIGNMENT_ID },
				locals,
				request: createMockRequest({})
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when caller is not a student (e.g. a teacher)', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, teacherProfile, 'single'); // profile lookup by requireAuth
		const locals = createMockLocals(TEACHER_ID, supabase);

		await expect(
			POST({
				params: { assignmentId: ASSIGNMENT_ID },
				locals,
				request: createMockRequest({})
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns 404 when the assignment is hidden by RLS / can_access_assignment', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, studentProfile, 'single'); // profile
		mockRpcSuccess(supabase, 'can_access_assignment', false); // no access
		const locals = createMockLocals(STUDENT_ID, supabase);

		await expect(
			POST({
				params: { assignmentId: ASSIGNMENT_ID },
				locals,
				request: createMockRequest({})
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('creates a ghost instance when none exists (variant_seed=0, instance_data={}, status=submitted)', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();

		mockSuccess(supabase, studentProfile, 'single'); // profile
		mockRpcSuccess(supabase, 'can_access_assignment', true);
		mockSuccess(supabase, { worksheet_id: WORKSHEET_ID }, 'single'); // assignment lookup
		mockSuccess(supabase, null, 'maybeSingle'); // no existing instance
		// Insert returns the ghost row
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				status: 'submitted',
				submitted_at: '2026-05-11T10:00:00.000Z'
			},
			'single'
		);

		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await POST({
			params: { assignmentId: ASSIGNMENT_ID },
			locals,
			request: createMockRequest({})
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			instance: { id: string; status: string; submitted_at: string };
		};
		expect(data.instance.id).toBe(INSTANCE_ID);
		expect(data.instance.status).toBe('submitted');
		expect(data.instance.submitted_at).toBeTruthy();

		// Verify the insert was called with the ghost shape.
		// The insert mock fn is `_mockChain.insert` — inspect its args.
		const insertCalls = supabase._mockChain.insert.mock.calls;
		expect(insertCalls.length).toBeGreaterThanOrEqual(1);
		const insertedRow = insertCalls[0]?.[0] as Record<string, unknown>;
		expect(insertedRow.worksheet_id).toBe(WORKSHEET_ID);
		expect(insertedRow.student_id).toBe(STUDENT_ID);
		expect(insertedRow.variant_seed).toBe(0);
		expect(insertedRow.instance_data).toEqual({});
		expect(insertedRow.status).toBe('submitted');
		expect(insertedRow.submitted_at).toBeTruthy();
	});

	it('updates an existing instance, preserving variant_seed', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();

		mockSuccess(supabase, studentProfile, 'single'); // profile
		mockRpcSuccess(supabase, 'can_access_assignment', true);
		mockSuccess(supabase, { worksheet_id: WORKSHEET_ID }, 'single'); // assignment lookup
		// Existing instance with a real variant_seed (12345) — must NOT be touched
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				variant_seed: 12345,
				accessed_at: '2026-05-10T09:00:00.000Z',
				submitted_at: null,
				status: 'in_progress'
			},
			'maybeSingle'
		);
		// Update returns the updated row
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				status: 'submitted',
				submitted_at: '2026-05-11T10:00:00.000Z'
			},
			'single'
		);

		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await POST({
			params: { assignmentId: ASSIGNMENT_ID },
			locals,
			request: createMockRequest({})
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			instance: { id: string; status: string; submitted_at: string };
		};
		expect(data.instance.id).toBe(INSTANCE_ID);
		expect(data.instance.status).toBe('submitted');

		// The update call must NOT mention variant_seed — only submitted_at + status.
		const updateCalls = supabase._mockChain.update.mock.calls;
		expect(updateCalls.length).toBeGreaterThanOrEqual(1);
		const updatePayload = updateCalls[0]?.[0] as Record<string, unknown>;
		expect(updatePayload).toHaveProperty('submitted_at');
		expect(updatePayload).toHaveProperty('status', 'submitted');
		expect(updatePayload).not.toHaveProperty('variant_seed');
		expect(updatePayload).not.toHaveProperty('instance_data');

		// And of course no INSERT was issued.
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});

	it('is idempotent: calling POST twice on the same worksheet just re-stamps submitted_at', async () => {
		const { POST } = await import('./+server');
		const supabase = createMockSupabase();

		// First POST already created an instance with status=submitted, submitted_at set.
		mockSuccess(supabase, studentProfile, 'single');
		mockRpcSuccess(supabase, 'can_access_assignment', true);
		mockSuccess(supabase, { worksheet_id: WORKSHEET_ID }, 'single'); // assignment lookup
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				variant_seed: 0,
				accessed_at: null,
				submitted_at: '2026-05-11T10:00:00.000Z',
				status: 'submitted'
			},
			'maybeSingle'
		);
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				status: 'submitted',
				submitted_at: '2026-05-11T10:00:00.001Z' // re-stamped
			},
			'single'
		);

		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await POST({
			params: { assignmentId: ASSIGNMENT_ID },
			locals,
			request: createMockRequest({})
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			instance: { id: string; status: string; submitted_at: string };
		};
		expect(data.instance.status).toBe('submitted');
		// Used UPDATE not INSERT — no duplicate row.
		expect(supabase._mockChain.update).toHaveBeenCalled();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});
});

// ============================================================================
// DELETE — unmark
// ============================================================================

describe('DELETE /api/student/worksheets/[assignmentId]/mark-done', () => {
	it('returns 401 when not authenticated', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(
			DELETE({
				params: { assignmentId: ASSIGNMENT_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 403 when caller is not a student', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();
		mockSuccess(supabase, teacherProfile, 'single');
		const locals = createMockLocals(TEACHER_ID, supabase);

		await expect(
			DELETE({
				params: { assignmentId: ASSIGNMENT_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('clears submitted_at on an existing instance (reverts to in_progress when accessed_at is set)', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();

		mockSuccess(supabase, studentProfile, 'single');
		mockRpcSuccess(supabase, 'can_access_assignment', true);
		mockSuccess(supabase, { worksheet_id: WORKSHEET_ID }, 'single');
		// Existing instance: was submitted, but student had also opened it online.
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				variant_seed: 42,
				accessed_at: '2026-05-10T09:00:00.000Z',
				submitted_at: '2026-05-11T10:00:00.000Z',
				status: 'submitted'
			},
			'maybeSingle'
		);
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				status: 'in_progress',
				submitted_at: null
			},
			'single'
		);

		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await DELETE({
			params: { assignmentId: ASSIGNMENT_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			instance: { id: string; status: string; submitted_at: string | null };
		};
		expect(data.instance.id).toBe(INSTANCE_ID);
		expect(data.instance.submitted_at).toBeNull();
		expect(data.instance.status).toBe('in_progress');

		// Verify the update payload
		const updateCalls = supabase._mockChain.update.mock.calls;
		const updatePayload = updateCalls[0]?.[0] as Record<string, unknown>;
		expect(updatePayload.submitted_at).toBeNull();
		expect(updatePayload.status).toBe('in_progress');
	});

	it('reverts status to "generated" when accessed_at is null', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();

		mockSuccess(supabase, studentProfile, 'single');
		mockRpcSuccess(supabase, 'can_access_assignment', true);
		mockSuccess(supabase, { worksheet_id: WORKSHEET_ID }, 'single');
		// Ghost instance: never accessed, only submitted via mark-done.
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				variant_seed: 0,
				accessed_at: null,
				submitted_at: '2026-05-11T10:00:00.000Z',
				status: 'submitted'
			},
			'maybeSingle'
		);
		mockSuccess(
			supabase,
			{
				id: INSTANCE_ID,
				status: 'generated',
				submitted_at: null
			},
			'single'
		);

		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await DELETE({
			params: { assignmentId: ASSIGNMENT_ID },
			locals
		} as any);

		expect(response.status).toBe(200);

		const updateCalls = supabase._mockChain.update.mock.calls;
		const updatePayload = updateCalls[0]?.[0] as Record<string, unknown>;
		expect(updatePayload.status).toBe('generated');
		expect(updatePayload.submitted_at).toBeNull();
	});

	it('is idempotent: returns 200 with instance=null when no instance exists', async () => {
		const { DELETE } = await import('./+server');
		const supabase = createMockSupabase();

		mockSuccess(supabase, studentProfile, 'single');
		mockRpcSuccess(supabase, 'can_access_assignment', true);
		mockSuccess(supabase, { worksheet_id: WORKSHEET_ID }, 'single');
		mockSuccess(supabase, null, 'maybeSingle'); // no instance

		const locals = createMockLocals(STUDENT_ID, supabase);

		const response = await DELETE({
			params: { assignmentId: ASSIGNMENT_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { instance: null };
		expect(data.instance).toBeNull();

		// No UPDATE issued.
		expect(supabase._mockChain.update).not.toHaveBeenCalled();
	});
});
