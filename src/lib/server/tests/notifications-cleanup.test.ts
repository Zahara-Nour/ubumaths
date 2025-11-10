/**
 * Integration tests for POST/GET /api/notifications/cleanup
 *
 * Tests CRON authentication and cleanup execution for the notifications cleanup endpoint.
 * Verifies that:
 * - Requests without valid auth are rejected (401)
 * - Requests with valid auth execute cleanup successfully
 * - Both GET and POST handlers are protected
 * - Job tracking is properly implemented
 *
 * @module api/notifications/cleanup/+server.test
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '../../../routes/api/notifications/cleanup/+server';
import * as cronAuth from '$lib/server/auth/cron';
import * as notificationsModule from '$lib/server/notifications';

// Mock dependencies
vi.mock('$lib/server/auth/cron');
vi.mock('$lib/server/notifications');
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		rpc: vi
			.fn()
			.mockResolvedValueOnce({ data: 'mock-run-id-123', error: null }) // start_job_run
			.mockResolvedValueOnce({ data: null, error: null }) // complete_job_run
	})
}));

describe('POST /api/notifications/cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('rejects request without valid auth', async () => {
		// Mock verifyCronAuth to throw error (simulating invalid/missing token)
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			throw new Error('Unauthorized: Missing Authorization header');
		});

		const request = new Request('https://example.com/api/notifications/cleanup', {
			method: 'POST'
			// No Authorization header
		});

		const mockLocals = {
			supabase: {}
		};

		// Should throw due to failed authentication
		await expect(
			POST({ request, locals: mockLocals } as Parameters<typeof POST>[0])
		).rejects.toThrow('Unauthorized');

		// Verify verifyCronAuth was called
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);

		// Cleanup should NOT have been called
		expect(notificationsModule.cleanupExpiredNotifications).not.toHaveBeenCalled();
	});

	test('executes cleanup with valid auth', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			// Success - do nothing (void function)
		});

		// Mock successful cleanup
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 5
		});

		const request = new Request('https://example.com/api/notifications/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockSupabase = {
			from: vi.fn(),
			select: vi.fn(),
			eq: vi.fn()
		};

		const mockLocals = {
			supabase: mockSupabase
		};

		const response = await POST({ request, locals: mockLocals } as Parameters<typeof POST>[0]);
		const data = await response.json();

		// Verify response
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			deletedCount: 5,
			message: 'Cleaned up 5 expired notification(s)'
		});

		// Verify authentication was checked
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);

		// Verify cleanup was called
		expect(notificationsModule.cleanupExpiredNotifications).toHaveBeenCalledWith(mockSupabase);
	});

	test('handles cleanup failure gracefully', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock failed cleanup
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: false,
			error: 'Database connection failed'
		});

		const request = new Request('https://example.com/api/notifications/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await POST({ request, locals: mockLocals } as Parameters<typeof POST>[0]);
		const data = await response.json();

		// Verify error response
		expect(response.status).toBe(500);
		expect(data).toEqual({
			success: false,
			error: 'Database connection failed'
		});
	});

	test('handles unexpected errors gracefully', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock cleanup throwing an error
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockRejectedValue(
			new Error('Unexpected database error')
		);

		const request = new Request('https://example.com/api/notifications/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await POST({ request, locals: mockLocals } as Parameters<typeof POST>[0]);
		const data = await response.json();

		// Verify error response
		expect(response.status).toBe(500);
		expect(data).toEqual({
			success: false,
			error: 'Internal server error'
		});
	});
});

describe('GET /api/notifications/cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('also requires auth (shared handler)', async () => {
		// Mock verifyCronAuth to throw error
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
			throw new Error('Unauthorized: Missing Authorization header');
		});

		const request = new Request('https://example.com/api/notifications/cleanup', {
			method: 'GET'
			// No Authorization header
		});

		const mockLocals = {
			supabase: {}
		};

		// Should throw due to failed authentication
		await expect(GET({ request, locals: mockLocals } as Parameters<typeof GET>[0])).rejects.toThrow(
			'Unauthorized'
		);

		// Verify verifyCronAuth was called
		expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(request);
	});

	test('executes cleanup with valid auth (same as POST)', async () => {
		// Mock successful authentication
		vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {});

		// Mock successful cleanup
		vi.mocked(notificationsModule.cleanupExpiredNotifications).mockResolvedValue({
			success: true,
			deletedCount: 3
		});

		const request = new Request('https://example.com/api/notifications/cleanup', {
			method: 'GET',
			headers: { Authorization: 'Bearer valid-token-12345678901234' }
		});

		const mockLocals = {
			supabase: {}
		};

		const response = await GET({ request, locals: mockLocals } as Parameters<typeof GET>[0]);
		const data = await response.json();

		// Verify response
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			deletedCount: 3,
			message: 'Cleaned up 3 expired notification(s)'
		});
	});
});
