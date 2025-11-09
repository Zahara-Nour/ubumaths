/**
 * Presence Manager Store
 *
 * Tracks online/offline status of friends using Supabase Realtime postgres_changes.
 * Replaces the old WebSocket heartbeat system with database-driven presence tracking.
 *
 * CRITICAL: Heartbeat interval is set to 180 seconds (3 minutes) to stay within
 * Supabase free tier limits for Realtime connections and RPCs.
 *
 * Architecture:
 * - Subscribes to user_presence table changes via postgres_changes
 * - Filters events to only track specified friend IDs
 * - Sends heartbeat every 180s to maintain own presence
 * - Uses supabaseRealtimeManager for channel lifecycle
 *
 * @module stores/presence
 */

import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('PresenceManager');

/**
 * Heartbeat interval in milliseconds.
 * CRITICAL: Set to 180 seconds (3 minutes) to stay within Supabase free tier.
 * DO NOT CHANGE without recalculating quota impact.
 */
const HEARTBEAT_INTERVAL = 180000; // 180 seconds

/**
 * Channel name for presence updates.
 * Used by supabaseRealtimeManager to manage the Realtime subscription.
 */
const CHANNEL_NAME = 'user-presence-updates';

/**
 * User presence status type.
 */
type PresenceStatus = 'online' | 'offline';

/**
 * Payload from postgres_changes events on user_presence table.
 */
interface PresencePayload {
	eventType: 'INSERT' | 'UPDATE' | 'DELETE';
	new: {
		user_id: string;
		status: PresenceStatus;
		last_seen: string;
	};
	old: {
		user_id: string;
	};
}

/**
 * Presence Manager
 *
 * Singleton class that manages friend presence tracking using Supabase Realtime.
 * Uses Svelte 5 runes for reactive state management.
 *
 * Usage:
 * ```typescript
 * import { presenceManager } from '$lib/stores/presence.svelte';
 *
 * // Initialize (once)
 * presenceManager.init(supabase, userId);
 *
 * // Start tracking friends
 * await presenceManager.startPresenceTracking(['friend-id-1', 'friend-id-2']);
 *
 * // Get friend status
 * const status = presenceManager.getFriendPresence('friend-id-1');
 *
 * // Stop tracking
 * await presenceManager.stopPresenceTracking();
 * ```
 */
class PresenceManager {
	/**
	 * Map of friend user IDs to their presence status.
	 * Reactive state using Svelte 5 $state rune.
	 */
	private friendsPresence = $state<Map<string, PresenceStatus>>(new Map());

	/**
	 * Supabase client instance.
	 */
	private supabase: SupabaseClient<Database> | null = null;

	/**
	 * Current user's ID.
	 */
	private userId: string | null = null;

	/**
	 * Array of friend IDs being tracked.
	 */
	private friendIds: string[] = [];

	/**
	 * Heartbeat interval timer.
	 */
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Initialize the presence manager.
	 *
	 * @param supabase - Supabase client instance
	 * @param userId - Current user's ID
	 */
	init(supabase: SupabaseClient<Database>, userId: string): void {
		if (!browser) return;

		this.supabase = supabase;
		this.userId = userId;

		// Initialize the Realtime manager
		supabaseRealtimeManager.init(supabase, userId);

		logger.info('Presence manager initialized', { userId });
	}

	/**
	 * Start tracking presence for specified friends.
	 *
	 * Subscribes to postgres_changes on user_presence table, fetches initial state,
	 * and starts sending heartbeats to maintain own presence.
	 *
	 * @param friendIds - Array of friend user IDs to track
	 */
	async startPresenceTracking(friendIds: string[]): Promise<void> {
		if (!browser || !this.supabase || !this.userId) {
			logger.warn('Cannot start presence tracking: not initialized or not in browser');
			return;
		}

		// Store friend IDs
		this.friendIds = friendIds;

		// Handle empty friend list
		if (friendIds.length === 0) {
			logger.info('No friends to track presence for');
			// Still start heartbeat to maintain own presence
			this.startHeartbeat();
			return;
		}

		// Create filter for postgres_changes
		// Example: "user_id=in.(id1,id2,id3)"
		const filter = `user_id=in.(${friendIds.join(',')})`;

		logger.info('Starting presence tracking', {
			friendCount: friendIds.length,
			filter
		});

		// Subscribe to postgres_changes on user_presence table
		const channel = supabaseRealtimeManager.createChannel(CHANNEL_NAME);

		channel.on(
			'postgres_changes',
			{
				event: '*', // Listen to INSERT, UPDATE, DELETE
				schema: 'public',
				table: 'user_presence',
				filter
			},
			(payload) => {
				this.handlePresenceUpdate(payload as unknown as PresencePayload);
			}
		);

		await supabaseRealtimeManager.subscribeChannel(CHANNEL_NAME);

		// Fetch initial presence state
		await this.fetchInitialPresence();

		// Start heartbeat to maintain own presence
		this.startHeartbeat();

		logger.info('Presence tracking started successfully');
	}

	/**
	 * Fetch initial presence state from database.
	 *
	 * Populates friendsPresence map with current status of all tracked friends.
	 */
	private async fetchInitialPresence(): Promise<void> {
		if (!this.supabase || this.friendIds.length === 0) return;

		try {
			const { data, error } = await this.supabase
				.from('user_presence')
				.select('user_id, status')
				.in('user_id', this.friendIds);

			if (error) {
				logger.error('Failed to fetch initial presence', { error });
				return;
			}

			// Populate presence map
			if (data) {
				for (const row of data) {
					this.friendsPresence.set(row.user_id, row.status as PresenceStatus);
				}
			}

			logger.info('Initial presence fetched', { count: data?.length || 0 });
		} catch (error) {
			logger.error('Error fetching initial presence', { error });
		}
	}

	/**
	 * Handle postgres_changes events from user_presence table.
	 *
	 * Updates friendsPresence map based on INSERT/UPDATE/DELETE events.
	 *
	 * @param payload - Postgres changes payload
	 */
	private handlePresenceUpdate(payload: PresencePayload): void {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		if (eventType === 'DELETE') {
			// User presence record deleted - mark as offline
			const userId = oldRecord.user_id;
			this.friendsPresence.set(userId, 'offline');
			logger.trace('Friend went offline (DELETE)', { userId });
		} else if (eventType === 'INSERT' || eventType === 'UPDATE') {
			// User presence record created or updated
			const { user_id, status } = newRecord;
			this.friendsPresence.set(user_id, status);
			logger.trace('Friend presence updated', {
				userId: user_id,
				status,
				eventType
			});
		}
	}

	/**
	 * Start heartbeat interval to maintain own presence.
	 *
	 * Sends heartbeat every HEARTBEAT_INTERVAL (180s) to upsert own presence record.
	 */
	private startHeartbeat(): void {
		if (!browser) return;

		// Clear any existing interval
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		// Send initial heartbeat immediately
		void this.sendHeartbeat();

		// Set up recurring heartbeat
		this.heartbeatInterval = setInterval(() => {
			void this.sendHeartbeat();
		}, HEARTBEAT_INTERVAL);

		logger.info('Heartbeat started', {
			intervalSeconds: HEARTBEAT_INTERVAL / 1000
		});
	}

	/**
	 * Send a single heartbeat to maintain own presence.
	 *
	 * Calls upsert_user_presence RPC to mark self as online.
	 */
	private async sendHeartbeat(): Promise<void> {
		if (!this.supabase || !this.userId) return;

		try {
			const { error } = await this.supabase.rpc('upsert_user_presence', {
				p_user_id: this.userId,
				p_status: 'online'
			});

			if (error) {
				logger.error('Failed to send heartbeat', { error });
				return;
			}

			// Use trace level to avoid log spam (heartbeat every 3 minutes)
			logger.trace('Heartbeat sent', { userId: this.userId });
		} catch (error) {
			logger.error('Error sending heartbeat', { error });
		}
	}

	/**
	 * Stop presence tracking.
	 *
	 * Clears heartbeat interval, marks self as offline, unsubscribes from channel,
	 * and clears presence map.
	 */
	async stopPresenceTracking(): Promise<void> {
		if (!browser) return;

		logger.info('Stopping presence tracking');

		// Clear heartbeat interval
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		// Mark self as offline
		if (this.supabase && this.userId) {
			try {
				await this.supabase.rpc('upsert_user_presence', {
					p_user_id: this.userId,
					p_status: 'offline'
				});
				logger.trace('Marked self as offline');
			} catch (error) {
				logger.error('Failed to mark self as offline', { error });
			}
		}

		// Unsubscribe from channel
		await supabaseRealtimeManager.unsubscribeChannel(CHANNEL_NAME);

		// Clear presence map
		this.friendsPresence.clear();

		logger.info('Presence tracking stopped');
	}

	/**
	 * Get presence status for a specific friend.
	 *
	 * @param friendId - Friend's user ID
	 * @returns Friend's presence status ('online' or 'offline')
	 */
	getFriendPresence(friendId: string): PresenceStatus {
		return this.friendsPresence.get(friendId) ?? 'offline';
	}

	/**
	 * Update the list of friends being tracked.
	 *
	 * Stops current tracking and restarts with new friend IDs.
	 *
	 * @param newFriendIds - New array of friend user IDs to track
	 */
	async updateFriendList(newFriendIds: string[]): Promise<void> {
		if (!browser) return;

		logger.info('Updating friend list', {
			oldCount: this.friendIds.length,
			newCount: newFriendIds.length
		});

		// Stop current tracking
		await this.stopPresenceTracking();

		// Start tracking with new friend IDs
		await this.startPresenceTracking(newFriendIds);
	}
}

/**
 * Singleton instance of the presence manager.
 * Import this to use presence tracking throughout the application.
 */
export const presenceManager = new PresenceManager();
