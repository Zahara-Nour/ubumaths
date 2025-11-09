import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { notificationStore } from './notifications.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('notificationsRealtime.svelte.ts');

/**
 * Channel name for user notifications
 */
const CHANNEL_NAME = 'user-notifications';

/**
 * Real-time Notifications Manager
 *
 * Subscribes to postgres_changes INSERT/UPDATE events on the notifications table
 * and triggers the existing notificationStore to refetch when changes occur.
 *
 * This is a thin integration layer:
 * - Listens to database changes via Supabase Realtime
 * - Delegates all notification logic to notificationStore
 * - Does not duplicate fetching/storage logic
 *
 * Why refetch instead of using payload?
 * - notificationStore.fetchUnread() does complex queries with JOINs (sender profiles, etc.)
 * - postgres_changes payload.new is just the raw notifications row
 * - Refetching is simpler and more reliable than reconstructing joined data
 *
 * @example
 * ```ts
 * import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
 *
 * // Initialize
 * notificationsRealtimeManager.init(supabase, userId);
 *
 * // Start listening to real-time updates
 * await notificationsRealtimeManager.startListening();
 *
 * // Stop listening
 * await notificationsRealtimeManager.stopListening();
 * ```
 */
class NotificationsRealtimeManager {
	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;
	private isListening = $state(false);

	/**
	 * Initialize the real-time manager with a Supabase client
	 *
	 * @param client - Supabase client instance
	 * @param currentUserId - Current authenticated user ID
	 */
	init(client: SupabaseClient<Database>, currentUserId: string): void {
		if (!browser) {
			logger.warn('Cannot initialize on server');
			return;
		}

		this.supabase = client;
		this.userId = currentUserId;

		// Initialize the underlying realtime manager
		supabaseRealtimeManager.init(client, currentUserId);

		logger.info('Notifications realtime manager initialized for user:', currentUserId);
	}

	/**
	 * Start listening to real-time notification changes
	 *
	 * Subscribes to:
	 * - INSERT events: New notifications for the current user
	 * - UPDATE events: Notification status changes (e.g., mark as read)
	 */
	async startListening(): Promise<void> {
		if (!browser) {
			logger.warn('Cannot start listening on server');
			return;
		}

		if (!this.supabase || !this.userId) {
			logger.error('Manager not initialized. Call init() first.');
			return;
		}

		if (this.isListening) {
			logger.info('Already listening to notifications');
			return;
		}

		logger.info('Starting to listen to notification changes...');

		// Create channel
		const channel = supabaseRealtimeManager.createChannel(CHANNEL_NAME);

		// Subscribe to INSERT events (new notifications)
		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'notifications',
				filter: `user_id=eq.${this.userId}`
			},
			(payload) => {
				logger.info('New notification received:', payload);
				this.handleNewNotification(payload);
			}
		);

		// Subscribe to UPDATE events (notification read status changes)
		channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'notifications',
				filter: `user_id=eq.${this.userId}`
			},
			(payload) => {
				logger.info('Notification updated:', payload);
				this.handleNotificationUpdate(payload);
			}
		);

		// Subscribe to the channel
		await supabaseRealtimeManager.subscribeChannel(CHANNEL_NAME);

		this.isListening = true;
		logger.info('Successfully started listening to notification changes');
	}

	/**
	 * Handle new notification insert
	 *
	 * Triggers notificationStore to refetch unread notifications.
	 * We refetch because we need the full notification with JOINs (sender profile, etc.),
	 * which postgres_changes payload.new doesn't provide.
	 *
	 * @param _payload - Postgres change payload (not used, we refetch instead)
	 */
	private handleNewNotification(_payload: unknown): void {
		logger.info('Handling new notification, triggering refetch...');

		// Trigger refetch to get full notification data with JOINs
		notificationStore.fetchUnread().catch((err) => {
			logger.error('Failed to refetch notifications after INSERT:', err);
		});
	}

	/**
	 * Handle notification update
	 *
	 * Currently no action needed - optimistic updates are already handled
	 * in notificationStore.markAsRead() and markAllAsRead().
	 *
	 * @param _payload - Postgres change payload
	 */
	private handleNotificationUpdate(_payload: unknown): void {
		logger.info('Notification update received (optimistic update already applied)');
		// No action needed - optimistic updates already handled
	}

	/**
	 * Stop listening to real-time notification changes
	 */
	async stopListening(): Promise<void> {
		if (!browser) {
			logger.warn('Cannot stop listening on server');
			return;
		}

		if (!this.isListening) {
			logger.info('Not currently listening');
			return;
		}

		logger.info('Stopping notification listener...');

		// Unsubscribe from channel
		await supabaseRealtimeManager.unsubscribeChannel(CHANNEL_NAME);

		this.isListening = false;
		logger.info('Stopped listening to notification changes');
	}

	/**
	 * Get current listening status
	 */
	get listening(): boolean {
		return this.isListening;
	}
}

// Export singleton instance
export const notificationsRealtimeManager = new NotificationsRealtimeManager();
