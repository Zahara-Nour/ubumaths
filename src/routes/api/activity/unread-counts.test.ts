/**
 * Unified Activity Counts API - Test Suite
 * =========================================
 *
 * Tests the unified /api/activity/unread-counts endpoint that combines:
 * - Notification unread count
 * - Private message unread count
 *
 * This endpoint reduces database polling overhead by 50%
 *
 * @module api/activity/unread-counts.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './unread-counts/+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the server-side notifications module
vi.mock('$lib/server/notifications', () => ({
	getUnreadCount: vi.fn()
}));

import { getUnreadCount } from '$lib/server/notifications';

describe('GET /api/activity/unread-counts', () => {
	let mockSupabase: {
		rpc: ReturnType<typeof vi.fn>;
	};
	let mockLocals: {
		supabase: typeof mockSupabase;
		safeGetSession: ReturnType<typeof vi.fn>;
	};
	let mockRequestEvent: Partial<RequestEvent>;

	beforeEach(() => {
		// Create mock Supabase client
		mockSupabase = {
			rpc: vi.fn()
		};

		// Create mock locals with session
		mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn()
		};

		// Create mock request event
		mockRequestEvent = {
			locals: mockLocals as RequestEvent['locals']
		};

		// Clear all mocks
		vi.clearAllMocks();
	});

	it('should return both notifications and messages counts for authenticated user', async () => {
		// Setup: Authenticated user session
		const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: mockUserId }
			}
		});

		// Setup: Mock notification count
		vi.mocked(getUnreadCount).mockResolvedValue(5);

		// Setup: Mock messages RPC call
		mockSupabase.rpc.mockResolvedValue({
			data: 3,
			error: null
		});

		// Execute: Call the endpoint
		const response = await GET(mockRequestEvent as RequestEvent);
		const data = await response.json();

		// Assert: Correct counts returned
		expect(data).toEqual({
			notifications: 5,
			messages: 3
		});

		// Assert: Both services called with correct params
		expect(getUnreadCount).toHaveBeenCalledWith(mockSupabase, mockUserId);
		expect(mockSupabase.rpc).toHaveBeenCalledWith('get_private_messages_unread_count', {
			p_user_id: mockUserId
		});
	});

	it('should handle zero counts gracefully', async () => {
		// Setup: User with no unread items
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: '550e8400-e29b-41d4-a716-446655440001' }
			}
		});

		vi.mocked(getUnreadCount).mockResolvedValue(0);
		mockSupabase.rpc.mockResolvedValue({
			data: 0,
			error: null
		});

		// Execute
		const response = await GET(mockRequestEvent as RequestEvent);
		const data = await response.json();

		// Assert
		expect(data).toEqual({
			notifications: 0,
			messages: 0
		});
	});

	it('should handle null message count from RPC', async () => {
		// Setup: RPC returns null
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: '550e8400-e29b-41d4-a716-446655440002' }
			}
		});

		vi.mocked(getUnreadCount).mockResolvedValue(2);
		mockSupabase.rpc.mockResolvedValue({
			data: null,
			error: null
		});

		// Execute
		const response = await GET(mockRequestEvent as RequestEvent);
		const data = await response.json();

		// Assert: Null treated as 0
		expect(data).toEqual({
			notifications: 2,
			messages: 0
		});
	});

	it('should return 401 if user is not authenticated', async () => {
		// Setup: No session
		mockLocals.safeGetSession.mockResolvedValue({
			session: null
		});

		// Execute & Assert: Should throw 401 error
		await expect(GET(mockRequestEvent as RequestEvent)).rejects.toThrow();

		// Assert: Neither service should be called
		expect(getUnreadCount).not.toHaveBeenCalled();
		expect(mockSupabase.rpc).not.toHaveBeenCalled();
	});

	it('should return 400 if user ID is invalid UUID format', async () => {
		// Setup: Session with invalid UUID
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: 'not-a-valid-uuid' }
			}
		});

		// Execute & Assert: Should throw 400 error
		await expect(GET(mockRequestEvent as RequestEvent)).rejects.toThrow();

		// Assert: Services should not be called with invalid ID
		expect(getUnreadCount).not.toHaveBeenCalled();
		expect(mockSupabase.rpc).not.toHaveBeenCalled();
	});

	it('should handle messages RPC error gracefully', async () => {
		// Setup: Authenticated user
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: '550e8400-e29b-41d4-a716-446655440003' }
			}
		});

		// Setup: Notifications work but messages fail
		vi.mocked(getUnreadCount).mockResolvedValue(5);
		mockSupabase.rpc.mockResolvedValue({
			data: null,
			error: { message: 'RPC call failed', code: '42P01' }
		});

		// Execute & Assert: Should throw 500 error
		await expect(GET(mockRequestEvent as RequestEvent)).rejects.toThrow();
	});

	it('should handle notifications service error gracefully', async () => {
		// Setup: Authenticated user
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: '550e8400-e29b-41d4-a716-446655440004' }
			}
		});

		// Setup: Notifications throws error
		vi.mocked(getUnreadCount).mockRejectedValue(new Error('Database connection failed'));

		// Execute & Assert: Should throw 500 error
		await expect(GET(mockRequestEvent as RequestEvent)).rejects.toThrow();
	});

	it('should use Promise.all for parallel execution', async () => {
		// Setup: Authenticated user
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: '550e8400-e29b-41d4-a716-446655440005' }
			}
		});

		// Setup: Track execution timing
		let notificationsResolveTime = 0;
		let messagesResolveTime = 0;

		vi.mocked(getUnreadCount).mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			notificationsResolveTime = Date.now();
			return 5;
		});

		mockSupabase.rpc.mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			messagesResolveTime = Date.now();
			return { data: 3, error: null };
		});

		// Execute
		const startTime = Date.now();
		const response = await GET(mockRequestEvent as RequestEvent);
		const endTime = Date.now();
		const data = await response.json();

		// Assert: Correct data returned
		expect(data).toEqual({
			notifications: 5,
			messages: 3
		});

		// Assert: Execution should take ~50ms (parallel), not ~100ms (sequential)
		// Generous margin for CI environment variability (150ms allows 3x overhead)
		const executionTime = endTime - startTime;
		expect(executionTime).toBeLessThan(150); // If sequential, would be ~100ms

		// Assert: Both should resolve around the same time
		// Parallel execution means both complete within similar timeframe
		// Allow 25ms tolerance for CI environment scheduling
		expect(Math.abs(notificationsResolveTime - messagesResolveTime)).toBeLessThan(25);
	});

	it('should handle large counts correctly', async () => {
		// Setup: User with many unread items
		mockLocals.safeGetSession.mockResolvedValue({
			session: {
				user: { id: '550e8400-e29b-41d4-a716-446655440006' }
			}
		});

		vi.mocked(getUnreadCount).mockResolvedValue(999);
		mockSupabase.rpc.mockResolvedValue({
			data: 500,
			error: null
		});

		// Execute
		const response = await GET(mockRequestEvent as RequestEvent);
		const data = await response.json();

		// Assert
		expect(data).toEqual({
			notifications: 999,
			messages: 500
		});
	});
});
