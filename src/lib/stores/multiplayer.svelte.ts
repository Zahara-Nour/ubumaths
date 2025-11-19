/**
 * Multiplayer Minesweeper Store
 * Manages multiplayer match flow, queue, and real-time synchronization
 */

import { toaster } from '$lib/stores/toaster.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
	matchFoundResponseSchema,
	completeMatchResponseSchema,
	realtimeGameStateSchema,
	realtimeMatchUpdateSchema
} from '$lib/client/validation/multiplayer-responses';

// ============================================================================
// Types
// ============================================================================

/**
 * Grid state for match completion
 */
export interface GridState {
	rows: number;
	cols: number;
	mines: [number, number][];
	revealed: [number, number][];
	flagged: [number, number][];
	adjacentCounts: Record<string, number>;
}

export type MatchType = 'quick' | 'ranked';
export type MatchStatus =
	| 'waiting' // In queue
	| 'countdown' // Match found, countdown before start
	| 'in_progress' // Game active
	| 'completed' // Match finished
	| 'abandoned'; // Match abandoned

export interface QueueState {
	inQueue: boolean;
	difficulty: 'beginner' | 'intermediate' | 'expert' | null;
	matchType: MatchType | null;
	rank: number | null;
	joinedAt: Date | null;
}

export interface MatchState {
	id: string | null;
	difficulty: 'beginner' | 'intermediate' | 'expert' | null;
	matchType: MatchType | null;
	status: MatchStatus;
	seed: string | null;
	playerNumber: 1 | 2 | null;
	opponentId: string | null;
	opponentName: string | null;
	startedAt: Date | null;
	countdownEndsAt: Date | null;
}

export interface PlayerProgress {
	playerId: string;
	playerName: string;
	cellsRevealed: number;
	flagsUsed: number;
	timeElapsed: number;
	lastAction: {
		type: 'reveal' | 'flag' | 'unflag';
		row: number;
		col: number;
		timestamp: number;
	} | null;
}

export interface MatchResult {
	winnerId: string;
	gidouilles: number;
	baseReward: number;
	speedBonus: number;
	eloChange: number;
	newElo: number;
	timeSeconds: number;
}

// ============================================================================
// Multiplayer Store Class
// ============================================================================

class MultiplayerStore {
	// Configuration constants
	private readonly QUEUE_POLL_INTERVAL_MS = 3000; // 3 seconds
	private readonly QUEUE_POLL_MAX_ERRORS = 5; // Stop polling after 5 consecutive errors
	private readonly MATCH_COUNTDOWN_MS = 5000; // 5 seconds countdown before match starts

	// State
	private supabase = $state<SupabaseClient | null>(null);
	private userId = $state<string | null>(null);
	private channel = $state<RealtimeChannel | null>(null);
	private pollInterval = $state<ReturnType<typeof setInterval> | null>(null);
	private pollErrorCount = $state(0); // Track consecutive polling errors

	// Queue state
	queue = $state<QueueState>({
		inQueue: false,
		difficulty: null,
		matchType: null,
		rank: null,
		joinedAt: null
	});

	// Match state
	match = $state<MatchState>({
		id: null,
		difficulty: null,
		matchType: null,
		status: 'waiting',
		seed: null,
		playerNumber: null,
		opponentId: null,
		opponentName: null,
		startedAt: null,
		countdownEndsAt: null
	});

	// Player progress (real-time sync)
	myProgress = $state<PlayerProgress>({
		playerId: '',
		playerName: '',
		cellsRevealed: 0,
		flagsUsed: 0,
		timeElapsed: 0,
		lastAction: null
	});

	opponentProgress = $state<PlayerProgress>({
		playerId: '',
		playerName: '',
		cellsRevealed: 0,
		flagsUsed: 0,
		timeElapsed: 0,
		lastAction: null
	});

	// Match result
	result = $state<MatchResult | null>(null);

	// Loading states
	isJoiningQueue = $state(false);
	isLeavingQueue = $state(false);
	isCompletingMatch = $state(false);
	isAbandoningMatch = $state(false);

	// Error state
	error = $state<string | null>(null);

	// Connection state
	private connectionLostAt = $state<Date | null>(null);
	private reconnectAttempts = $state(0);
	private readonly MAX_RECONNECT_ATTEMPTS = 5;
	private readonly GRACE_PERIOD_MS = 30000; // 30 seconds

	// Inactivity tracking
	private lastActivityAt = $state<Date>(new Date());
	private inactivityCheckInterval: ReturnType<typeof setInterval> | null = null;
	private inactivityWarningShown = $state(false);
	private readonly INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds
	private readonly INACTIVITY_WARNING_MS = 30000; // 30 seconds warning

	// Countdown tracking (for reactive countdown display)
	private countdownInterval: ReturnType<typeof setInterval> | null = null;
	private countdownTimeout: ReturnType<typeof setTimeout> | null = null;
	private currentCountdown = $state<number>(0);

	// ============================================================================
	// Derived Properties (for component API compatibility)
	// ============================================================================

	/**
	 * Flattened queue status for easier access
	 */
	get inQueue(): boolean {
		return this.queue.inQueue;
	}

	/**
	 * Queue status text
	 */
	get queueStatus(): 'idle' | 'searching' | 'found' | 'error' {
		if (!this.queue.inQueue) return 'idle';
		if (this.error) return 'error';
		if (this.match.id) return 'found';
		return 'searching';
	}

	/**
	 * Current player rank (from queue state)
	 */
	get rank(): number | null {
		return this.queue.rank;
	}

	/**
	 * Current match status
	 */
	get matchStatus(): MatchStatus {
		return this.match.status;
	}

	/**
	 * Countdown seconds remaining (reactive)
	 */
	get countdown(): number {
		return this.currentCountdown;
	}

	/**
	 * Whether connection is lost
	 */
	get isDisconnected(): boolean {
		return this.connectionLostAt !== null;
	}

	// ============================================================================
	// Initialization
	// ============================================================================

	/**
	 * Initialize the store with Supabase client and user ID
	 */
	init(supabaseClient: SupabaseClient, currentUserId: string) {
		this.supabase = supabaseClient;
		this.userId = currentUserId;
	}

	/**
	 * Reset store to initial state
	 */
	reset() {
		this.queue = {
			inQueue: false,
			difficulty: null,
			matchType: null,
			rank: null,
			joinedAt: null
		};

		this.match = {
			id: null,
			difficulty: null,
			matchType: null,
			status: 'waiting',
			seed: null,
			playerNumber: null,
			opponentId: null,
			opponentName: null,
			startedAt: null,
			countdownEndsAt: null
		};

		this.myProgress = {
			playerId: '',
			playerName: '',
			cellsRevealed: 0,
			flagsUsed: 0,
			timeElapsed: 0,
			lastAction: null
		};

		this.opponentProgress = {
			playerId: '',
			playerName: '',
			cellsRevealed: 0,
			flagsUsed: 0,
			timeElapsed: 0,
			lastAction: null
		};

		this.result = null;
		this.error = null;

		// Reset connection/activity state
		this.connectionLostAt = null;
		this.reconnectAttempts = 0;
		this.lastActivityAt = new Date();
		this.inactivityWarningShown = false;
		this.currentCountdown = 0;

		this.unsubscribeChannel();
		this.stopPolling();
		this.stopCountdown();
		this.stopInactivityMonitoring();
	}

	// ============================================================================
	// Queue Management
	// ============================================================================

	/**
	 * Join the matchmaking queue
	 */
	async joinQueue(difficulty: 'beginner' | 'intermediate' | 'expert', matchType: MatchType) {
		if (!this.supabase) {
			this.error = 'Store not initialized';
			return false;
		}

		this.isJoiningQueue = true;
		this.error = null;

		try {
			const response = await fetch('/api/games/minesweeper/multiplayer/queue', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ difficulty, match_type: matchType })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to join queue');
			}

			const rawData = await response.json();

			// Validate response with Zod
			const validation = matchFoundResponseSchema.safeParse(rawData);
			if (!validation.success) {
				console.error('Invalid server response:', validation.error);
				throw new Error('Réponse serveur invalide');
			}

			const data = validation.data;

			if (data.matched) {
				// Verify all required fields are present for matched response
				if (
					!data.match_id ||
					!data.opponent_id ||
					!data.seed ||
					!data.difficulty ||
					!data.match_type ||
					!data.player_number
				) {
					throw new Error('Réponse serveur incomplète');
				}

				// Immediately matched with opponent
				this.handleMatchFound({
					match_id: data.match_id,
					opponent_id: data.opponent_id,
					opponent_name: data.opponent_name,
					seed: data.seed,
					difficulty: data.difficulty,
					match_type: data.match_type,
					player_number: data.player_number
				});
				toaster.success(`Match trouvé ! Adversaire: ${data.opponent_name || 'Joueur'}`, {
					duration: 3000
				});
			} else {
				// Waiting in queue
				this.queue = {
					inQueue: true,
					difficulty,
					matchType,
					rank: data.rank || null,
					joinedAt: new Date()
				};

				// Start polling for match
				this.startPolling();
				toaster.info("En attente d'un adversaire...", { duration: 2000 });
			}

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			toaster.error(this.error);
			return false;
		} finally {
			this.isJoiningQueue = false;
		}
	}

	/**
	 * Leave the matchmaking queue
	 */
	async leaveQueue() {
		if (!this.supabase) {
			this.error = 'Store not initialized';
			return false;
		}

		this.isLeavingQueue = true;
		this.error = null;

		try {
			const response = await fetch('/api/games/minesweeper/multiplayer/queue', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to leave queue');
			}

			this.queue = {
				inQueue: false,
				difficulty: null,
				matchType: null,
				rank: null,
				joinedAt: null
			};

			this.stopPolling();
			toaster.info("File d'attente annulée");

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			toaster.error(this.error);
			return false;
		} finally {
			this.isLeavingQueue = false;
		}
	}

	/**
	 * Start polling for match status
	 */
	private startPolling() {
		this.stopPolling();
		this.pollErrorCount = 0; // Reset error count

		this.pollInterval = setInterval(async () => {
			try {
				const response = await fetch('/api/games/minesweeper/multiplayer/match-status');

				if (!response.ok) return;

				const rawData = await response.json();

				// Validate response
				const validation = matchFoundResponseSchema.safeParse(rawData);
				if (!validation.success) {
					console.error('Invalid match status response:', validation.error);
					return;
				}

				const data = validation.data;

				if (data.matched && data.match_id) {
					// Verify all required fields are present
					if (
						!data.opponent_id ||
						!data.seed ||
						!data.difficulty ||
						!data.match_type ||
						!data.player_number
					) {
						console.error('Incomplete match data from polling');
						return;
					}

					this.pollErrorCount = 0; // Reset on success
					this.handleMatchFound({
						match_id: data.match_id,
						opponent_id: data.opponent_id,
						opponent_name: data.opponent_name,
						seed: data.seed,
						difficulty: data.difficulty,
						match_type: data.match_type,
						player_number: data.player_number
					});
					this.stopPolling();
					toaster.success(`Match trouvé ! Adversaire: ${data.opponent_name || 'Joueur'}`, {
						duration: 3000
					});
				}
			} catch (err) {
				this.pollErrorCount++;
				console.error(`Polling error (${this.pollErrorCount}/${this.QUEUE_POLL_MAX_ERRORS}):`, err);

				if (this.pollErrorCount >= this.QUEUE_POLL_MAX_ERRORS) {
					this.stopPolling();
					this.error = 'Impossible de se connecter au serveur';
					toaster.error('Problème de connexion. Veuillez réessayer.');
				}
			}
		}, this.QUEUE_POLL_INTERVAL_MS);
	}

	/**
	 * Stop polling for match status
	 */
	private stopPolling() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}

	/**
	 * Handle match found event
	 */
	private handleMatchFound(data: {
		match_id: string;
		opponent_id: string;
		opponent_name?: string;
		seed: string;
		difficulty: 'beginner' | 'intermediate' | 'expert';
		match_type: MatchType;
		player_number: 1 | 2;
	}) {
		this.queue.inQueue = false;

		this.match = {
			id: data.match_id,
			difficulty: data.difficulty,
			matchType: data.match_type,
			status: 'countdown',
			seed: data.seed,
			playerNumber: data.player_number,
			opponentId: data.opponent_id,
			opponentName: data.opponent_name || 'Adversaire',
			startedAt: null,
			countdownEndsAt: new Date(Date.now() + this.MATCH_COUNTDOWN_MS)
		};

		// Subscribe to match channel for real-time updates
		this.subscribeToMatch(data.match_id);

		// Start countdown timer for reactive UI
		this.startCountdown();

		// Auto-start match after countdown (tracked for cleanup)
		this.countdownTimeout = setTimeout(() => {
			this.startMatch();
			this.countdownTimeout = null;
		}, this.MATCH_COUNTDOWN_MS);
	}

	// ============================================================================
	// Match Management
	// ============================================================================

	/**
	 * Start the match (called after countdown)
	 */
	async startMatch() {
		if (!this.match.id) {
			this.error = 'No active match';
			return false;
		}

		try {
			const response = await fetch(`/api/games/minesweeper/multiplayer/${this.match.id}/start`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to start match');
			}

			this.match.status = 'in_progress';
			this.match.startedAt = new Date();

			// Start inactivity monitoring
			this.startInactivityMonitoring();

			toaster.info('La partie commence !', { duration: 2000 });

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			toaster.error(this.error);
			return false;
		}
	}

	/**
	 * Update player progress (call this periodically during game)
	 */
	async updateProgress(
		cellsRevealed: number,
		flagsUsed: number,
		timeElapsed: number,
		lastAction?: { type: 'reveal' | 'flag' | 'unflag'; row: number; col: number }
	) {
		if (!this.match.id || this.match.status !== 'in_progress') {
			return false;
		}

		// Update activity timestamp
		this.updateActivity();

		try {
			const response = await fetch(`/api/games/minesweeper/multiplayer/${this.match.id}/state`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cells_revealed: cellsRevealed,
					flags_used: flagsUsed,
					time_elapsed: timeElapsed,
					last_action: lastAction ? { ...lastAction, timestamp: Date.now() } : undefined
				})
			});

			if (!response.ok) {
				console.error('Failed to update progress');
				return false;
			}

			// Update local progress
			this.myProgress.cellsRevealed = cellsRevealed;
			this.myProgress.flagsUsed = flagsUsed;
			this.myProgress.timeElapsed = timeElapsed;
			if (lastAction) {
				this.myProgress.lastAction = { ...lastAction, timestamp: Date.now() };
			}

			return true;
		} catch (err) {
			console.error('Error updating progress:', err);
			return false;
		}
	}

	/**
	 * Complete the match (win)
	 */
	async completeMatch(timeSeconds: number, gridState: GridState) {
		if (!this.match.id) {
			this.error = 'No active match';
			return false;
		}

		this.isCompletingMatch = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/minesweeper/multiplayer/${this.match.id}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					time_seconds: timeSeconds,
					grid_state: gridState
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to complete match');
			}

			const rawData = await response.json();

			// Validate response
			const validation = completeMatchResponseSchema.safeParse(rawData);
			if (!validation.success) {
				console.error('Invalid match completion response:', validation.error);
				throw new Error('Réponse serveur invalide');
			}

			const data = validation.data;

			this.result = {
				winnerId: data.winner_id,
				gidouilles: data.gidouilles,
				baseReward: data.base_reward,
				speedBonus: data.speed_bonus,
				eloChange: data.elo_change,
				newElo: data.new_elo,
				timeSeconds: data.time_seconds
			};

			this.match.status = 'completed';

			// Stop monitoring
			this.stopInactivityMonitoring();

			// Unsubscribe from channel
			this.unsubscribeChannel();

			// Enhanced toast notification
			if (data.speed_bonus > 0) {
				toaster.success(
					`🏆 Victoire ! +${data.gidouilles} gidouilles (dont ${data.speed_bonus} bonus de vitesse)`,
					{ duration: 5000 }
				);
			} else {
				toaster.success(`🏆 Victoire ! +${data.gidouilles} gidouilles`, {
					duration: 5000
				});
			}

			if (data.elo_change > 0) {
				toaster.info(`📈 +${data.elo_change} ELO`, { duration: 3000 });
			} else if (data.elo_change < 0) {
				toaster.info(`📉 ${data.elo_change} ELO`, { duration: 3000 });
			}

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			toaster.error(this.error);
			return false;
		} finally {
			this.isCompletingMatch = false;
		}
	}

	/**
	 * Abandon the match
	 */
	async abandonMatch(reason: 'player_quit' | 'timeout' | 'disconnect' = 'player_quit') {
		if (!this.match.id) {
			this.error = 'No active match';
			return false;
		}

		this.isAbandoningMatch = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/minesweeper/multiplayer/${this.match.id}/abandon`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to abandon match');
			}

			this.match.status = 'abandoned';

			// Stop monitoring
			this.stopInactivityMonitoring();

			// Unsubscribe from channel
			this.unsubscribeChannel();

			// Toast notification based on reason
			if (reason === 'player_quit') {
				toaster.info('Match abandonné');
			} else if (reason === 'timeout') {
				toaster.warning('Match abandonné pour inactivité');
			} else if (reason === 'disconnect') {
				toaster.error('Match abandonné pour déconnexion');
			}

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Unknown error';
			toaster.error(this.error);
			return false;
		} finally {
			this.isAbandoningMatch = false;
		}
	}

	// ============================================================================
	// Real-time Synchronization
	// ============================================================================

	/**
	 * Subscribe to match channel for real-time updates
	 */
	private subscribeToMatch(matchId: string) {
		if (!this.supabase) return;

		// Unsubscribe from previous channel
		this.unsubscribeChannel();

		// Create new channel
		this.channel = this.supabase.channel(`match:${matchId}`);

		// Listen to game state updates from opponent
		this.channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'minesweeper_multiplayer_game_state',
				filter: `match_id=eq.${matchId}`
			},
			(payload) => {
				this.handleGameStateUpdate(payload.new as unknown);
			}
		);

		// Listen to match status changes
		this.channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'minesweeper_multiplayer_matches',
				filter: `id=eq.${matchId}`
			},
			(payload) => {
				this.handleMatchUpdate(payload.new as unknown);
			}
		);

		// Subscribe
		this.channel.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				console.log(`Subscribed to match ${matchId}`);
			}
		});

		// Setup connection monitoring
		this.setupConnectionMonitoring();
	}

	/**
	 * Unsubscribe from match channel
	 */
	private async unsubscribeChannel() {
		if (this.channel) {
			await this.supabase?.removeChannel(this.channel);
			this.channel = null;
		}
	}

	/**
	 * Handle game state update from realtime channel
	 */
	private handleGameStateUpdate(newState: unknown) {
		// Validate realtime payload with Zod
		const validation = realtimeGameStateSchema.safeParse(newState);
		if (!validation.success) {
			console.error('Invalid game state update from realtime:', validation.error);
			return;
		}

		const state = validation.data;

		// Only update opponent progress (not our own)
		if (state.player_id && state.player_id !== this.userId) {
			this.opponentProgress = {
				playerId: state.player_id,
				playerName: this.match.opponentName || 'Adversaire',
				cellsRevealed: state.cells_revealed,
				flagsUsed: state.flags_used,
				timeElapsed: state.time_elapsed,
				lastAction: state.last_action || null
			};
		}
	}

	/**
	 * Handle match update from realtime channel
	 */
	private handleMatchUpdate(newMatch: unknown) {
		// Validate realtime payload with Zod
		const validation = realtimeMatchUpdateSchema.safeParse(newMatch);
		if (!validation.success) {
			console.error('Invalid match update from realtime:', validation.error);
			return;
		}

		const matchData = validation.data;

		// Update match status
		this.match.status = matchData.status as MatchStatus;

		// Handle opponent win
		if (matchData.status === 'completed' && matchData.winner_id !== this.userId) {
			toaster.info('Votre adversaire a gagné');
			this.match.status = 'completed';
			this.unsubscribeChannel();
		}

		// Handle abandonment by opponent
		if (matchData.status === 'abandoned' && matchData.winner_id === this.userId) {
			toaster.success('Victoire ! Votre adversaire a abandonné');
			this.match.status = 'completed';
			this.unsubscribeChannel();
		}
	}

	// ============================================================================
	// Connection & Activity Monitoring
	// ============================================================================

	/**
	 * Handle connection loss
	 */
	private handleConnectionLost() {
		if (!this.connectionLostAt) {
			this.connectionLostAt = new Date();
			this.reconnectAttempts = 0;
			toaster.warning('Connexion perdue. Tentative de reconnexion...');
		}
	}

	/**
	 * Handle connection restored
	 */
	private handleConnectionRestored() {
		if (this.connectionLostAt) {
			const lostDuration = Date.now() - this.connectionLostAt.getTime();
			this.connectionLostAt = null;
			this.reconnectAttempts = 0;

			if (lostDuration > this.GRACE_PERIOD_MS) {
				// Connection was lost for too long, abandon match
				toaster.error('Connexion perdue trop longtemps. Match abandonné.');
				this.abandonMatch('disconnect');
			} else {
				toaster.success('Connexion rétablie!');
			}
		}
	}

	/**
	 * Setup connection monitoring on realtime channel
	 */
	private setupConnectionMonitoring() {
		if (!this.channel) return;

		this.channel.on('system', { event: 'error' }, () => {
			this.handleConnectionLost();
		});

		this.channel.on('system', { event: 'connected' }, () => {
			this.handleConnectionRestored();
		});
	}

	/**
	 * Update last activity timestamp (call this on any user action)
	 */
	updateActivity() {
		this.lastActivityAt = new Date();
	}

	/**
	 * Start monitoring for inactivity
	 */
	private startInactivityMonitoring() {
		this.stopInactivityMonitoring();
		this.inactivityWarningShown = false; // Reset warning flag

		this.inactivityCheckInterval = setInterval(() => {
			const inactiveDuration = Date.now() - this.lastActivityAt.getTime();

			// Show warning once at 30 seconds
			if (inactiveDuration > this.INACTIVITY_WARNING_MS && !this.inactivityWarningShown) {
				this.inactivityWarningShown = true;
				toaster.warning(
					'Inactivité détectée. Le match sera abandonné si vous ne jouez pas.',
					{ duration: 5000 }
				);
			}

			// Abandon at 60 seconds
			if (inactiveDuration > this.INACTIVITY_TIMEOUT_MS) {
				toaster.error('Match abandonné pour inactivité');
				this.abandonMatch('timeout');
				this.stopInactivityMonitoring();
			}
		}, 10000); // Check every 10 seconds
	}

	/**
	 * Stop inactivity monitoring
	 */
	private stopInactivityMonitoring() {
		if (this.inactivityCheckInterval) {
			clearInterval(this.inactivityCheckInterval);
			this.inactivityCheckInterval = null;
		}
	}

	/**
	 * Start countdown timer (updates every second)
	 */
	private startCountdown() {
		this.stopCountdown();

		if (!this.match.countdownEndsAt) return;

		// Update immediately
		this.updateCountdown();

		// Update every 100ms for smooth countdown
		this.countdownInterval = setInterval(() => {
			this.updateCountdown();

			if (this.currentCountdown <= 0) {
				this.stopCountdown();
			}
		}, 100);
	}

	/**
	 * Update current countdown value
	 */
	private updateCountdown() {
		if (!this.match.countdownEndsAt) {
			this.currentCountdown = 0;
			return;
		}

		const remaining = Math.max(0, this.match.countdownEndsAt.getTime() - Date.now());
		this.currentCountdown = Math.ceil(remaining / 1000);
	}

	/**
	 * Stop countdown timer
	 */
	private stopCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
		if (this.countdownTimeout) {
			clearTimeout(this.countdownTimeout);
			this.countdownTimeout = null;
		}
		this.currentCountdown = 0;
	}

	// ============================================================================
	// Cleanup
	// ============================================================================

	/**
	 * Cleanup on component unmount
	 */
	cleanup() {
		this.unsubscribeChannel();
		this.stopPolling();
		this.stopCountdown();
		this.stopInactivityMonitoring();
		this.reset();
	}

	/**
	 * @deprecated Use cleanup() instead
	 */
	destroy() {
		this.cleanup();
	}
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const multiplayerStore = new MultiplayerStore();
