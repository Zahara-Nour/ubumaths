/**
 * TypeScript types for Guess Who Math Game
 *
 * @module types/guess-who
 */

import type { QuestionType } from '$lib/utils/guess-who/math-properties';

// Re-export for convenience
export type { QuestionType } from '$lib/utils/guess-who/math-properties';

// ============================================================================
// GAME PACKS
// ============================================================================

/**
 * Available game pack identifiers
 */
export type GamePackId =
	| 'naturals_easy' // CM1: 2-50
	| 'naturals_medium' // CM2: 2-99 (default)
	| 'naturals_hard' // 6ème: 10-200
	| 'times_tables' // CM1-CM2: Multiples focus
	| 'primes_focus'; // 6ème: Prime numbers focus

/**
 * Configuration for a game pack
 */
export interface GamePackConfig {
	id: GamePackId;
	nameFr: string;
	descriptionFr: string;
	level: 'CM1' | 'CM2' | '6ème';
	gridSize: number;
	/** Function to generate numbers for this pack */
	generateNumbers: () => number[];
	/** Question types available in this pack */
	availableQuestions: QuestionType[];
}

/**
 * Game pack configurations
 */
export const GAME_PACKS: Record<GamePackId, GamePackConfig> = {
	naturals_easy: {
		id: 'naturals_easy',
		nameFr: 'Nombres Naturels (Facile)',
		descriptionFr: 'Nombres de 2 à 50 - Idéal pour débuter',
		level: 'CM1',
		gridSize: 24,
		generateNumbers: () => generateUniqueRandomNumbers(2, 50, 24),
		availableQuestions: [
			'is_even',
			'is_odd',
			'is_divisible_by',
			'is_multiple_of',
			'greater_than',
			'less_than',
			'units_digit'
		]
	},
	naturals_medium: {
		id: 'naturals_medium',
		nameFr: 'Nombres Naturels (Standard)',
		descriptionFr: 'Nombres de 2 à 99 - Le mode classique',
		level: 'CM2',
		gridSize: 24,
		generateNumbers: () => generateUniqueRandomNumbers(2, 99, 24),
		availableQuestions: [
			'is_even',
			'is_odd',
			'is_prime',
			'is_divisible_by',
			'is_multiple_of',
			'greater_than',
			'less_than',
			'units_digit',
			'tens_digit',
			'is_perfect_square',
			'sum_digits'
		]
	},
	naturals_hard: {
		id: 'naturals_hard',
		nameFr: 'Grands Nombres',
		descriptionFr: 'Nombres de 10 à 200 - Pour les experts',
		level: '6ème',
		gridSize: 24,
		generateNumbers: () => generateUniqueRandomNumbers(10, 200, 24),
		availableQuestions: [
			'is_even',
			'is_odd',
			'is_prime',
			'is_divisible_by',
			'is_multiple_of',
			'greater_than',
			'less_than',
			'units_digit',
			'tens_digit',
			'hundreds_digit',
			'is_perfect_square',
			'sum_digits'
		]
	},
	times_tables: {
		id: 'times_tables',
		nameFr: 'Tables de Multiplication',
		descriptionFr: 'Multiples de 2 à 10 - Révise tes tables !',
		level: 'CM1',
		gridSize: 24,
		generateNumbers: () => generateTimesTablesNumbers(24),
		availableQuestions: [
			'is_even',
			'is_odd',
			'is_divisible_by',
			'is_multiple_of',
			'greater_than',
			'less_than',
			'units_digit'
		]
	},
	primes_focus: {
		id: 'primes_focus',
		nameFr: 'Nombres Premiers',
		descriptionFr: 'Mélange de nombres premiers et composés',
		level: '6ème',
		gridSize: 24,
		generateNumbers: () => generatePrimesFocusNumbers(24),
		availableQuestions: [
			'is_even',
			'is_odd',
			'is_prime',
			'is_divisible_by',
			'greater_than',
			'less_than',
			'units_digit',
			'tens_digit',
			'sum_digits'
		]
	}
};

// ============================================================================
// PACK GENERATION HELPERS
// ============================================================================

/**
 * Generate unique random numbers in a range
 */
function generateUniqueRandomNumbers(min: number, max: number, count: number): number[] {
	const numbers = new Set<number>();
	const range = max - min + 1;

	if (count > range) {
		throw new Error(`Cannot generate ${count} unique numbers in range [${min}, ${max}]`);
	}

	while (numbers.size < count) {
		const randomNum = Math.floor(Math.random() * range) + min;
		numbers.add(randomNum);
	}

	return Array.from(numbers);
}

/**
 * Generate numbers focusing on times tables (multiples of 2-10)
 */
function generateTimesTablesNumbers(count: number): number[] {
	const multiples = new Set<number>();

	// Generate all multiples of 2-10 up to 100
	for (let base = 2; base <= 10; base++) {
		for (let multiplier = 1; multiplier <= 10; multiplier++) {
			multiples.add(base * multiplier);
		}
	}

	const pool = Array.from(multiples);

	// Shuffle and pick required count
	const shuffled = pool.sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

/**
 * Prime numbers up to 100
 */
const PRIMES_UP_TO_100 = [
	2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97
];

/**
 * Generate numbers with mix of primes and composites
 * Ensures ~50% are primes for interesting gameplay
 */
function generatePrimesFocusNumbers(count: number): number[] {
	const primeCount = Math.floor(count / 2);
	const compositeCount = count - primeCount;

	// Pick random primes
	const shuffledPrimes = [...PRIMES_UP_TO_100].sort(() => Math.random() - 0.5);
	const selectedPrimes = shuffledPrimes.slice(0, primeCount);

	// Generate composites (non-prime numbers)
	const composites = new Set<number>();
	const usedNumbers = new Set(selectedPrimes);

	while (composites.size < compositeCount) {
		const num = Math.floor(Math.random() * 98) + 2;
		if (!usedNumbers.has(num) && !PRIMES_UP_TO_100.includes(num)) {
			composites.add(num);
			usedNumbers.add(num);
		}
	}

	return [...selectedPrimes, ...Array.from(composites)];
}

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
	packId: GamePackId;
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
		type: 'hundreds_digit',
		labelFr: 'Son chiffre des centaines est-il...',
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
