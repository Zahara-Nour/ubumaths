/**
 * Notification Store Tests - Pagination
 * =====================================
 *
 * Comprehensive tests for the notification store's pagination functionality.
 * Tests state management, API integration, error handling, and optimistic updates.
 *
 * Test Coverage:
 * 1. fetchUnread() resets to page 1
 * 2. loadMore() appends notifications
 * 3. loadMore() respects hasMore flag
 * 4. loadMore() respects isLoading flag
 * 5. Pagination metadata updates
 * 6. Error handling in loadMore()
 * 7. reset() clears pagination state
 * 8. markAsRead() with pagination
 * 9. markAllAsRead() with pagination
 *
 * @module stores/notifications.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { notificationStore } from './notifications.svelte';
import type { NotificationWithDetails } from '$lib/types/notification';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock global fetch
const originalFetch = global.fetch;

// Helper to create mock notifications
function createMockNotification(id: string): NotificationWithDetails {
	return {
		id,
		created_at: new Date().toISOString(),
		created_by: 'teacher-123',
		title: `Notification ${id}`,
		message: 'Test message',
		type: 'info',
		priority: 'normal',
		action_label: null,
		action_url: null,
		target_type: 'all',
		expires_at: new Date(Date.now() + 86400000).toISOString(),
		is_system: false,
		system_event_type: null,
		creator: {
			firstname: 'John',
			lastname: 'Teacher',
			full_name: 'John Teacher'
		},
		is_read: false
	};
}

describe('NotificationStore - Pagination', () => {
	beforeEach(() => {
		// Reset store state
		notificationStore.reset();

		// Clear all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore original fetch
		global.fetch = originalFetch;
	});

	// ============================================================================
	// fetchUnread() RESETS TO PAGE 1
	// ============================================================================

	test('fetchUnread() resets to page 1', async () => {
		// Setup: Set current page to 5
		notificationStore.currentPage = 5;
		notificationStore.hasMore = true;

		// Mock API response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('notif-1'), createMockNotification('notif-2')],
				pagination: {
					page: 1,
					limit: 20,
					total: 2,
					totalPages: 1,
					hasMore: false
				}
			})
		});

		// Act
		await notificationStore.fetchUnread();

		// Assert
		expect(notificationStore.currentPage).toBe(1);
		expect(notificationStore.notifications.length).toBe(2);
		expect(notificationStore.hasMore).toBe(false);

		// Verify API was called with page=1
		expect(global.fetch).toHaveBeenCalledWith('/api/notifications/unread?page=1&limit=20');
	});

	test('fetchUnread() replaces existing notifications', async () => {
		// Setup: Pre-populate store with existing notifications
		notificationStore.notifications = [
			createMockNotification('old-1'),
			createMockNotification('old-2')
		];
		notificationStore.currentPage = 3;

		// Mock API response with new notifications
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('new-1')],
				pagination: {
					page: 1,
					limit: 20,
					total: 1,
					totalPages: 1,
					hasMore: false
				}
			})
		});

		// Act
		await notificationStore.fetchUnread();

		// Assert: Old notifications replaced with new ones
		expect(notificationStore.notifications.length).toBe(1);
		expect(notificationStore.notifications[0].id).toBe('new-1');
		expect(notificationStore.currentPage).toBe(1);
	});

	// ============================================================================
	// loadMore() APPENDS NOTIFICATIONS
	// ============================================================================

	test('loadMore() appends notifications to existing list', async () => {
		// Setup: Load page 1 first
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('page1-1'), createMockNotification('page1-2')],
				pagination: {
					page: 1,
					limit: 20,
					total: 25,
					totalPages: 2,
					hasMore: true
				}
			})
		});

		await notificationStore.fetchUnread();

		expect(notificationStore.notifications.length).toBe(2);
		expect(notificationStore.currentPage).toBe(1);

		// Mock page 2 response
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('page2-1'), createMockNotification('page2-2')],
				pagination: {
					page: 2,
					limit: 20,
					total: 25,
					totalPages: 2,
					hasMore: false
				}
			})
		});

		// Act: Load more
		await notificationStore.loadMore();

		// Assert: Notifications appended (not replaced)
		expect(notificationStore.notifications.length).toBe(4);
		expect(notificationStore.notifications[0].id).toBe('page1-1');
		expect(notificationStore.notifications[1].id).toBe('page1-2');
		expect(notificationStore.notifications[2].id).toBe('page2-1');
		expect(notificationStore.notifications[3].id).toBe('page2-2');
		expect(notificationStore.currentPage).toBe(2);
		expect(notificationStore.hasMore).toBe(false);
	});

	test('loadMore() increments current page', async () => {
		// Setup initial state
		notificationStore.notifications = [createMockNotification('initial')];
		notificationStore.currentPage = 1;
		notificationStore.hasMore = true;

		// Mock API response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('page2')],
				pagination: {
					page: 2,
					limit: 20,
					total: 25,
					totalPages: 2,
					hasMore: false
				}
			})
		});

		// Act
		await notificationStore.loadMore();

		// Assert
		expect(notificationStore.currentPage).toBe(2);
		expect(global.fetch).toHaveBeenCalledWith('/api/notifications/unread?page=2&limit=20');
	});

	// ============================================================================
	// loadMore() RESPECTS hasMore FLAG
	// ============================================================================

	test('loadMore() does not load when hasMore is false', async () => {
		// Setup: No more pages available
		notificationStore.notifications = [createMockNotification('notif-1')];
		notificationStore.currentPage = 1;
		notificationStore.hasMore = false;

		// Mock fetch (should NOT be called)
		global.fetch = vi.fn();

		// Act
		await notificationStore.loadMore();

		// Assert: No API call made
		expect(global.fetch).not.toHaveBeenCalled();

		// Assert: Notifications unchanged
		expect(notificationStore.notifications.length).toBe(1);
		expect(notificationStore.currentPage).toBe(1);
	});

	// ============================================================================
	// loadMore() RESPECTS isLoading FLAG
	// ============================================================================

	test('loadMore() does not load when isLoading is true', async () => {
		// Setup: Set loading state
		notificationStore.isLoading = true;
		notificationStore.hasMore = true;
		notificationStore.currentPage = 1;

		// Mock fetch (should NOT be called)
		global.fetch = vi.fn();

		// Act
		await notificationStore.loadMore();

		// Assert: No API call made
		expect(global.fetch).not.toHaveBeenCalled();
	});

	test('loadMore() sets isLoading correctly during request', async () => {
		// Setup
		notificationStore.hasMore = true;
		notificationStore.currentPage = 1;
		notificationStore.isLoading = false;

		// Mock slow API response
		let resolveResponse: (value: Response) => void;
		const fetchPromise = new Promise<Response>((resolve) => {
			resolveResponse = resolve;
		});

		global.fetch = vi.fn().mockReturnValue(fetchPromise);

		// Act: Start loading
		const loadPromise = notificationStore.loadMore();

		// Assert: isLoading should be true during request
		expect(notificationStore.isLoading).toBe(true);

		// Resolve the fetch
		resolveResponse!({
			ok: true,
			json: async () => ({
				notifications: [],
				pagination: {
					page: 2,
					limit: 20,
					total: 0,
					totalPages: 1,
					hasMore: false
				}
			})
		} as Response);

		await loadPromise;

		// Assert: isLoading should be false after completion
		expect(notificationStore.isLoading).toBe(false);
	});

	// ============================================================================
	// PAGINATION METADATA UPDATES
	// ============================================================================

	test('pagination metadata updates correctly on fetchUnread()', async () => {
		// Mock API response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('notif-1')],
				pagination: {
					page: 1,
					limit: 20,
					total: 45,
					totalPages: 3,
					hasMore: true
				}
			})
		});

		// Act
		await notificationStore.fetchUnread();

		// Assert: All pagination metadata updated
		expect(notificationStore.currentPage).toBe(1);
		expect(notificationStore.totalPages).toBe(3);
		expect(notificationStore.hasMore).toBe(true);
		expect(notificationStore.unreadCount).toBe(45);
	});

	test('pagination metadata updates correctly on loadMore()', async () => {
		// Setup initial state
		notificationStore.notifications = [createMockNotification('page1')];
		notificationStore.currentPage = 1;
		notificationStore.totalPages = 3;
		notificationStore.hasMore = true;

		// Mock API response for page 2
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('page2')],
				pagination: {
					page: 2,
					limit: 20,
					total: 45,
					totalPages: 3,
					hasMore: true
				}
			})
		});

		// Act
		await notificationStore.loadMore();

		// Assert
		expect(notificationStore.currentPage).toBe(2);
		expect(notificationStore.totalPages).toBe(3);
		expect(notificationStore.hasMore).toBe(true);
	});

	test('hasMore becomes false on last page', async () => {
		// Setup: On page 2 of 3
		notificationStore.notifications = [
			createMockNotification('page1'),
			createMockNotification('page2')
		];
		notificationStore.currentPage = 2;
		notificationStore.totalPages = 3;
		notificationStore.hasMore = true;

		// Mock API response for page 3 (last page)
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [createMockNotification('page3')],
				pagination: {
					page: 3,
					limit: 20,
					total: 45,
					totalPages: 3,
					hasMore: false
				}
			})
		});

		// Act
		await notificationStore.loadMore();

		// Assert
		expect(notificationStore.currentPage).toBe(3);
		expect(notificationStore.hasMore).toBe(false);
	});

	// ============================================================================
	// ERROR HANDLING IN loadMore()
	// ============================================================================

	test('loadMore() handles fetch error gracefully', async () => {
		// Setup
		notificationStore.notifications = [createMockNotification('existing')];
		notificationStore.currentPage = 1;
		notificationStore.hasMore = true;

		// Mock fetch to throw error
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

		// Act
		await notificationStore.loadMore();

		// Assert: Existing notifications not cleared
		expect(notificationStore.notifications.length).toBe(1);
		expect(notificationStore.notifications[0].id).toBe('existing');

		// Assert: Error state set
		expect(notificationStore.error).toBe('Échec du chargement des notifications');

		// Assert: isLoading reset to false
		expect(notificationStore.isLoading).toBe(false);
	});

	test('loadMore() handles non-ok response gracefully', async () => {
		// Setup
		notificationStore.notifications = [createMockNotification('existing')];
		notificationStore.currentPage = 1;
		notificationStore.hasMore = true;

		// Mock fetch to return error response
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error'
		});

		// Act
		await notificationStore.loadMore();

		// Assert: Existing notifications not cleared
		expect(notificationStore.notifications.length).toBe(1);

		// Assert: Error state set
		expect(notificationStore.error).toBe('Échec du chargement des notifications');

		// Assert: isLoading reset to false
		expect(notificationStore.isLoading).toBe(false);
	});

	test('loadMore() does not increment page on error', async () => {
		// Setup
		notificationStore.currentPage = 1;
		notificationStore.hasMore = true;

		// Mock fetch to fail
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

		// Act
		await notificationStore.loadMore();

		// Assert: Page not incremented
		expect(notificationStore.currentPage).toBe(1);
	});

	// ============================================================================
	// reset() CLEARS PAGINATION STATE
	// ============================================================================

	test('reset() clears all pagination state', () => {
		// Setup: Populate store with data
		notificationStore.notifications = [
			createMockNotification('notif-1'),
			createMockNotification('notif-2')
		];
		notificationStore.unreadCount = 25;
		notificationStore.currentPage = 3;
		notificationStore.pageSize = 20;
		notificationStore.totalPages = 5;
		notificationStore.hasMore = true;
		notificationStore.isLoading = true;
		notificationStore.error = 'Some error';

		// Act
		notificationStore.reset();

		// Assert: All state reset to defaults
		expect(notificationStore.notifications).toEqual([]);
		expect(notificationStore.unreadCount).toBe(0);
		expect(notificationStore.currentPage).toBe(1);
		expect(notificationStore.pageSize).toBe(20);
		expect(notificationStore.totalPages).toBe(1);
		expect(notificationStore.hasMore).toBe(false);
		expect(notificationStore.isLoading).toBe(false);
		expect(notificationStore.error).toBe(null);
	});

	// ============================================================================
	// ERROR HANDLING IN fetchUnread()
	// ============================================================================

	test('fetchUnread() handles fetch error gracefully', async () => {
		// Mock fetch to throw error
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

		// Act
		await notificationStore.fetchUnread();

		// Assert: State reset to empty/default
		expect(notificationStore.notifications).toEqual([]);
		expect(notificationStore.unreadCount).toBe(0);
		expect(notificationStore.totalPages).toBe(1);
		expect(notificationStore.hasMore).toBe(false);

		// Assert: Error message set
		expect(notificationStore.error).toBe('Erreur lors du chargement des notifications');

		// Assert: isLoading reset to false
		expect(notificationStore.isLoading).toBe(false);
	});

	test('fetchUnread() handles non-ok response gracefully', async () => {
		// Mock fetch to return error response
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			statusText: 'Unauthorized'
		});

		// Act
		await notificationStore.fetchUnread();

		// Assert: State reset to empty/default
		expect(notificationStore.notifications).toEqual([]);
		expect(notificationStore.unreadCount).toBe(0);

		// Assert: Error message set
		expect(notificationStore.error).toBe('Erreur lors du chargement des notifications');
	});

	// ============================================================================
	// INTEGRATION: markAsRead() WITH PAGINATION
	// ============================================================================

	test('markAsRead() removes notification from paginated list', async () => {
		// Setup: Load notifications
		notificationStore.notifications = [
			createMockNotification('notif-1'),
			createMockNotification('notif-2'),
			createMockNotification('notif-3')
		];
		notificationStore.unreadCount = 3;

		// Mock successful mark as read
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: true })
		});

		// Act
		await notificationStore.markAsRead('notif-2');

		// Assert: Notification removed
		expect(notificationStore.notifications.length).toBe(2);
		expect(notificationStore.notifications.find((n) => n.id === 'notif-2')).toBeUndefined();

		// Assert: Unread count decremented
		expect(notificationStore.unreadCount).toBe(2);
	});

	test('markAsRead() rolls back on error by refetching', async () => {
		// Setup: Load notifications
		notificationStore.notifications = [
			createMockNotification('notif-1'),
			createMockNotification('notif-2')
		];
		notificationStore.unreadCount = 2;

		// Mock mark as read to fail
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 500
			})
			// Mock refetch response
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					notifications: [createMockNotification('notif-1'), createMockNotification('notif-2')],
					pagination: {
						page: 1,
						limit: 20,
						total: 2,
						totalPages: 1,
						hasMore: false
					}
				})
			});

		// Act
		const result = await notificationStore.markAsRead('notif-1');

		// Assert: Operation failed
		expect(result).toBe(false);

		// Assert: Refetch was called to restore correct state
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	// ============================================================================
	// INTEGRATION: markAllAsRead() WITH PAGINATION
	// ============================================================================

	test('markAllAsRead() clears all paginated notifications', async () => {
		// Setup: Multiple pages of notifications
		notificationStore.notifications = [
			createMockNotification('page1-1'),
			createMockNotification('page1-2'),
			createMockNotification('page2-1')
		];
		notificationStore.unreadCount = 45;
		notificationStore.currentPage = 2;

		// Mock successful mark all as read
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: true })
		});

		// Act
		await notificationStore.markAllAsRead();

		// Assert: All notifications cleared
		expect(notificationStore.notifications).toEqual([]);
		expect(notificationStore.unreadCount).toBe(0);
	});

	test('markAllAsRead() does nothing when unreadCount is 0', async () => {
		// Setup: No unread notifications
		notificationStore.notifications = [];
		notificationStore.unreadCount = 0;

		// Mock fetch (should NOT be called)
		global.fetch = vi.fn();

		// Act
		await notificationStore.markAllAsRead();

		// Assert: No API call made
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	test('handles empty page in loadMore()', async () => {
		// Setup
		notificationStore.notifications = [createMockNotification('page1')];
		notificationStore.currentPage = 1;
		notificationStore.hasMore = true;

		// Mock API response with empty array (edge case: concurrent deletion)
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				notifications: [],
				pagination: {
					page: 2,
					limit: 20,
					total: 1,
					totalPages: 1,
					hasMore: false
				}
			})
		});

		// Act
		await notificationStore.loadMore();

		// Assert: No crash, existing notifications preserved
		expect(notificationStore.notifications.length).toBe(1);
		expect(notificationStore.currentPage).toBe(2);
		expect(notificationStore.hasMore).toBe(false);
	});

	test('handles malformed API response gracefully', async () => {
		// Setup
		notificationStore.notifications = [createMockNotification('existing')];
		notificationStore.hasMore = true;

		// Mock API response with missing fields
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				// Missing 'notifications' field
				pagination: {
					page: 2,
					limit: 20,
					total: 10,
					totalPages: 1,
					hasMore: false
				}
			})
		});

		// Act
		await notificationStore.loadMore();

		// Assert: Handles gracefully (appends empty array or existing preserved)
		// The store uses `|| []` fallback, so this should work
		expect(notificationStore.notifications.length).toBeGreaterThanOrEqual(1);
	});
});
