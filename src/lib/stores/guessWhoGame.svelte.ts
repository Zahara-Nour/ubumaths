/**
 * Guess Who Math Game Store
 * Manages game state, moves, and real-time synchronization
 *
 * NOTE: This store uses direct supabase.channel() instead of supabaseRealtimeManager.
 * This is intentional due to game-specific requirements:
 * - Dynamic channel names per game (`guess-who:${gameId}`)
 * - Custom connection monitoring with 30s grace period before abandonment
 * - Tight integration with game lifecycle
 * - Game-critical reconnection logic
 *
 * @module stores/guessWhoGame
 */

import { toaster } from '$lib/stores/toaster.svelte';
import { SvelteSet } from 'svelte/reactivity';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
	GAME_PACKS,
	type GuessWhoGame,
	type GuessWhoMove,
	type GameStatus,
	type QuestionType,
	type AnyQuestionType,
	type CreateGameResponse,
	type JoinGameResponse,
	type GamePackId
} from '$lib/types/guess-who';

// ============================================================================
// Constants
// ============================================================================

const TURN_TIMEOUT_MS = 60000; // 60s per action
const _GRACE_PERIOD_MS = 30000; // 30s for reconnection (used in server-side logic)
const _MAX_BONUS_TURNS = 3; // Max consecutive bonus turns (validated server-side)
const RECONNECT_DELAY_MS = 5000; // Base reconnect delay
const MAX_RECONNECT_ATTEMPTS = 5; // Max reconnection attempts
const TIMER_UPDATE_INTERVAL_MS = 1000; // Update timer every second

// Re-export constants for documentation
export { _GRACE_PERIOD_MS as GRACE_PERIOD_MS, _MAX_BONUS_TURNS as MAX_BONUS_TURNS };

// ============================================================================
// Broadcast Event Types
// ============================================================================

interface QuestionAskedEvent {
	questionType: QuestionType;
	param?: number;
	playerId: string;
}

interface AnswerGivenEvent {
	answer: boolean;
	isCorrect: boolean;
	correctAnswer: boolean;
	playerId: string;
}

interface GuessMadeEvent {
	guessedNumber: number;
	isCorrect: boolean;
	playerId: string;
}

interface TimerSyncEvent {
	remainingSeconds: number;
}

interface PlayerReconnectedEvent {
	playerId: string;
}

// ============================================================================
// Guess Who Game Store Class
// ============================================================================

class GuessWhoGameStore {
	// Core state
	private supabase = $state<SupabaseClient | null>(null);
	private userId = $state<string | null>(null);
	private channel = $state<RealtimeChannel | null>(null);

	// Game state
	game = $state<GuessWhoGame | null>(null);
	mySecretNumber = $state<number | null>(null);
	eliminatedNumbers = $state<SvelteSet<number>>(new SvelteSet());
	moves = $state<GuessWhoMove[]>([]);

	// Timer state
	timer = $state<number>(60);
	private timerInterval = $state<ReturnType<typeof setInterval> | null>(null);
	private turnStartedAt = $state<Date | null>(null);

	// Connection state
	isConnected = $state<boolean>(false);
	isReconnecting = $state<boolean>(false);
	private reconnectAttempts = $state<number>(0);
	private reconnectTimeout = $state<ReturnType<typeof setTimeout> | null>(null);

	// Loading states
	isCreating = $state<boolean>(false);
	isJoining = $state<boolean>(false);
	isSubmitting = $state<boolean>(false);
	error = $state<string | null>(null);

	// Pending question (when waiting for opponent's answer)
	pendingQuestion = $state<{ type: QuestionType; param?: number } | null>(null);

	// ============================================================================
	// Derived Properties
	// ============================================================================

	/**
	 * Whether it's the current user's turn
	 */
	get isMyTurn(): boolean {
		return this.game?.currentTurnPlayerId === this.userId;
	}

	/**
	 * Whether the user must answer (opponent asked a question)
	 */
	get mustAnswer(): boolean {
		if (!this.game || !this.userId) return false;
		// Must answer when it's NOT my turn and there's a pending question waiting for answer
		return !this.isMyTurn && this.pendingQuestion !== null;
	}

	/**
	 * Current game status
	 */
	get gameStatus(): GameStatus | null {
		return this.game?.status ?? null;
	}

	/**
	 * The opponent's ID
	 */
	get opponentId(): string | null {
		if (!this.game || !this.userId) return null;
		if (this.game.player1Id === this.userId) {
			return this.game.player2Id;
		}
		return this.game.player1Id;
	}

	/**
	 * Whether the user can ask a question
	 */
	get canAskQuestion(): boolean {
		return (
			this.isMyTurn &&
			this.pendingQuestion === null &&
			this.game?.status === 'in_progress' &&
			!this.isSubmitting
		);
	}

	/**
	 * Number of bonus turns remaining
	 */
	get bonusTurnsRemaining(): number {
		return this.game?.bonusTurnsRemaining ?? 0;
	}

	/**
	 * Current game pack ID
	 */
	get packId(): GamePackId {
		return this.game?.packId ?? 'naturals_medium';
	}

	/**
	 * Available question types for the current pack
	 */
	get availableQuestions(): AnyQuestionType[] {
		const pack = GAME_PACKS[this.packId];
		return pack?.availableQuestions ?? GAME_PACKS.naturals_medium.availableQuestions;
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
	 * Reset all state to initial values
	 */
	reset() {
		this.game = null;
		this.mySecretNumber = null;
		this.eliminatedNumbers = new SvelteSet();
		this.moves = [];
		this.timer = 60;
		this.turnStartedAt = null;
		this.isConnected = false;
		this.isReconnecting = false;
		this.reconnectAttempts = 0;
		this.isCreating = false;
		this.isJoining = false;
		this.isSubmitting = false;
		this.error = null;
		this.pendingQuestion = null;

		this.stopTimer();
		this.clearReconnectTimeout();
		this.unsubscribeFromGame();
	}

	/**
	 * Clean up channel, timers, and subscriptions
	 */
	async cleanup() {
		this.stopTimer();
		this.clearReconnectTimeout();
		await this.unsubscribeFromGame();
		this.reset();
	}

	// ============================================================================
	// Game Lifecycle
	// ============================================================================

	/**
	 * Create a new game
	 * @returns Object with shareUrl or null on failure
	 */
	async createGame(): Promise<{ shareUrl: string } | null> {
		if (!this.supabase || !this.userId) {
			this.error = 'Store non initialisé';
			return null;
		}

		this.isCreating = true;
		this.error = null;

		try {
			const response = await fetch('/api/games/guess-who', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Impossible de créer la partie');
			}

			const data: CreateGameResponse = await response.json();

			// Store game state
			this.game = data.game;
			this.mySecretNumber = data.mySecretNumber;
			this.eliminatedNumbers = new SvelteSet();
			this.moves = [];

			// Subscribe to game channel
			this.subscribeToGame(data.game.id);

			toaster.success('Partie créée ! Partagez le lien avec votre adversaire.');

			return { shareUrl: data.shareUrl };
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(this.error);
			return null;
		} finally {
			this.isCreating = false;
		}
	}

	/**
	 * Join an existing game via share token
	 * @param token - The share token from the URL
	 * @returns true on success, false on failure
	 */
	async joinGame(token: string): Promise<boolean> {
		if (!this.supabase || !this.userId) {
			this.error = 'Store non initialisé';
			return false;
		}

		this.isJoining = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/guess-who/join/${token}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Impossible de rejoindre la partie');
			}

			const data: JoinGameResponse = await response.json();

			// Store game state
			this.game = data.game;
			this.mySecretNumber = data.mySecretNumber;
			this.eliminatedNumbers = new SvelteSet();
			this.moves = [];

			// Subscribe to game channel
			this.subscribeToGame(data.game.id);

			// Start timer if game is in progress and it's our turn
			if (data.game.status === 'in_progress' && data.game.turnStartedAt) {
				this.turnStartedAt = new Date(data.game.turnStartedAt);
				this.startTimer();
			}

			toaster.success('Partie rejointe ! La partie commence.');

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(this.error);
			return false;
		} finally {
			this.isJoining = false;
		}
	}

	/**
	 * Abandon the current game
	 * @returns true on success, false on failure
	 */
	async abandonGame(): Promise<boolean> {
		if (!this.game) {
			this.error = 'Aucune partie en cours';
			return false;
		}

		this.isSubmitting = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/guess-who/${this.game.id}/abandon`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Impossible d'abandonner la partie");
			}

			toaster.info('Partie abandonnée');
			await this.cleanup();

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(this.error);
			return false;
		} finally {
			this.isSubmitting = false;
		}
	}

	// ============================================================================
	// Game Actions
	// ============================================================================

	/**
	 * Ask a question about opponent's secret number
	 * @param type - The question type
	 * @param param - Optional parameter for the question
	 * @returns true on success, false on failure
	 */
	async askQuestion(type: QuestionType, param?: number): Promise<boolean> {
		if (!this.game || !this.canAskQuestion) {
			this.error = 'Impossible de poser une question maintenant';
			return false;
		}

		this.isSubmitting = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/guess-who/${this.game.id}/question`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ questionType: type, questionParam: param })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Impossible de poser la question');
			}

			// Broadcast question for instant feedback
			this.broadcastEvent('question_asked', {
				questionType: type,
				param,
				playerId: this.userId
			});

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(this.error);
			return false;
		} finally {
			this.isSubmitting = false;
		}
	}

	/**
	 * Answer the opponent's question
	 * @param answer - true or false
	 * @returns true on success, false on failure
	 */
	async answerQuestion(answer: boolean): Promise<boolean> {
		if (!this.game || !this.pendingQuestion) {
			this.error = 'Aucune question en attente';
			return false;
		}

		this.isSubmitting = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/guess-who/${this.game.id}/answer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ answer })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Impossible de répondre');
			}

			const data = await response.json();

			// Broadcast answer for instant feedback
			this.broadcastEvent('answer_given', {
				answer,
				isCorrect: data.isCorrect,
				correctAnswer: data.correctAnswer,
				playerId: this.userId
			});

			// Clear pending question
			this.pendingQuestion = null;

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(this.error);
			return false;
		} finally {
			this.isSubmitting = false;
		}
	}

	/**
	 * Make a guess at the opponent's secret number
	 * @param number - The guessed number
	 * @returns true on success, false on failure
	 */
	async guess(number: number): Promise<boolean> {
		if (!this.game || !this.isMyTurn) {
			this.error = "Ce n'est pas votre tour";
			return false;
		}

		this.isSubmitting = true;
		this.error = null;

		try {
			const response = await fetch(`/api/games/guess-who/${this.game.id}/guess`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guessedNumber: number })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Impossible de deviner');
			}

			const data = await response.json();

			// Broadcast guess for instant feedback
			this.broadcastEvent('guess_made', {
				guessedNumber: number,
				isCorrect: data.isCorrect,
				playerId: this.userId
			});

			if (data.isCorrect) {
				toaster.success('Bravo ! Vous avez trouvé le nombre secret !');
			} else {
				toaster.error('Dommage ! Ce nombre était incorrect.');
			}

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(this.error);
			return false;
		} finally {
			this.isSubmitting = false;
		}
	}

	/**
	 * Add a number to the local eliminated set
	 * @param n - The number to eliminate
	 */
	eliminateNumber(n: number) {
		this.eliminatedNumbers = new SvelteSet([...this.eliminatedNumbers, n]);
	}

	/**
	 * Remove a number from the local eliminated set
	 * @param n - The number to restore
	 */
	restoreNumber(n: number) {
		const newSet = new SvelteSet(this.eliminatedNumbers);
		newSet.delete(n);
		this.eliminatedNumbers = newSet;
	}

	/**
	 * Sync eliminated numbers to the server
	 */
	async syncEliminatedNumbers(): Promise<void> {
		if (!this.game) return;

		try {
			await fetch(`/api/games/guess-who/${this.game.id}/eliminate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eliminatedNumbers: [...this.eliminatedNumbers] })
			});
		} catch (err) {
			console.error('Failed to sync eliminated numbers:', err);
		}
	}

	// ============================================================================
	// Timer Management
	// ============================================================================

	/**
	 * Start the turn timer countdown
	 */
	private startTimer() {
		this.stopTimer();

		// Calculate remaining time based on turn start
		if (this.turnStartedAt) {
			const elapsed = Date.now() - this.turnStartedAt.getTime();
			this.timer = Math.max(0, Math.ceil((TURN_TIMEOUT_MS - elapsed) / 1000));
		} else {
			this.timer = Math.ceil(TURN_TIMEOUT_MS / 1000);
		}

		this.timerInterval = setInterval(() => {
			this.timer = Math.max(0, this.timer - 1);

			if (this.timer <= 0) {
				this.handleTimeout();
			}
		}, TIMER_UPDATE_INTERVAL_MS);
	}

	/**
	 * Stop the turn timer
	 */
	private stopTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	/**
	 * Handle turn timeout
	 */
	private handleTimeout() {
		this.stopTimer();

		if (this.isMyTurn) {
			toaster.warning('Temps écoulé ! Vous perdez votre tour.');
			// The server will handle the timeout via a background job or realtime event
		}
	}

	// ============================================================================
	// Realtime Subscriptions
	// ============================================================================

	/**
	 * Subscribe to game channel for realtime updates
	 */
	private subscribeToGame(gameId: string) {
		if (!this.supabase) return;

		// Unsubscribe from previous channel
		this.unsubscribeFromGame();

		// Create new channel
		this.channel = this.supabase.channel(`guess-who:${gameId}`);

		// Listen to game updates
		this.channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'guess_who_games',
				filter: `id=eq.${gameId}`
			},
			(payload) => {
				this.handleGameUpdate(payload.new);
			}
		);

		// Listen to new moves
		this.channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'guess_who_moves',
				filter: `game_id=eq.${gameId}`
			},
			(payload) => {
				this.handleMoveInsert(payload.new);
			}
		);

		// Listen to broadcast events for instant feedback
		this.channel.on('broadcast', { event: 'question_asked' }, ({ payload }) => {
			this.handleBroadcast('question_asked', payload);
		});

		this.channel.on('broadcast', { event: 'answer_given' }, ({ payload }) => {
			this.handleBroadcast('answer_given', payload);
		});

		this.channel.on('broadcast', { event: 'guess_made' }, ({ payload }) => {
			this.handleBroadcast('guess_made', payload);
		});

		this.channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
			this.handleBroadcast('timer_sync', payload);
		});

		this.channel.on('broadcast', { event: 'player_reconnected' }, ({ payload }) => {
			this.handleBroadcast('player_reconnected', payload);
		});

		// Subscribe and handle connection state
		this.channel.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				console.log(`Subscribed to guess-who:${gameId}`);
				this.isConnected = true;

				// Broadcast reconnection if we were reconnecting
				const wasReconnecting = this.isReconnecting;
				this.isReconnecting = false;
				this.reconnectAttempts = 0;

				if (wasReconnecting && this.userId) {
					this.broadcastEvent('player_reconnected', { playerId: this.userId });
				}
			} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
				this.handleDisconnect();
			} else if (status === 'CLOSED') {
				this.isConnected = false;
			}
		});
	}

	/**
	 * Unsubscribe from game channel
	 */
	private async unsubscribeFromGame() {
		if (this.channel) {
			await this.supabase?.removeChannel(this.channel);
			this.channel = null;
		}
		this.isConnected = false;
	}

	/**
	 * Handle game update from postgres_changes
	 */
	private handleGameUpdate(payload: unknown) {
		// Validate payload structure
		if (!payload || typeof payload !== 'object') {
			console.error('Invalid game update payload:', payload);
			return;
		}

		const data = payload as Record<string, unknown>;

		// Update game state with snake_case to camelCase conversion
		this.game = {
			id: data.id as string,
			player1Id: data.player1_id as string,
			player2Id: (data.player2_id as string) || null,
			status: data.status as GameStatus,
			packId: (data.pack_id as GamePackId) || 'naturals_medium',
			gridNumbers: data.grid_numbers as number[],
			currentTurnPlayerId: (data.current_turn_player_id as string) || null,
			bonusTurnsRemaining: (data.bonus_turns_remaining as number) ?? 0,
			winnerId: (data.winner_id as string) || null,
			shareToken: data.share_token as string,
			turnStartedAt: (data.turn_started_at as string) || null,
			createdAt: data.created_at as string,
			updatedAt: data.updated_at as string
		};

		// Update turn timer
		if (this.game.turnStartedAt) {
			this.turnStartedAt = new Date(this.game.turnStartedAt);
			this.startTimer();
		} else {
			this.stopTimer();
		}

		// Handle game completion
		if (this.game.status === 'completed') {
			this.stopTimer();
			if (this.game.winnerId === this.userId) {
				toaster.success('Vous avez gagné !');
			} else if (this.game.winnerId) {
				toaster.info('Votre adversaire a gagné.');
			}
		}

		// Handle game abandonment
		if (this.game.status === 'abandoned') {
			this.stopTimer();
			if (this.game.winnerId === this.userId) {
				toaster.success('Victoire ! Votre adversaire a abandonné.');
			} else {
				toaster.info('La partie a été abandonnée.');
			}
		}
	}

	/**
	 * Handle new move from postgres_changes
	 */
	private handleMoveInsert(payload: unknown) {
		// Validate payload structure
		if (!payload || typeof payload !== 'object') {
			console.error('Invalid move payload:', payload);
			return;
		}

		const data = payload as Record<string, unknown>;

		// Convert snake_case to camelCase
		const move: GuessWhoMove = {
			id: data.id as string,
			gameId: data.game_id as string,
			playerId: data.player_id as string,
			moveNumber: data.move_number as number,
			moveType: data.move_type as GuessWhoMove['moveType'],
			questionType: (data.question_type as QuestionType) || null,
			questionParam: (data.question_param as number) ?? null,
			answer: (data.answer as boolean) ?? null,
			isCorrect: (data.is_correct as boolean) ?? null,
			correctAnswer: (data.correct_answer as boolean) ?? null,
			guessedNumber: (data.guessed_number as number) ?? null,
			createdAt: data.created_at as string
		};

		// Add move to history
		this.moves = [...this.moves, move];

		// If opponent asked a question, set pending question
		if (move.moveType === 'question' && move.playerId !== this.userId) {
			this.pendingQuestion = {
				type: move.questionType!,
				param: move.questionParam ?? undefined
			};
		}

		// If this is an answer, clear pending question
		if (move.moveType === 'answer') {
			this.pendingQuestion = null;
		}
	}

	/**
	 * Handle broadcast events for instant feedback
	 */
	private handleBroadcast(
		event: string,
		payload:
			| QuestionAskedEvent
			| AnswerGivenEvent
			| GuessMadeEvent
			| TimerSyncEvent
			| PlayerReconnectedEvent
	) {
		switch (event) {
			case 'question_asked': {
				const data = payload as QuestionAskedEvent;
				if (data.playerId !== this.userId) {
					// Opponent asked a question - set pending for answering
					this.pendingQuestion = {
						type: data.questionType,
						param: data.param
					};
				}
				break;
			}

			case 'answer_given': {
				const data = payload as AnswerGivenEvent;
				if (data.playerId !== this.userId) {
					// Opponent answered our question
					this.pendingQuestion = null;

					// Show feedback about accuracy
					if (!data.isCorrect) {
						toaster.warning(
							`Votre adversaire a menti ! La vraie réponse était ${data.correctAnswer ? 'oui' : 'non'}.`
						);
					}
				}
				break;
			}

			case 'guess_made': {
				const data = payload as GuessMadeEvent;
				if (data.playerId !== this.userId) {
					if (data.isCorrect) {
						toaster.error(`Votre adversaire a deviné votre nombre (${data.guessedNumber}) !`);
					} else {
						toaster.info(`Votre adversaire a deviné ${data.guessedNumber} - incorrect !`);
					}
				}
				break;
			}

			case 'timer_sync': {
				const data = payload as TimerSyncEvent;
				// Sync timer with authoritative source
				this.timer = data.remainingSeconds;
				break;
			}

			case 'player_reconnected': {
				const data = payload as PlayerReconnectedEvent;
				if (data.playerId !== this.userId) {
					toaster.info("Votre adversaire s'est reconnecté.");
				}
				break;
			}
		}
	}

	/**
	 * Broadcast an event to other players
	 */
	private broadcastEvent(event: string, payload: Record<string, unknown>) {
		if (!this.channel) return;

		this.channel.send({
			type: 'broadcast',
			event,
			payload
		});
	}

	// ============================================================================
	// Reconnection Logic
	// ============================================================================

	/**
	 * Handle disconnection
	 */
	private handleDisconnect() {
		this.isConnected = false;
		this.isReconnecting = true;

		toaster.warning('Connexion perdue. Tentative de reconnexion...');

		this.attemptReconnect();
	}

	/**
	 * Handle successful reconnection
	 */
	private handleReconnect() {
		this.isReconnecting = false;
		this.reconnectAttempts = 0;
		this.clearReconnectTimeout();

		toaster.success('Connexion rétablie !');

		// Broadcast reconnection
		if (this.userId) {
			this.broadcastEvent('player_reconnected', { playerId: this.userId });
		}
	}

	/**
	 * Attempt to reconnect with exponential backoff
	 */
	private async attemptReconnect() {
		if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			this.isReconnecting = false;
			toaster.error('Impossible de se reconnecter. La partie a peut-être été abandonnée.');
			await this.cleanup();
			return;
		}

		this.reconnectAttempts++;

		// Exponential backoff: 5s, 10s, 20s, 40s, 80s
		const delay = RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1);

		this.reconnectTimeout = setTimeout(() => {
			if (this.game && this.supabase) {
				// Try to resubscribe
				this.subscribeToGame(this.game.id);
			}
		}, delay);
	}

	/**
	 * Clear reconnection timeout
	 */
	private clearReconnectTimeout() {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const guessWhoStore = new GuessWhoGameStore();
