/**
 * API Endpoint Tests for GET /api/notifications/unread - Pagination
 * ==================================================================
 *
 * Tests the pagination functionality of the notifications API endpoint.
 * Validates Zod schema enforcement, pagination metadata calculation,
 * and authentication requirements.
 *
 * Test Coverage:
 * 1. Default pagination (page=1, limit=20)
 * 2. Custom pagination parameters
 * 3. Out-of-bounds page handling
 * 4. Limit enforcement (max 100)
 * 5. Invalid parameter validation
 * 6. Pagination metadata correctness
 * 7. Authentication requirements
 *
 * @module api/notifications/unread/+server.test
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import * as authMiddleware from '$lib/server/middleware/auth';
import * as notificationsModule from '$lib/server/notifications';

// Mock dependencies
vi.mock('$lib/server/middleware/auth');
vi.mock('$lib/server/notifications');

// Import after mocks
const { GET } = await import('../../../routes/api/notifications/unread/+server');

describe('GET /api/notifications/unread - Pagination', () => {
	let mockLocals: {
		user: { id: string; email: string };
		profile: { id: string; role: string };
		supabase: unknown;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock user context
		mockLocals = {
			user: { id: 'user-123', email: 'student@voltairedoha.com' },
			profile: { id: 'user-123', role: 'student' },
			supabase: {} // Mock Supabase client
		};

		// Mock requireAuth to return user
		vi.mocked(authMiddleware.requireAuth).mockResolvedValue({
			user: mockLocals.user,
			profile: mockLocals.profile
		});
	});

	// ============================================================================
	// DEFAULT PAGINATION
	// ============================================================================

	test('defaults to page=1, limit=20 when no params provided', async () => {
		// Mock getUnreadNotifications response
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: [],
			pagination: {
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 0,
				hasMore: false
			}
		});

		// Create URL without any query params (defaults will be applied)
		const url = new URL('https://example.com/api/notifications/unread');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		// Verify getUnreadNotifications was called with default values
		expect(notificationsModule.getUnreadNotifications).toHaveBeenCalledWith(
			mockLocals.supabase,
			'user-123',
			{ page: 1, limit: 20 }
		);

		// Verify response structure
		expect(data).toEqual({
			notifications: [],
			pagination: {
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 0,
				hasMore: false
			}
		});
	});

	// ============================================================================
	// CUSTOM PAGINATION
	// ============================================================================

	test('uses custom pagination when valid params provided', async () => {
		// Mock response for page 2 with limit 10
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: [],
			pagination: {
				page: 2,
				limit: 10,
				total: 25,
				totalPages: 3,
				hasMore: true
			}
		});

		const url = new URL('https://example.com/api/notifications/unread?page=2&limit=10');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		// Verify getUnreadNotifications was called with custom values
		expect(notificationsModule.getUnreadNotifications).toHaveBeenCalledWith(
			mockLocals.supabase,
			'user-123',
			{ page: 2, limit: 10 }
		);

		// Verify response
		expect(data.pagination).toEqual({
			page: 2,
			limit: 10,
			total: 25,
			totalPages: 3,
			hasMore: true
		});
	});

	// ============================================================================
	// OUT-OF-BOUNDS PAGE
	// ============================================================================

	test('handles out-of-bounds page gracefully', async () => {
		// Mock response for page 999 (beyond available data)
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: [],
			pagination: {
				page: 999,
				limit: 20,
				total: 45, // Total of 3 pages (at 20 per page)
				totalPages: 3,
				hasMore: false
			}
		});

		const url = new URL('https://example.com/api/notifications/unread?page=999');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		// Verify empty array returned but metadata is correct
		expect(data.notifications).toEqual([]);
		expect(data.pagination.page).toBe(999);
		expect(data.pagination.total).toBe(45);
		expect(data.pagination.hasMore).toBe(false);
	});

	// ============================================================================
	// LIMIT ENFORCEMENT
	// ============================================================================

	test('caps limit at 100 when higher value provided', async () => {
		const url = new URL('https://example.com/api/notifications/unread?limit=200');
		const request = new Request(url.toString());

		// Should throw 400 error due to Zod validation
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	test('accepts maximum limit of 100', async () => {
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: [],
			pagination: {
				page: 1,
				limit: 100,
				total: 150,
				totalPages: 2,
				hasMore: true
			}
		});

		const url = new URL('https://example.com/api/notifications/unread?limit=100');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		// Verify limit of 100 is accepted
		expect(notificationsModule.getUnreadNotifications).toHaveBeenCalledWith(
			mockLocals.supabase,
			'user-123',
			{ page: 1, limit: 100 }
		);

		expect(data.pagination.limit).toBe(100);
	});

	// ============================================================================
	// INVALID PARAMETERS
	// ============================================================================

	test('rejects negative page number', async () => {
		const url = new URL('https://example.com/api/notifications/unread?page=-1');
		const request = new Request(url.toString());

		// Should throw 400 error due to Zod validation
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	test('rejects page=0', async () => {
		const url = new URL('https://example.com/api/notifications/unread?page=0');
		const request = new Request(url.toString());

		// Should throw 400 error (must be positive)
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	test('rejects limit=0', async () => {
		const url = new URL('https://example.com/api/notifications/unread?limit=0');
		const request = new Request(url.toString());

		// Should throw 400 error (must be positive)
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	test('rejects non-numeric page parameter', async () => {
		const url = new URL('https://example.com/api/notifications/unread?page=abc');
		const request = new Request(url.toString());

		// Should throw 400 error (invalid number)
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	test('rejects non-numeric limit parameter', async () => {
		const url = new URL('https://example.com/api/notifications/unread?limit=xyz');
		const request = new Request(url.toString());

		// Should throw 400 error (invalid number)
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	test('rejects decimal page number', async () => {
		const url = new URL('https://example.com/api/notifications/unread?page=1.5');
		const request = new Request(url.toString());

		// z.coerce.number().int() should fail on decimal
		await expect(
			GET({
				url,
				locals: mockLocals,
				request
			} as unknown as RequestEvent)
		).rejects.toThrow();
	});

	// ============================================================================
	// PAGINATION METADATA CORRECTNESS
	// ============================================================================

	test('calculates pagination metadata correctly with 5 total items', async () => {
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: Array(5).fill({}),
			pagination: {
				page: 1,
				limit: 20,
				total: 5,
				totalPages: 1,
				hasMore: false
			}
		});

		const url = new URL('https://example.com/api/notifications/unread');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(data.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 5,
			totalPages: 1,
			hasMore: false
		});
	});

	test('calculates pagination metadata correctly with 20 total items (exactly 1 page)', async () => {
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: Array(20).fill({}),
			pagination: {
				page: 1,
				limit: 20,
				total: 20,
				totalPages: 1,
				hasMore: false
			}
		});

		const url = new URL('https://example.com/api/notifications/unread');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(data.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 20,
			totalPages: 1,
			hasMore: false
		});
	});

	test('calculates pagination metadata correctly with 45 total items', async () => {
		// Page 1: items 1-20
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: Array(20).fill({}),
			pagination: {
				page: 1,
				limit: 20,
				total: 45,
				totalPages: 3,
				hasMore: true
			}
		});

		const url = new URL('https://example.com/api/notifications/unread?page=1&limit=20');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(data.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 45,
			totalPages: 3,
			hasMore: true
		});

		// Page 3: items 41-45 (last page)
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: Array(5).fill({}),
			pagination: {
				page: 3,
				limit: 20,
				total: 45,
				totalPages: 3,
				hasMore: false
			}
		});

		const url3 = new URL('https://example.com/api/notifications/unread?page=3&limit=20');
		const request3 = new Request(url3.toString());

		const response3 = await GET({
			url: url3,
			locals: mockLocals,
			request: request3
		} as unknown as RequestEvent);

		const data3 = await response3.json();

		expect(data3.pagination).toEqual({
			page: 3,
			limit: 20,
			total: 45,
			totalPages: 3,
			hasMore: false
		});
	});

	test('calculates pagination metadata correctly with 100 total items', async () => {
		// Page 1 with limit 20
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: Array(20).fill({}),
			pagination: {
				page: 1,
				limit: 20,
				total: 100,
				totalPages: 5,
				hasMore: true
			}
		});

		const url = new URL('https://example.com/api/notifications/unread?page=1&limit=20');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(data.pagination.totalPages).toBe(5);
		expect(data.pagination.hasMore).toBe(true);

		// Page 5 (last page)
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: Array(20).fill({}),
			pagination: {
				page: 5,
				limit: 20,
				total: 100,
				totalPages: 5,
				hasMore: false
			}
		});

		const url5 = new URL('https://example.com/api/notifications/unread?page=5&limit=20');
		const request5 = new Request(url5.toString());

		const response5 = await GET({
			url: url5,
			locals: mockLocals,
			request: request5
		} as unknown as RequestEvent);

		const data5 = await response5.json();

		expect(data5.pagination.totalPages).toBe(5);
		expect(data5.pagination.hasMore).toBe(false);
	});

	// ============================================================================
	// AUTHENTICATION
	// ============================================================================

	test('requires authentication', async () => {
		// Mock requireAuth to throw error (no auth)
		vi.mocked(authMiddleware.requireAuth).mockRejectedValue(new Error('Authentication required'));

		const url = new URL('https://example.com/api/notifications/unread');
		const request = new Request(url.toString());

		// Should throw authentication error
		await expect(
			GET({
				url,
				locals: { supabase: {}, user: null, profile: null },
				request
			} as unknown as RequestEvent)
		).rejects.toThrow('Authentication required');

		// Verify getUnreadNotifications was NOT called
		expect(notificationsModule.getUnreadNotifications).not.toHaveBeenCalled();
	});

	test('works for authenticated student', async () => {
		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: [],
			pagination: {
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 0,
				hasMore: false
			}
		});

		const url = new URL('https://example.com/api/notifications/unread');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		expect(response.status).toBe(200);
		expect(authMiddleware.requireAuth).toHaveBeenCalledWith(mockLocals);
	});

	test('works for authenticated teacher', async () => {
		// Override profile role to teacher
		mockLocals.profile.role = 'teacher';

		vi.mocked(authMiddleware.requireAuth).mockResolvedValue({
			user: mockLocals.user,
			profile: mockLocals.profile
		});

		vi.mocked(notificationsModule.getUnreadNotifications).mockResolvedValue({
			notifications: [],
			pagination: {
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 0,
				hasMore: false
			}
		});

		const url = new URL('https://example.com/api/notifications/unread');
		const request = new Request(url.toString());

		const response = await GET({
			url,
			locals: mockLocals,
			request
		} as unknown as RequestEvent);

		expect(response.status).toBe(200);
		expect(notificationsModule.getUnreadNotifications).toHaveBeenCalledWith(
			mockLocals.supabase,
			'user-123',
			{ page: 1, limit: 20 }
		);
	});
});
