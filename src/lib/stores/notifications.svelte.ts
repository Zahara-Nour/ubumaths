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

	/**
	 * Fetch unread notifications from API
	 *
	 * @param page - Page number (default: 1)
	 * @param limit - Items per page (default: 20)
	 */
	async fetchUnread(page = 1, limit = 20): Promise<void> {
		this.isLoading = true;
		this.error = null;

		try {
			const params = new URLSearchParams();
			if (page !== 1) params.set('page', page.toString());
			if (limit !== 20) params.set('limit', limit.toString());

			const url = `/api/notifications/unread${params.toString() ? `?${params.toString()}` : ''}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error('Failed to fetch notifications');
			}

			const data = await response.json();
			this.notifications = data.notifications || [];
			this.unreadCount = data.pagination?.total || this.notifications.length;
		} catch (err) {
			console.error('Error fetching notifications:', err);
			this.error = 'Erreur lors du chargement des notifications';
			this.notifications = [];
			this.unreadCount = 0;
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
