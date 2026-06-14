/**
 * POST / GET /api/python-notebooks/[id]/checkpoint-runs — Tests
 * =============================================================
 *
 * The endpoint is thin: auth gate + Zod + UPSERT/SELECT. RLS (migration
 * 20260603103958) does the real authorization work; the tests here cover
 * the JS-side glue (validation, error mapping, response shape) by mocking
 * the supabase client.
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

const NOTEBOOK_ID = '550e8400-e29b-41d4-a716-446655440100';
const USER_ID = '550e8400-e29b-41d4-a716-446655440200';
const CELL_ID = 'cell-abc-123';

const passedRun = {
	notebook_id: NOTEBOOK_ID,
	user_id: USER_ID,
	cell_id: CELL_ID,
	status: 'passed' as const,
	error_message: null,
	ran_at: '2026-06-03T10:30:00Z'
};

const failedRun = {
	notebook_id: NOTEBOOK_ID,
	user_id: USER_ID,
	cell_id: CELL_ID,
	status: 'failed' as const,
	error_message: 'AssertionError: expected 6, got 5',
	ran_at: '2026-06-03T10:31:00Z'
};

// =============================================================================
// POST
// =============================================================================

describe('POST /api/python-notebooks/[id]/checkpoint-runs', () => {
	it('upserts a passed run and returns it', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		// The handler calls supabase.rpc('upsert_checkpoint_run', {...}).single()
		// so rpc must return an object with .single()
		supabase.rpc.mockReturnValueOnce({
			single: vi.fn().mockResolvedValueOnce({ data: passedRun, error: null })
		});
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({ cell_id: CELL_ID, status: 'passed' });

		const response = await POST({
			params: { id: NOTEBOOK_ID },
			locals,
			request
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { run: typeof passedRun };
		expect(data.run).toEqual(passedRun);

		expect(supabase.rpc).toHaveBeenCalledWith('upsert_checkpoint_run', {
			p_notebook_id: NOTEBOOK_ID,
			p_cell_id: CELL_ID,
			p_status: 'passed',
			p_error_message: null
		});
	});

	it('upserts a failed run with error_message', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		supabase.rpc.mockReturnValueOnce({
			single: vi.fn().mockResolvedValueOnce({ data: failedRun, error: null })
		});
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({
			cell_id: CELL_ID,
			status: 'failed',
			error_message: 'AssertionError: expected 6, got 5'
		});

		const response = await POST({
			params: { id: NOTEBOOK_ID },
			locals,
			request
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { run: typeof failedRun };
		expect(data.run.status).toBe('failed');
		expect(data.run.error_message).toContain('AssertionError');
	});

	it('rejects an anonymous caller with 401', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);
		const request = createMockRequest({ cell_id: CELL_ID, status: 'passed' });

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('rejects an invalid notebook UUID with 400', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({ cell_id: CELL_ID, status: 'passed' });

		await expect(
			POST({
				params: { id: 'not-a-uuid' },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('rejects an empty body with 400', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({});

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('rejects a failed status without error_message with 400 (Zod refine)', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({ cell_id: CELL_ID, status: 'failed' });

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('rejects a passed status with error_message with 400 (Zod refine)', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({
			cell_id: CELL_ID,
			status: 'passed',
			error_message: 'should not be here'
		});

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('rejects an error_message longer than 5000 chars with 400', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({
			cell_id: CELL_ID,
			status: 'failed',
			error_message: 'x'.repeat(5001)
		});

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('rejects a cell_id longer than 100 chars with 400', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({
			cell_id: 'x'.repeat(101),
			status: 'passed'
		});

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('rejects an invalid JSON body with 400', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);
		const request = {
			method: 'POST',
			json: () => Promise.reject(new Error('invalid')),
			formData: () => undefined,
			headers: new Headers()
		} as unknown as Request;

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('maps an RLS rejection (PostgreSQL code 42501) to 403', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		supabase.rpc.mockReturnValueOnce({
			single: vi.fn().mockResolvedValueOnce({
				data: null,
				error: { code: '42501', message: 'new row violates row-level security policy' }
			})
		});
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({ cell_id: CELL_ID, status: 'passed' });

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('maps a generic DB error to 500', async () => {
		const { POST } = await import('../+server');

		const supabase = createMockSupabase();
		supabase.rpc.mockReturnValueOnce({
			single: vi.fn().mockResolvedValueOnce({
				data: null,
				error: { message: 'some random db error' }
			})
		});
		const locals = createMockLocals(USER_ID, supabase);
		const request = createMockRequest({ cell_id: CELL_ID, status: 'passed' });

		await expect(
			POST({
				params: { id: NOTEBOOK_ID },
				locals,
				request
			} as any)
		).rejects.toMatchObject({ status: 500 });
	});
});

// =============================================================================
// GET
// =============================================================================

describe('GET /api/python-notebooks/[id]/checkpoint-runs', () => {
	it('returns the runs visible to the caller (RLS filters them server-side)', async () => {
		const { GET } = await import('../+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, [passedRun, failedRun], 'then');
		const locals = createMockLocals(USER_ID, supabase);

		const response = await GET({
			params: { id: NOTEBOOK_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { runs: Array<typeof passedRun> };
		expect(data.runs).toHaveLength(2);
		expect(data.runs[0].status).toBe('passed');
		expect(data.runs[1].status).toBe('failed');
	});

	it('returns an empty array when there are no runs', async () => {
		const { GET } = await import('../+server');

		const supabase = createMockSupabase();
		mockSuccess(supabase, [], 'then');
		const locals = createMockLocals(USER_ID, supabase);

		const response = await GET({
			params: { id: NOTEBOOK_ID },
			locals
		} as any);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { runs: unknown[] };
		expect(data.runs).toEqual([]);
	});

	it('rejects an anonymous caller with 401', async () => {
		const { GET } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(undefined, supabase);

		await expect(
			GET({
				params: { id: NOTEBOOK_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('rejects an invalid notebook UUID with 400', async () => {
		const { GET } = await import('../+server');

		const supabase = createMockSupabase();
		const locals = createMockLocals(USER_ID, supabase);

		await expect(
			GET({
				params: { id: 'not-a-uuid' },
				locals
			} as any)
		).rejects.toMatchObject({ status: 400 });
	});

	it('maps a DB error to 500', async () => {
		const { GET } = await import('../+server');

		const supabase = createMockSupabase();
		mockError(supabase, 'connection refused', 'then');
		const locals = createMockLocals(USER_ID, supabase);

		await expect(
			GET({
				params: { id: NOTEBOOK_ID },
				locals
			} as any)
		).rejects.toMatchObject({ status: 500 });
	});
});
