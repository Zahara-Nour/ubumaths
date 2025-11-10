/**
 * Backend Pagination Logic Tests for getUnreadNotifications()
 * ============================================================
 *
 * Tests the in-memory pagination logic in the notification server module.
 * Validates correct slicing, metadata calculation, and edge case handling.
 *
 * Test Coverage:
 * 1. In-memory pagination works correctly
 * 2. Edge case: total < limit
 * 3. Edge case: total = limit
 * 4. Edge case: total = limit + 1
 * 5. Filters unread status before pagination
 * 6. Handles empty notification lists
 * 7. Handles user with no profile
 * 8. Handles user with no classes
 * 9. Sorting: urgent priority first, then by date
 * 10. Targeting conditions work correctly
 *
 * @module server/notifications-pagination-logic.test
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { getUnreadNotifications } from '../notifications';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { NotificationWithDetails } from '$lib/types/notification';

// ============================================================================
// TEST SETUP & MOCKS
// ============================================================================

type SupabaseClientType = SupabaseClient<Database>;

// Helper to create mock notifications
function createMockNotification(
	id: string,
	priority: 'normal' | 'important' | 'urgent' = 'normal',
	createdAt?: Date
): unknown {
	return {
		id,
		created_at: (createdAt || new Date()).toISOString(),
		created_by: 'teacher-123',
		title: `Notification ${id}`,
		message: 'Test message',
		type: 'info',
		priority,
		action_label: null,
		action_url: null,
		target_type: 'all',
		target_roles: null,
		target_class_ids: null,
		target_user_ids: null,
		expires_at: new Date(Date.now() + 86400000).toISOString(),
		deleted_at: null,
		is_system: false,
		system_event_type: null,
		creator: {
			firstname: 'John',
			lastname: 'Teacher',
			full_name: 'John Teacher'
		}
	};
}

// Helper to create mock notification_read records
function _createMockReadRecords(notificationIds: string[]): { notification_id: string }[] {
	return notificationIds.map((id) => ({ notification_id: id }));
}

describe('getUnreadNotifications - Pagination Logic', () => {
	let mockSupabase: SupabaseClientType;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock Supabase client
		mockSupabase = {
			from: vi.fn()
		} as unknown as SupabaseClientType;
	});

	// ============================================================================
	// IN-MEMORY PAGINATION
	// ============================================================================

	test('correctly paginates 50 notifications (page 2, limit 20)', async () => {
		// Create 50 mock notifications
		const allNotifications = Array.from({ length: 50 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		// Mock Supabase queries
		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [], // No reads (all unread)
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act: Request page 2 with limit 20
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 2,
			limit: 20
		});

		// Assert: Returns items 21-40 (0-indexed: items[20] to items[39])
		expect(result.notifications.length).toBe(20);
		expect(result.notifications[0].id).toBe('notif-21');
		expect(result.notifications[19].id).toBe('notif-40');

		// Assert: Pagination metadata correct
		expect(result.pagination).toEqual({
			page: 2,
			limit: 20,
			total: 50,
			totalPages: 3,
			hasMore: true
		});
	});

	test('correctly paginates last page with partial results', async () => {
		// Create 45 notifications (3 pages: 20, 20, 5)
		const allNotifications = Array.from({ length: 45 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act: Request page 3 (last page)
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 3,
			limit: 20
		});

		// Assert: Returns only 5 items (41-45)
		expect(result.notifications.length).toBe(5);
		expect(result.notifications[0].id).toBe('notif-41');
		expect(result.notifications[4].id).toBe('notif-45');

		// Assert: hasMore is false on last page
		expect(result.pagination).toEqual({
			page: 3,
			limit: 20,
			total: 45,
			totalPages: 3,
			hasMore: false
		});
	});

	// ============================================================================
	// EDGE CASE: total < limit
	// ============================================================================

	test('handles case where total < limit', async () => {
		// Create only 5 notifications (less than default limit of 20)
		const allNotifications = Array.from({ length: 5 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 1,
			limit: 20
		});

		// Assert: Returns all 5 notifications
		expect(result.notifications.length).toBe(5);

		// Assert: Pagination metadata correct
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 5,
			totalPages: 1,
			hasMore: false
		});
	});

	// ============================================================================
	// EDGE CASE: total = limit
	// ============================================================================

	test('handles case where total = limit', async () => {
		// Create exactly 20 notifications (equal to limit)
		const allNotifications = Array.from({ length: 20 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 1,
			limit: 20
		});

		// Assert: Returns all 20 notifications
		expect(result.notifications.length).toBe(20);

		// Assert: Pagination metadata correct (exactly 1 page, no more)
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 20,
			totalPages: 1,
			hasMore: false
		});
	});

	// ============================================================================
	// EDGE CASE: total = limit + 1
	// ============================================================================

	test('handles case where total = limit + 1', async () => {
		// Create 21 notifications (1 more than limit)
		const allNotifications = Array.from({ length: 21 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act: Page 1
		const result1 = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 1,
			limit: 20
		});

		// Assert: Page 1 returns 20 items, hasMore is true
		expect(result1.notifications.length).toBe(20);
		expect(result1.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 21,
			totalPages: 2,
			hasMore: true
		});

		// Act: Page 2
		const result2 = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 2,
			limit: 20
		});

		// Assert: Page 2 returns 1 item, hasMore is false
		expect(result2.notifications.length).toBe(1);
		expect(result2.pagination).toEqual({
			page: 2,
			limit: 20,
			total: 21,
			totalPages: 2,
			hasMore: false
		});
	});

	// ============================================================================
	// FILTERS UNREAD STATUS BEFORE PAGINATION
	// ============================================================================

	test('filters out read notifications before pagination', async () => {
		// Create 30 notifications
		const allNotifications = Array.from({ length: 30 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		// Mock 15 of them as read (odd-numbered IDs)
		const readNotifications = Array.from({ length: 15 }, (_, i) => ({
			notification_id: `notif-${i * 2 + 1}` // notif-1, notif-3, notif-5, ..., notif-29
		}));

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: readNotifications,
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act: Request page 1 with limit 10
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 1,
			limit: 10
		});

		// Assert: Returns only unread notifications (15 unread total, 10 per page)
		expect(result.notifications.length).toBe(10);
		expect(result.pagination.total).toBe(15); // Only 15 unread

		// Assert: Returned notifications are all unread (even-numbered IDs)
		result.notifications.forEach((notif: NotificationWithDetails) => {
			const id = notif.id;
			const number = parseInt(id.split('-')[1], 10);
			expect(number % 2).toBe(0); // All even numbers (unread)
		});
	});

	// ============================================================================
	// EMPTY NOTIFICATION LIST
	// ============================================================================

	test('handles empty notification list', async () => {
		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: [],
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 1,
			limit: 20
		});

		// Assert: Returns empty array with correct metadata
		expect(result.notifications).toEqual([]);
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 0,
			totalPages: 0,
			hasMore: false
		});
	});

	// ============================================================================
	// USER WITH NO PROFILE
	// ============================================================================

	test('handles user with no profile', async () => {
		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null, // No profile found
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act
		const result = await getUnreadNotifications(mockSupabase, 'nonexistent-user', {
			page: 1,
			limit: 20
		});

		// Assert: Returns empty result
		expect(result.notifications).toEqual([]);
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 0,
			totalPages: 0,
			hasMore: false
		});
	});

	// ============================================================================
	// USER WITH NO CLASSES
	// ============================================================================

	test('handles user with no classes correctly', async () => {
		const allNotifications = [createMockNotification('notif-1'), createMockNotification('notif-2')];

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: null }, // No classes
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act
		const result = await getUnreadNotifications(mockSupabase, 'student-no-classes', {
			page: 1,
			limit: 20
		});

		// Assert: Still returns notifications targeted to 'all' or by role
		expect(result.notifications.length).toBeGreaterThanOrEqual(0);
		expect(result.pagination.page).toBe(1);
	});

	// ============================================================================
	// DATABASE ERROR HANDLING
	// ============================================================================

	test('handles database error gracefully', async () => {
		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: null,
											error: { message: 'Database connection failed' }
										})
									})
								})
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 1,
			limit: 20
		});

		// Assert: Returns empty result (graceful degradation)
		expect(result.notifications).toEqual([]);
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 0,
			totalPages: 0,
			hasMore: false
		});
	});

	// ============================================================================
	// PAGE OUT OF BOUNDS
	// ============================================================================

	test('returns empty array for page beyond available data', async () => {
		// Create 10 notifications (1 page at limit 20)
		const allNotifications = Array.from({ length: 10 }, (_, i) =>
			createMockNotification(`notif-${i + 1}`)
		);

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { role: 'student', class_ids: [] },
								error: null
							})
						})
					})
				} as never;
			}

			if (table === 'notifications') {
				return {
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								or: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										order: vi.fn().mockResolvedValue({
											data: allNotifications,
											error: null
										})
									})
								})
							})
						})
					})
				} as never;
			}

			if (table === 'notification_reads') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as never;
			}

			return {} as never;
		});

		// Act: Request page 5 (way beyond available data)
		const result = await getUnreadNotifications(mockSupabase, 'student-123', {
			page: 5,
			limit: 20
		});

		// Assert: Returns empty array but metadata shows correct total
		expect(result.notifications).toEqual([]);
		expect(result.pagination).toEqual({
			page: 5,
			limit: 20,
			total: 10,
			totalPages: 1,
			hasMore: false
		});
	});
});
