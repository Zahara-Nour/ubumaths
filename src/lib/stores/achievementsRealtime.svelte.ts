import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Achievement } from '$lib/types/achievements';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { achievementsStore } from './achievements.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('achievementsRealtime.svelte.ts');

/**
 * Channel name for achievement unlocks
 */
const CHANNEL_NAME = 'achievements-realtime';

/**
 * Payload type for postgres_changes INSERT event
 */
interface StudentAchievementInsertPayload {
	new: {
		id: string;
		student_id: string;
		achievement_id: string;
		points_awarded: number;
		gidouilles_awarded: number;
		unlocked_at: string;
		unlocked_by: string | null;
		unlock_reason: string | null;
		context_data: Record<string, unknown>;
	};
}

/**
 * Validate that a payload is a valid StudentAchievementInsertPayload
 * Runtime validation to handle potential malformed payloads
 */
function isValidPayload(payload: unknown): payload is StudentAchievementInsertPayload {
	if (typeof payload !== 'object' || payload === null) {
		return false;
	}

	const p = payload as Record<string, unknown>;
	if (typeof p.new !== 'object' || p.new === null) {
		return false;
	}

	const newData = p.new as Record<string, unknown>;
	return (
		typeof newData.achievement_id === 'string' &&
		typeof newData.points_awarded === 'number' &&
		typeof newData.gidouilles_awarded === 'number'
	);
}

/**
 * Real-time Achievements Manager
 *
 * Subscribes to postgres_changes INSERT events on the student_achievements table
 * and triggers achievement unlock notifications when new achievements are awarded.
 *
 * This manager:
 * - Listens to database changes via Supabase Realtime
 * - Fetches full achievement details when unlock detected
 * - Triggers the achievement toast via achievementsStore.showUnlockToast()
 * - Invalidates the achievements cache for fresh data
 *
 * @example
 * ```ts
 * import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';
 *
 * // Initialize
 * achievementsRealtimeManager.init(supabase, userId);
 *
 * // Start listening to real-time unlocks
 * await achievementsRealtimeManager.startListening();
 *
 * // Stop listening
 * await achievementsRealtimeManager.stopListening();
 *
 * // Check status
 * if (achievementsRealtimeManager.isListening) { ... }
 * ```
 */
class AchievementsRealtimeManager {
	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;
	private _isListening = $state(false);

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

		logger.info('Achievements realtime manager initialized for user:', currentUserId);
	}

	/**
	 * Start listening to real-time achievement unlocks
	 *
	 * Subscribes to INSERT events on student_achievements table
	 * filtered by the current user's student_id
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

		if (this._isListening) {
			logger.info('Already listening to achievement unlocks');
			return;
		}

		logger.info('Starting to listen to achievement unlocks...');

		// Create channel
		const channel = supabaseRealtimeManager.createChannel(CHANNEL_NAME);

		// Subscribe to INSERT events (new achievement unlocks)
		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'student_achievements',
				filter: `student_id=eq.${this.userId}`
			},
			(payload: unknown) => {
				logger.info('New achievement unlock received');
				// Validate payload before processing
				if (isValidPayload(payload)) {
					this.handleNewAchievement(payload);
				} else {
					logger.warn('Received invalid achievement payload, ignoring');
				}
			}
		);

		// Subscribe to the channel
		try {
			await supabaseRealtimeManager.subscribeChannel(CHANNEL_NAME);
			this._isListening = true;
			logger.info('Successfully started listening to achievement unlocks');
		} catch (err) {
			logger.error('Failed to subscribe to achievements channel:', err);
			this._isListening = false;
		}
	}

	/**
	 * Handle new achievement unlock
	 *
	 * Fetches full achievement details and triggers the unlock toast.
	 *
	 * @param payload - Postgres change payload with student_achievement data
	 */
	private async handleNewAchievement(payload: StudentAchievementInsertPayload): Promise<void> {
		const { achievement_id, points_awarded, gidouilles_awarded } = payload.new;

		logger.info(
			'Handling new achievement unlock:',
			achievement_id,
			'Points:',
			points_awarded,
			'Gidouilles:',
			gidouilles_awarded
		);

		try {
			// Try to get achievement from cache first
			let achievement = achievementsStore.getAchievement(achievement_id);

			// If not in cache, fetch from API
			if (!achievement && this.supabase) {
				logger.info('Achievement not in cache, fetching from database...');

				const { data, error } = await this.supabase
					.from('achievements')
					.select('*')
					.eq('id', achievement_id)
					.single();

				if (error) {
					logger.error('Failed to fetch achievement details:', error);
					return;
				}

				if (data) {
					// Cast to Achievement type (database row with typed metadata)
					achievement = data as Achievement;
				}
			}

			if (!achievement) {
				logger.error('Could not find achievement:', achievement_id);
				return;
			}

			// Show the unlock toast
			achievementsStore.showUnlockToast(achievement, points_awarded, gidouilles_awarded);

			// Invalidate cache to ensure fresh data on next load
			achievementsStore.clearCache();

			logger.info('Achievement unlock toast triggered for:', achievement.name);
		} catch (err) {
			logger.error('Error handling new achievement:', err);
		}
	}

	/**
	 * Stop listening to real-time achievement unlocks
	 */
	async stopListening(): Promise<void> {
		if (!browser) {
			logger.warn('Cannot stop listening on server');
			return;
		}

		if (!this._isListening) {
			logger.info('Not currently listening');
			return;
		}

		logger.info('Stopping achievement unlock listener...');

		try {
			// Unsubscribe from channel
			await supabaseRealtimeManager.unsubscribeChannel(CHANNEL_NAME);
			this._isListening = false;
			logger.info('Stopped listening to achievement unlocks');
		} catch (err) {
			logger.error('Error stopping achievement listener:', err);
		}
	}

	/**
	 * Get current listening status
	 */
	get isListening(): boolean {
		return this._isListening;
	}
}

// Export singleton instance
export const achievementsRealtimeManager = new AchievementsRealtimeManager();
