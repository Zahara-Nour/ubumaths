/**
 * Integration tests for GET/POST /api/cache/cleanup
 *
 * Tests CRON authentication and cleanup execution for the cache cleanup endpoint.
 * Verifies that:
 * - Requests without valid auth are rejected (401)
 * - Requests with valid auth execute cleanup successfully
 * - Both GET and POST handlers are protected
 * - Job tracking is properly implemented
 * - RPC function cleanup_expired_cache is called correctly
 *
 * @module api/cache/cleanup/+server.test
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as cronAuth from '$lib/server/auth/cron';

// Mock dependencies
vi.mock('$lib/server/auth/cron');

// Create a mock RPC function that will be reused
let mockRpc = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		rpc: mockRpc
	})
}));

// Import after mocks are set up
const { POST, GET } = await import('./+server');

describe('POST /api/cache/cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc = vi.fn(); // Reset the mock function
	});

	test('rejects request without valid auth', async () => {
		// Mock verifyCronAuth to throw error (simulating invalid/missing token)
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			throw new Error('Unauthorized: Missing Authorization header');
		});

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST'
			// No Authorization header
		});

		// Should throw due to failed authentication
		await expect(POST({ request } as Parameters<typeof POST>[0])).rejects.toThrow('Unauthorized');

		// Verify verifyCronAuth was called
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);
	});

	test('executes cleanup with valid auth', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			// Success - do nothing (void function)
		});

		// Mock serviceRoleClient with proper RPC call sequence
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-123', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 3, error: null }) // cleanup_expired_cache
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);
		const data = await response.json();

		// Verify response
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			deleted_count: 3,
			message: 'Cleaned up 3 expired cache entries'
		});

		// Verify authentication was checked
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);

		// Verify RPC calls were made
		expect(mockRpc).toHaveBeenCalledWith('start_job_run', {
			job_name: 'cleanup_expired_cache',
			metadata: {}
		});
		expect(mockRpc).toHaveBeenCalledWith('cleanup_expired_cache');
		expect(mockRpc).toHaveBeenCalledWith('complete_job_run', {
			run_id: 'mock-run-id-123',
			status: 'success',
			metadata: { deleted_count: 3 }
		});
	});

	test('handles cleanup failure gracefully', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock serviceRoleClient with cleanup error
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-456', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: null, error: { message: 'Database connection failed' } }) // cleanup_expired_cache (error)
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run (failed status)

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);
		const data = await response.json();

		// Verify error response
		expect(response.status).toBe(500);
		expect(data).toEqual({
			success: false,
			error: 'Cleanup failed: Database connection failed'
		});

		// Verify job run was marked as failed
		expect(mockRpc).toHaveBeenCalledWith('complete_job_run', {
			run_id: 'mock-run-id-456',
			status: 'failed',
			error_message: 'Cleanup failed: Database connection failed',
			metadata: {}
		});
	});

	test('continues cleanup even if job tracking fails', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock serviceRoleClient with start_job_run failure but successful cleanup
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: null, error: { message: 'Job tracking unavailable' } }) // start_job_run (error)
			.mockResolvedValueOnce({ data: 7, error: null }); // cleanup_expired_cache (success)

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);
		const data = await response.json();

		// Verify cleanup still succeeded
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			deleted_count: 7,
			message: 'Cleaned up 7 expired cache entries'
		});

		// Verify cleanup was called despite job tracking failure
		expect(mockRpc).toHaveBeenCalledWith('cleanup_expired_cache');
	});
});

describe('GET /api/cache/cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc = vi.fn();
	});

	test('also requires auth (shared handler)', async () => {
		// Mock verifyCronAuth to throw error
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			throw new Error('Unauthorized: Missing Authorization header');
		});

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'GET'
			// No Authorization header
		});

		// Should throw due to failed authentication
		await expect(GET({ request } as Parameters<typeof GET>[0])).rejects.toThrow('Unauthorized');

		// Verify verifyCronAuth was called
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);
	});

	test('executes cleanup with valid auth (same as POST)', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock serviceRoleClient
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-789', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 12, error: null }) // cleanup_expired_cache
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'GET',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const response = await GET({ request } as Parameters<typeof GET>[0]);
		const data = await response.json();

		// Verify response
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			deleted_count: 12,
			message: 'Cleaned up 12 expired cache entries'
		});

		// Verify authentication was checked
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);
	});

	test('handles zero deletions correctly', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock serviceRoleClient with zero deletions
		mockRpc = vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-000', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: 0, error: null }) // cleanup_expired_cache (0 deletions)
			.mockResolvedValueOnce({ data: null, error: null }); // complete_job_run

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'GET',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const response = await GET({ request } as Parameters<typeof GET>[0]);
		const data = await response.json();

		// Verify response handles zero deletions
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			deleted_count: 0,
			message: 'Cleaned up 0 expired cache entries'
		});
	});
});
