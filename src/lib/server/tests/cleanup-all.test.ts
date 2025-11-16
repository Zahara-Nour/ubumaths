/**
 * Integration tests for GET/POST /api/cleanup/all
 *
 * Tests CRON authentication and unified cleanup execution.
 * Verifies that:
 * - Requests without valid auth are rejected (401)
 * - Requests with valid auth execute both cleanups successfully
 * - Both GET and POST handlers are protected
 * - Job tracking is properly implemented
 * - If one cleanup fails, the other continues
 * - Results are properly aggregated
 *
 * @module api/cleanup/all/+server.test
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as cronAuth from '$lib/server/auth/cron';
import * as notificationsModule from '$lib/server/notifications';

// Mock dependencies
vi.mock('$lib/server/auth/cron');
vi.mock('$lib/server/notifications');

// Create a mock RPC function that will be reused
let mockRpc = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		rpc: mockRpc
	})
}));

// Import after mocks are set up
const { POST, GET } = await import('../../../routes/api/cleanup/all/+server');

describe('POST /api/cleanup/all', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc = vi.fn();
	});

	test('rejects request without valid auth', async () => {
		// Mock verifyCronAuth to throw error (simulating invalid/missing token)
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			throw new Error('Unauthorized: Missing Authorization header');
		});

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'POST'
			// No Authorization header
		});

		const mockLocals = {
			supabase: {}
		};

		// Should throw due to failed authentication

		await expect(POST({ request, locals: mockLocals } as any)).rejects.toThrow('Unauthorized');

		// Verify verifyCronAuth was called
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);

		// Cleanup functions should NOT have been called
		expect(mockRpc).not.toHaveBeenCalled();
		expect(notificationsModule.cleanupExpiredNotifications).not.toHaveBeenCalled();
	});

	test('executes both cleanups successfully with valid auth', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			// Success - do nothing (void function)
		});

		// Mock successful notifications cleanup
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 5
		});

		// Mock serviceRoleClient with proper RPC call sequence
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-123', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 3, error: null }) // cleanup_expired_cache
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockSupabase = {
			from: vi.fn(),
			select: vi.fn()
		};

		const mockLocals = {
			supabase: mockSupabase
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const data = await response.json();

		// Verify response
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			cache: {
				success: true,
				deletedCount: 3
			},
			notifications: {
				success: true,
				deletedCount: 5
			},
			totalDeleted: 8
		});

		// Verify authentication was checked
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);

		// Verify RPC calls were made
		expect(mockRpc).toHaveBeenCalledWith('start_job_run', {
			p_job_name: 'cleanup_all',
			p_metadata: {}
		});
		expect(mockRpc).toHaveBeenCalledWith('cleanup_expired_cache');
		expect(mockRpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'mock-run-id-123',
			p_status: 'success',
			p_metadata: {
				cache_deleted: 3,
				notifications_deleted: 5,
				total_deleted: 8,
				cache_success: true,
				notifications_success: true
			}
		});

		// Verify notifications cleanup was called
		expect(notificationsModule.cleanupExpiredNotifications).toHaveBeenCalledWith(mockSupabase);
	});

	test('continues if cache cleanup fails but notifications succeeds', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock successful notifications cleanup
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 7
		});

		// Mock serviceRoleClient with cache cleanup error
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-456', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: null, error: { message: 'Cache database error' } }) // cleanup_expired_cache (error)
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run (partial_failure status)

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const data = await response.json();

		// Verify partial success response (207 Multi-Status)
		expect(response.status).toBe(207);
		expect(data).toEqual({
			success: false,
			cache: {
				success: false,
				deletedCount: 0,
				error: 'Cache cleanup failed: Cache database error'
			},
			notifications: {
				success: true,
				deletedCount: 7
			},
			totalDeleted: 7
		});

		// Verify job run was marked with partial_failure
		expect(mockRpc).toHaveBeenCalledWith('complete_job_run', {
			p_run_id: 'mock-run-id-456',
			p_status: 'partial_failure',
			p_metadata: {
				cache_deleted: 0,
				notifications_deleted: 7,
				total_deleted: 7,
				cache_success: false,
				notifications_success: true
			}
		});

		// Verify notifications cleanup was still called
		expect(notificationsModule.cleanupExpiredNotifications).toHaveBeenCalled();
	});

	test('continues if notifications cleanup fails but cache succeeds', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock failed notifications cleanup
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: false,
			error: 'Notifications database error'
		});

		// Mock successful cache cleanup
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-789', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 4, error: null }) // cleanup_expired_cache (success)
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const data = await response.json();

		// Verify partial success response
		expect(response.status).toBe(207);
		expect(data).toEqual({
			success: false,
			cache: {
				success: true,
				deletedCount: 4
			},
			notifications: {
				success: false,
				deletedCount: 0,
				error: 'Notifications database error'
			},
			totalDeleted: 4
		});

		// Verify both cleanups were attempted
		expect(mockRpc).toHaveBeenCalledWith('cleanup_expired_cache');
		expect(notificationsModule.cleanupExpiredNotifications).toHaveBeenCalled();
	});

	test('handles zero deletions correctly', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock zero deletions for both cleanups
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 0
		});

		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-000', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 0, error: null }) // cleanup_expired_cache (0 deletions)
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const data = await response.json();

		// Verify response handles zero deletions
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			cache: {
				success: true,
				deletedCount: 0
			},
			notifications: {
				success: true,
				deletedCount: 0
			},
			totalDeleted: 0
		});
	});

	test('continues cleanup even if job tracking fails', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock successful cleanups
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 2
		});

		// Mock serviceRoleClient with start_job_run failure but successful cleanups
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: null, error: { message: 'Job tracking unavailable' } }) // start_job_run (error)
			.mockResolvedValueOnce({ data: 6, error: null }); // cleanup_expired_cache (success)

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const data = await response.json();

		// Verify cleanups still succeeded
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			cache: {
				success: true,
				deletedCount: 6
			},
			notifications: {
				success: true,
				deletedCount: 2
			},
			totalDeleted: 8
		});

		// Verify both cleanups were called despite job tracking failure
		expect(mockRpc).toHaveBeenCalledWith('cleanup_expired_cache');
		expect(notificationsModule.cleanupExpiredNotifications).toHaveBeenCalled();
	});
});

describe('GET /api/cleanup/all', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc = vi.fn();
	});

	test('also requires auth (shared handler)', async () => {
		// Mock verifyCronAuth to throw error
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			throw new Error('Unauthorized: Missing Authorization header');
		});

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'GET'
			// No Authorization header
		});

		const mockLocals = {
			supabase: {}
		};

		// Should throw due to failed authentication

		await expect(GET({ request, locals: mockLocals } as any)).rejects.toThrow('Unauthorized');

		// Verify verifyCronAuth was called
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);
	});

	test('executes both cleanups with valid auth (same as POST)', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock successful cleanups
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 3
		});

		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-get', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 9, error: null }) // cleanup_expired_cache
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cleanup/all', {
			method: 'GET',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await GET({ request, locals: mockLocals } as any);
		const data = await response.json();

		// Verify response
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			cache: {
				success: true,
				deletedCount: 9
			},
			notifications: {
				success: true,
				deletedCount: 3
			},
			totalDeleted: 12
		});

		// Verify authentication was checked
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);
	});
});
