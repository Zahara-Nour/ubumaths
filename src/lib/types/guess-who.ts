/**
 * TypeScript types for Guess Who Math Game
 *
 * @module types/guess-who
 */

import type { QuestionType } from '$lib/utils/guess-who/math-properties';

// Re-export for convenience
export type { QuestionType } from '$lib/utils/guess-who/math-properties';

// ============================================================================
// GAME STATUS & MOVE TYPES
// ============================================================================

/**
 * Game status representing the current state of a Guess Who game
 */
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';

/**
 * Type of move a player can make in the game
 */
export type MoveType = 'question' | 'answer' | 'guess';

// ============================================================================
// GAME STATE
// ============================================================================

/**
 * Main game state (client-side representation)
 * Synced from database via Supabase Realtime
 */
export interface GuessWhoGame {
	id: string;
	player1Id: string;
	player2Id: string | null;
	status: GameStatus;
	gridNumbers: number[];
	currentTurnPlayerId: string | null;
	bonusTurnsRemaining: number;
	winnerId: string | null;
	shareToken: string;
	turnStartedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Player's view of the game (includes their secret number)
 * Used to provide player-specific data while hiding opponent's secret
 */
export interface GuessWhoPlayerView extends GuessWhoGame {
	mySecretNumber: number;
	eliminatedNumbers: number[];
}

// ============================================================================
// MOVE RECORDS
// ============================================================================

/**
 * Record of a single move in the game
 * Stored in guess_who_moves table
 */
export interface GuessWhoMove {
	id: string;
	gameId: string;
	playerId: string;
	moveNumber: number;
	moveType: MoveType;
	questionType: QuestionType | null;
	questionParam: number | null;
	answer: boolean | null;
	isCorrect: boolean | null;
	correctAnswer: boolean | null;
	guessedNumber: number | null;
	createdAt: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Response when creating a new game
 * Includes share URL for inviting opponent
 */
export interface CreateGameResponse {
	game: GuessWhoGame;
	mySecretNumber: number;
	shareUrl: string;
}

/**
 * Response when joining an existing game via share token
 */
export interface JoinGameResponse {
	game: GuessWhoGame;
	mySecretNumber: number;
}

/**
 * Request to ask a question about opponent's secret number
 */
export interface AskQuestionRequest {
	questionType: QuestionType;
	questionParam?: number;
}

/**
 * Request to answer opponent's question
 */
export interface AnswerQuestionRequest {
	answer: boolean;
}

/**
 * Request to make a final guess of opponent's secret number
 */
export interface GuessRequest {
	guessedNumber: number;
}

/**
 * Request to update eliminated numbers on player's grid
 */
export interface EliminateRequest {
	eliminatedNumbers: number[];
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Question display information for UI rendering
 * Provides French labels and parameter options
 */
export interface QuestionInfo {
	type: QuestionType;
	labelFr: string;
	requiresParam: boolean;
	paramOptions?: number[];
}

/**
 * Available question types with French labels and configuration
 * Used to populate question selection UI
 */
export const QUESTION_INFO: QuestionInfo[] = [
	{ type: 'is_even', labelFr: 'Est-il pair ?', requiresParam: false },
	{ type: 'is_odd', labelFr: 'Est-il impair ?', requiresParam: false },
	{ type: 'is_prime', labelFr: 'Est-il premier ?', requiresParam: false },
	{ type: 'is_perfect_square', labelFr: 'Est-il un carré parfait ?', requiresParam: false },
	{
		type: 'is_divisible_by',
		labelFr: 'Est-il divisible par...',
		requiresParam: true,
		paramOptions: [2, 3, 5, 7, 10]
	},
	{
		type: 'is_multiple_of',
		labelFr: 'Est-il un multiple de...',
		requiresParam: true,
		paramOptions: [2, 3, 4, 5, 6, 7, 8, 9, 10]
	},
	{
		type: 'greater_than',
		labelFr: 'Est-il supérieur à...',
		requiresParam: true,
		paramOptions: [10, 25, 50, 75]
	},
	{
		type: 'less_than',
		labelFr: 'Est-il inférieur à...',
		requiresParam: true,
		paramOptions: [10, 25, 50, 75]
	},
	{
		type: 'units_digit',
		labelFr: 'Son chiffre des unités est-il...',
		requiresParam: true,
		paramOptions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	},
	{
		type: 'tens_digit',
		labelFr: 'Son chiffre des dizaines est-il...',
		requiresParam: true,
		paramOptions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	},
	{
		type: 'sum_digits',
		labelFr: 'La somme de ses chiffres est-elle...',
		requiresParam: true,
		paramOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
	}
];
