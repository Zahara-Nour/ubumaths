/**
 * Notification Store
 *
 * Client-side store for managing notification state.
 * Note: Manual refresh only - no automatic polling (architecture simplified 2025-10-30)
 */

import type { NotificationWithDetails } from '$lib/types/notification';
import { toaster } from '$lib/stores/toaster.svelte';

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
	 * Mark a notification as read (optimistic UI)
	 * Updates UI immediately, shows toast only on error
	 * Uses granular rollback to avoid conflicts with concurrent operations
	 */
	markAsRead(notificationId: string): void {
		// Find the notification and its index for granular rollback
		const index = this.notifications.findIndex((n) => n.id === notificationId);
		if (index === -1) return; // Already removed or doesn't exist

		const removedNotification = this.notifications[index];

		// Optimistic update - immediate UI feedback
		this.notifications = this.notifications.filter((n) => n.id !== notificationId);
		this.unreadCount = Math.max(0, this.unreadCount - 1);

		// Fire request in background
		fetch('/api/notifications/mark-read', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ notificationId })
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error('Failed to mark notification as read');
				}
			})
			.catch((err) => {
				console.error('Error marking notification as read:', err);
				// Granular rollback: only re-insert the failed notification
				const currentNotifications = [...this.notifications];
				const insertIndex = Math.min(index, currentNotifications.length);
				currentNotifications.splice(insertIndex, 0, removedNotification);
				this.notifications = currentNotifications;
				this.unreadCount = this.unreadCount + 1;
				// Show error toast
				toaster.error('Erreur lors du marquage de la notification');
			});
	}

	/**
	 * Mark all notifications as read (optimistic UI)
	 * Updates UI immediately, shows toast only on error
	 */
	markAllAsRead(): void {
		if (this.unreadCount === 0) {
			return;
		}

		// Save previous state for rollback
		const previousNotifications = this.notifications;
		const previousUnreadCount = this.unreadCount;

		// Optimistic update - immediate UI feedback
		this.notifications = [];
		this.unreadCount = 0;

		// Fire request in background
		fetch('/api/notifications/mark-all-read', {
			method: 'POST'
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error('Failed to mark all notifications as read');
				}
			})
			.catch((err) => {
				console.error('Error marking all notifications as read:', err);
				// Rollback on error
				this.notifications = previousNotifications;
				this.unreadCount = previousUnreadCount;
				// Show error toast
				toaster.error('Erreur lors du marquage des notifications');
			});
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
