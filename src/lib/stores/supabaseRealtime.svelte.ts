import { browser } from '$app/environment';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('supabaseRealtime.svelte.ts');

/**
 * Manages Supabase Realtime connections and channels.
 * Provides centralized infrastructure for Presence, Broadcast, and postgres_changes subscriptions.
 *
 * This store handles:
 * - Channel creation and lifecycle management
 * - Connection status tracking
 * - Automatic cleanup on disconnect
 *
 * @example
 * ```ts
 * import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';
 *
 * // Initialize with Supabase client
 * supabaseRealtimeManager.init(supabase, userId);
 *
 * // Create and subscribe to a channel
 * const channel = supabaseRealtimeManager.createChannel('my-channel');
 * await supabaseRealtimeManager.subscribeChannel('my-channel');
 *
 * // Check connection status
 * if (supabaseRealtimeManager.isConnected) {
 *   // Do something
 * }
 *
 * // Cleanup
 * await supabaseRealtimeManager.disconnect();
 * ```
 */
class SupabaseRealtimeManager {
	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;
	private channels = new Map<string, RealtimeChannel>();

	/**
	 * Current connection status
	 */
	connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');

	/**
	 * Computed property to check if connected
	 */
	get isConnected(): boolean {
		return this.connectionStatus === 'connected';
	}

	/**
	 * Initialize the Realtime manager with a Supabase client
	 *
	 * @param client - Supabase client instance
	 * @param currentUserId - Current authenticated user ID
	 */
	init(client: SupabaseClient<Database>, currentUserId: string): void {
		if (!browser) {
			logger.warn('Cannot initialize Realtime manager on server');
			return;
		}

		this.supabase = client;
		this.userId = currentUserId;
		this.connectionStatus = 'connecting';

		logger.info('Realtime manager initialized for user:', currentUserId);
	}

	/**
	 * Create a new Realtime channel (does not subscribe yet)
	 *
	 * @param channelName - Unique name for the channel
	 * @returns The created RealtimeChannel instance
	 * @throws Error if manager is not initialized
	 */
	createChannel(channelName: string): RealtimeChannel {
		if (!browser) {
			throw new Error('Cannot create channel on server');
		}

		if (!this.supabase) {
			throw new Error('Realtime manager not initialized. Call init() first.');
		}

		// Return existing channel if already created
		if (this.channels.has(channelName)) {
			logger.info(`Channel "${channelName}" already exists, returning existing instance`);
			return this.channels.get(channelName)!;
		}

		// Create new channel
		const channel = this.supabase.channel(channelName);
		this.channels.set(channelName, channel);

		logger.info(`Channel "${channelName}" created`);
		return channel;
	}

	/**
	 * Subscribe to a channel (must be created first)
	 *
	 * @param channelName - Name of the channel to subscribe to
	 * @returns Promise that resolves when subscription is complete
	 * @throws Error if channel doesn't exist
	 */
	async subscribeChannel(channelName: string): Promise<void> {
		if (!browser) {
			logger.warn('Cannot subscribe to channel on server');
			return;
		}

		const channel = this.channels.get(channelName);
		if (!channel) {
			throw new Error(`Channel "${channelName}" not found. Create it first with createChannel().`);
		}

		return new Promise((resolve, reject) => {
			channel.subscribe((status) => {
				logger.info(`Channel "${channelName}" status:`, status);

				switch (status) {
					case 'SUBSCRIBED':
						this.connectionStatus = 'connected';
						logger.info(`Successfully subscribed to channel "${channelName}"`);
						resolve();
						break;

					case 'CLOSED':
						this.connectionStatus = 'disconnected';
						logger.info(`Channel "${channelName}" closed`);
						// Reject to prevent hanging Promise when channel is closed during subscription
						reject(new Error(`Channel "${channelName}" closed during subscription`));
						break;

					case 'CHANNEL_ERROR':
						this.connectionStatus = 'disconnected';
						logger.error(`Channel "${channelName}" error`);
						reject(new Error(`Failed to subscribe to channel "${channelName}"`));
						break;

					case 'TIMED_OUT':
						this.connectionStatus = 'disconnected';
						logger.warn(`Channel "${channelName}" subscription timed out`);
						reject(new Error(`Channel "${channelName}" subscription timed out`));
						break;
				}
			});
		});
	}

	/**
	 * Unsubscribe from a specific channel and remove it
	 *
	 * @param channelName - Name of the channel to unsubscribe from
	 */
	async unsubscribeChannel(channelName: string): Promise<void> {
		if (!browser) {
			logger.warn('Cannot unsubscribe from channel on server');
			return;
		}

		const channel = this.channels.get(channelName);
		if (!channel || !this.supabase) {
			logger.warn(`Channel "${channelName}" not found or manager not initialized`);
			return;
		}

		// Remove channel from Supabase
		await this.supabase.removeChannel(channel);
		this.channels.delete(channelName);

		logger.info(`Unsubscribed from channel "${channelName}"`);

		// Update connection status if no channels remain
		if (this.channels.size === 0) {
			this.connectionStatus = 'disconnected';
		}
	}

	/**
	 * Get a channel by name
	 *
	 * @param channelName - Name of the channel to retrieve
	 * @returns The channel instance or undefined if not found
	 */
	getChannel(channelName: string): RealtimeChannel | undefined {
		return this.channels.get(channelName);
	}

	/**
	 * Disconnect from all channels and cleanup
	 */
	async disconnect(): Promise<void> {
		if (!browser) {
			logger.warn('Cannot disconnect on server');
			return;
		}

		if (!this.supabase) {
			logger.warn('Manager not initialized, nothing to disconnect');
			return;
		}

		logger.info('Disconnecting from all channels...');

		// Remove all channels
		for (const [channelName, channel] of this.channels.entries()) {
			await this.supabase.removeChannel(channel);
			logger.info(`Removed channel "${channelName}"`);
		}

		// Clear channels map
		this.channels.clear();

		// Update status
		this.connectionStatus = 'disconnected';

		logger.info('All channels disconnected');
	}

	/**
	 * Get the number of active channels
	 */
	get channelCount(): number {
		return this.channels.size;
	}

	/**
	 * Get the current user ID
	 */
	get currentUserId(): string | null {
		return this.userId;
	}
}

export const supabaseRealtimeManager = new SupabaseRealtimeManager();
