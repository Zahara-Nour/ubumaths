/**
 * Presence Manager Store
 *
 * Statut « connecté » des amis, relu en base (écart T1, décision de David du 2026-11-03).
 *
 * `user_presence` n'est volontairement PAS publiée en temps réel (la publier diffuserait
 * l'identifiant d'un compte supprimé, voir `realtime-publication.test.ts`). Le statut des
 * amis est donc relu par une requête, sous RLS, toutes les `PRESENCE_POLL_INTERVAL` ms.
 *
 * Un ami est « connecté » si sa ligne dit `online` ET si son dernier signal de vie
 * (`last_heartbeat`) date de moins de `STALE_AFTER_MS` : la tâche `cleanup_stale_presence`
 * n'est planifiée nulle part, une ligne `online` peut donc rester figée après la
 * fermeture d'un onglet.
 *
 * CRITICAL: Heartbeat interval is set to 180 seconds (3 minutes) to stay within
 * Supabase free tier limits for RPCs.
 *
 * @module stores/presence
 */

import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('PresenceManager');

/**
 * Heartbeat interval in milliseconds.
 * CRITICAL: Set to 180 seconds (3 minutes) to stay within Supabase free tier.
 * DO NOT CHANGE without recalculating quota impact.
 */
export const HEARTBEAT_INTERVAL = 180000; // 180 seconds

/** Relecture du statut des amis : toutes les 60 s. */
export const PRESENCE_POLL_INTERVAL = 60000;

/** Sans signal de vie depuis 270 s (180 s + 90 s de marge), un ami est hors ligne. */
export const STALE_AFTER_MS = 270000;

/**
 * User presence status type.
 */
type PresenceStatus = 'online' | 'offline';

/** Ligne lue dans `user_presence`. */
type PresenceRow = { user_id: string; status: string; last_heartbeat: string };

/**
 * Statut affiché d'une ligne de présence, à l'instant `now` (ms).
 */
export function presenceStatusOf(row: PresenceRow, now: number): PresenceStatus {
	if (row.status !== 'online') return 'offline';
	const last = Date.parse(row.last_heartbeat);
	if (Number.isNaN(last)) return 'offline';
	return now - last < STALE_AFTER_MS ? 'online' : 'offline';
}

/**
 * Presence Manager
 *
 * Usage:
 * ```typescript
 * presenceManager.init(supabase, userId);
 * await presenceManager.startPresenceTracking(['friend-id-1', 'friend-id-2']);
 * const status = presenceManager.getFriendPresence('friend-id-1');
 * await presenceManager.stopPresenceTracking();
 * ```
 */
class PresenceManager {
	/**
	 * Map of friend user IDs to their presence status.
	 * Reactive state using Svelte 5 $state rune.
	 */
	private friendsPresence = $state<Map<string, PresenceStatus>>(new Map());

	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;

	/** Amis suivis. */
	private friendIds: string[] = [];

	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	private pollInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Génération du suivi : incrémentée à chaque démarrage et à chaque arrêt. Une
	 * relecture ou un démarrage dont la génération a changé pendant l'`await` ne
	 * touche plus à rien (sinon : statuts réaffichés après l'arrêt, minuteurs orphelins).
	 */
	private generation = 0;

	/**
	 * Initialize the presence manager.
	 */
	init(supabase: SupabaseClient<Database>, userId: string): void {
		if (!browser) return;

		this.supabase = supabase;
		this.userId = userId;

		logger.info('Presence manager initialized', { userId });
	}

	/**
	 * Start tracking presence for specified friends.
	 *
	 * Lit le statut des amis tout de suite, puis toutes les 60 s ; envoie aussi
	 * le signal de vie de l'utilisateur.
	 */
	async startPresenceTracking(friendIds: string[]): Promise<void> {
		if (!browser || !this.supabase || !this.userId) {
			logger.warn('Cannot start presence tracking: not initialized or not in browser');
			return;
		}

		const generation = ++this.generation;
		this.friendIds = friendIds;
		this.stopPolling();

		if (friendIds.length > 0) {
			// Minuteur posé AVANT l'attente : un arrêt pendant la première lecture l'efface.
			this.pollInterval = setInterval(() => {
				void this.fetchPresence(generation);
			}, PRESENCE_POLL_INTERVAL);
			await this.fetchPresence(generation);
			if (generation !== this.generation) return;
		}

		this.startHeartbeat();
		logger.info('Presence tracking started', { friendCount: friendIds.length });
	}

	/**
	 * Relit le statut des amis en base (sous RLS).
	 *
	 * En cas d'échec, le dernier statut connu reste affiché ; l'essai suivant
	 * vient avec la prochaine relecture.
	 */
	private async fetchPresence(generation: number): Promise<void> {
		if (!this.supabase || this.friendIds.length === 0) return;

		try {
			const { data, error } = await this.supabase
				.from('user_presence')
				.select('user_id, status, last_heartbeat')
				.in('user_id', this.friendIds);

			// Suivi arrêté ou relancé pendant la requête : réponse périmée.
			if (generation !== this.generation) return;

			if (error) {
				logger.error('Failed to fetch presence', { error });
				return;
			}

			const now = Date.now();
			const next = new Map<string, PresenceStatus>();
			for (const row of data ?? []) {
				next.set(row.user_id, presenceStatusOf(row, now));
			}
			this.friendsPresence = next;
		} catch (error) {
			logger.error('Error fetching presence', { error });
		}
	}

	private stopPolling(): void {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
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
	 * Arrête la relecture et le signal de vie, marque l'utilisateur hors ligne,
	 * vide la carte des statuts.
	 */
	async stopPresenceTracking(): Promise<void> {
		if (!browser) return;

		this.generation++;
		this.friendIds = [];
		this.stopPolling();

		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

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

		this.friendsPresence = new Map();

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
