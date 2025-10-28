/**
 * Unified Activity Store
 *
 * Central polling mechanism for user activity counters (notifications, messages)
 * Reduces database load by combining multiple polling requests into a single endpoint
 */

import { notificationStore } from './notifications.svelte';
import { privateMessages } from './privateMessages.svelte';

/**
 * Default polling interval for activity counts (30 seconds)
 * Balances data freshness with server load reduction
 */
const DEFAULT_POLL_INTERVAL_MS = 30000;

/**
 * Activity store class
 * Manages unified polling for notifications and messages
 */
class ActivityStore {
	// Polling state
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
	private isPolling = $state(false);

	/**
	 * Fetch unread counts from unified API endpoint
	 *
	 * Updates both notificationStore.unreadCount and privateMessages.unreadCount
	 * On error, preserves existing counts to avoid UI flicker
	 *
	 * @throws No errors - failures are logged and existing state preserved
	 */
	async fetchUnreadCounts(): Promise<void> {
		try {
			const response = await fetch('/api/activity/unread-counts');

			if (!response.ok) {
				throw new Error('Failed to fetch activity counts');
			}

			const data = await response.json();

			// Update individual stores with their respective counts
			notificationStore.unreadCount = data.notifications || 0;
			privateMessages.unreadCount = data.messages || 0;
		} catch (err) {
			console.error('Error fetching activity counts:', err);
			// On error, don't reset counts to avoid UI flicker
		}
	}

	/**
	 * Start unified polling
	 *
	 * @param intervalMs - Polling interval in milliseconds (default: 30000)
	 */
	startPolling(intervalMs = DEFAULT_POLL_INTERVAL_MS): void {
		// Don't start if already polling
		if (this.pollInterval !== null) {
			return;
		}

		this.pollIntervalMs = intervalMs;
		this.isPolling = true;

		// Initial fetch
		this.fetchUnreadCounts();

		// Start polling
		this.pollInterval = setInterval(() => {
			this.fetchUnreadCounts();
		}, this.pollIntervalMs);
	}

	/**
	 * Stop polling
	 */
	stopPolling(): void {
		if (this.pollInterval !== null) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		this.isPolling = false;
	}

	/**
	 * Get current polling status
	 */
	get polling(): boolean {
		return this.isPolling;
	}

	/**
	 * Manually trigger a refresh (useful after user actions)
	 */
	async refresh(): Promise<void> {
		await this.fetchUnreadCounts();
	}

	/**
	 * Reset and cleanup
	 */
	reset(): void {
		this.stopPolling();
	}
}

// Export singleton instance
export const activityStore = new ActivityStore();
