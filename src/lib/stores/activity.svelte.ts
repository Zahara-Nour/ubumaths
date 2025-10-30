/**
 * Activity Store
 *
 * Provides manual refresh functionality for activity counters (notifications, messages).
 * Fetches unread counts from two separate API endpoints in parallel:
 * - /api/notifications/unread-count
 * - /api/messages/unread-count
 *
 * ARCHITECTURE:
 * - No automatic polling - counters update on user actions only
 * - Manual refresh via refresh() method
 * - Used in dashboard layout for initial data load
 * - Updates both notificationStore.unreadCount and privateMessages.unreadCount
 *
 * USAGE:
 * ```typescript
 * import { activityStore } from '$lib/stores/activity.svelte';
 *
 * // Fetch initial data on dashboard load
 * activityStore.refresh();
 *
 * // After user action that may change counts
 * await markNotificationAsRead(notificationId);
 * activityStore.refresh(); // Refresh counts
 * ```
 *
 * ERROR HANDLING:
 * - On error, preserves existing counts to avoid UI flicker
 * - Errors are logged but don't throw
 */

import { notificationStore } from './notifications.svelte';
import { privateMessages } from './privateMessages.svelte';

/**
 * Activity store class
 * Manages manual refresh for notifications and messages
 */
class ActivityStore {
	/**
	 * Fetch unread counts from individual API endpoints
	 *
	 * Updates both notificationStore.unreadCount and privateMessages.unreadCount
	 * On error, preserves existing counts to avoid UI flicker
	 *
	 * @throws No errors - failures are logged and existing state preserved
	 */
	async fetchUnreadCounts(): Promise<void> {
		try {
			// Fetch both counts in parallel
			const [notificationsRes, messagesRes] = await Promise.all([
				fetch('/api/notifications/unread-count'),
				fetch('/api/messages/unread-count')
			]);

			// Parse responses
			const notificationsData = notificationsRes.ok
				? await notificationsRes.json()
				: { unreadCount: 0 };
			const messagesData = messagesRes.ok ? await messagesRes.json() : { unreadCount: 0 };

			// Update individual stores with their respective counts
			notificationStore.unreadCount = notificationsData.unreadCount || 0;
			privateMessages.unreadCount = messagesData.unreadCount || 0;
		} catch (err) {
			console.error('Error fetching activity counts:', err);
			// On error, don't reset counts to avoid UI flicker
		}
	}

	/**
	 * Manually trigger a refresh (useful after user actions)
	 */
	async refresh(): Promise<void> {
		await this.fetchUnreadCounts();
	}
}

// Export singleton instance
export const activityStore = new ActivityStore();
