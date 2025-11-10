/**
 * Notification Store
 *
 * Client-side store for managing notification state.
 * Note: Manual refresh only - no automatic polling (architecture simplified 2025-10-30)
 */

import type { NotificationWithDetails } from '$lib/types/notification';

/**
 * Notification store class
 */
class NotificationStore {
	// Reactive state
	unreadCount = $state(0);
	notifications = $state<NotificationWithDetails[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Pagination state
	currentPage = $state(1);
	pageSize = $state(20);
	totalPages = $state(1);
	hasMore = $state(false);

	/**
	 * Fetch unread notifications from API (resets to page 1)
	 */
	async fetchUnread(): Promise<void> {
		this.isLoading = true;
		this.error = null;
		this.currentPage = 1; // Reset to first page

		try {
			const response = await fetch(`/api/notifications/unread?page=1&limit=${this.pageSize}`);

			if (!response.ok) {
				throw new Error('Failed to fetch notifications');
			}

			const data = await response.json();
			this.notifications = data.notifications || [];
			this.unreadCount = data.pagination?.total || 0;
			this.totalPages = data.pagination?.totalPages || 1;
			this.hasMore = data.pagination?.hasMore || false;
		} catch (err) {
			console.error('Error fetching notifications:', err);
			this.error = 'Erreur lors du chargement des notifications';
			this.notifications = [];
			this.unreadCount = 0;
			this.totalPages = 1;
			this.hasMore = false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Load more notifications (appends next page)
	 */
	async loadMore(): Promise<void> {
		if (!this.hasMore || this.isLoading) return;

		this.isLoading = true;
		const nextPage = this.currentPage + 1;

		try {
			const response = await fetch(
				`/api/notifications/unread?page=${nextPage}&limit=${this.pageSize}`
			);

			if (!response.ok) {
				throw new Error('Failed to load more notifications');
			}

			const data = await response.json();

			// Append new notifications (don't replace)
			this.notifications = [...this.notifications, ...(data.notifications || [])];
			this.currentPage = nextPage;
			this.hasMore = data.pagination?.hasMore || false;
			this.totalPages = data.pagination?.totalPages || 1;
		} catch (err) {
			console.error('Failed to load more notifications:', err);
			this.error = 'Échec du chargement des notifications';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Fetch only the unread count (lighter request)
	 */
	async fetchUnreadCount(): Promise<void> {
		try {
			const response = await fetch('/api/notifications/unread-count');

			if (!response.ok) {
				throw new Error('Failed to fetch unread count');
			}

			const data = await response.json();
			this.unreadCount = data.count || 0;
		} catch (err) {
			console.error('Error fetching unread count:', err);
		}
	}

	/**
	 * Mark a notification as read
	 */
	async markAsRead(notificationId: string): Promise<boolean> {
		try {
			const response = await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ notificationId })
			});

			if (!response.ok) {
				throw new Error('Failed to mark notification as read');
			}

			// Optimistic update
			this.notifications = this.notifications.filter((n) => n.id !== notificationId);
			this.unreadCount = Math.max(0, this.unreadCount - 1);

			return true;
		} catch (err) {
			console.error('Error marking notification as read:', err);
			// Rollback - refetch to get correct state
			await this.fetchUnread();
			return false;
		}
	}

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead(): Promise<boolean> {
		if (this.unreadCount === 0) {
			return true;
		}

		try {
			const response = await fetch('/api/notifications/mark-all-read', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to mark all notifications as read');
			}

			// Optimistic update
			this.notifications = [];
			this.unreadCount = 0;

			return true;
		} catch (err) {
			console.error('Error marking all notifications as read:', err);
			// Rollback - refetch to get correct state
			await this.fetchUnread();
			return false;
		}
	}

	/**
	 * Reset store state
	 */
	reset(): void {
		this.notifications = [];
		this.unreadCount = 0;
		this.isLoading = false;
		this.error = null;
		this.currentPage = 1;
		this.pageSize = 20;
		this.totalPages = 1;
		this.hasMore = false;
	}

	/**
	 * Get notifications sorted by priority and date
	 * (urgent first, then by newest)
	 */
	get sortedNotifications(): NotificationWithDetails[] {
		return [...this.notifications]; // Already sorted from server
	}

	/**
	 * Get the top N unread notifications for display in banner/dropdown
	 */
	getTopNotifications(limit = 5): NotificationWithDetails[] {
		return this.sortedNotifications.slice(0, limit);
	}

	/**
	 * Check if there are urgent notifications
	 */
	get hasUrgentNotifications(): boolean {
		return this.notifications.some((n) => n.priority === 'urgent');
	}

	/**
	 * Get count of urgent notifications
	 */
	get urgentCount(): number {
		return this.notifications.filter((n) => n.priority === 'urgent').length;
	}
}

// Export singleton instance
export const notificationStore = new NotificationStore();
