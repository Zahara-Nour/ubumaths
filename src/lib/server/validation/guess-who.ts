/**
 * Validation schemas for Guess Who Math Game API endpoints
 * All endpoints require strict validation to prevent manipulation
 *
 * @module server/validation/guess-who
 */

import { z } from 'zod';

// ============================================================================
// QUESTION TYPE SCHEMA
// ============================================================================

/**
 * Question types enum (matching database and QuestionType from math-properties)
 * These are all the mathematical properties a player can ask about
 */
export const questionTypeSchema = z.enum([
	'is_even',
	'is_odd',
	'is_prime',
	'is_multiple_of',
	'is_divisible_by',
	'greater_than',
	'less_than',
	'units_digit',
	'tens_digit',
	'is_perfect_square',
	'sum_digits'
]);

// ============================================================================
// GAME MANAGEMENT SCHEMAS
// ============================================================================

/**
 * POST /api/games/guess-who/create
 * Create a new Guess Who game
 *
 * Security constraints:
 * - No body required (authenticated user becomes player1)
 * - Game ID and secret number generated server-side
 */
export const createGameSchema = z.object({});

/**
 * POST /api/games/guess-who/join
 * Join an existing game via share token
 *
 * Security constraints:
 * - token must be exactly 16 characters (prevents injection/brute force)
 */
export const joinGameSchema = z.object({
	token: z
		.string()
		.length(16, 'Token must be exactly 16 characters')
		.regex(/^[A-Za-z0-9]+$/, 'Token must be alphanumeric')
});

// ============================================================================
// GAMEPLAY SCHEMAS
// ============================================================================

/**
 * POST /api/games/guess-who/[id]/ask
 * Ask a question about opponent's secret number
 *
 * Security constraints:
 * - questionType must be valid enum value
 * - questionParam required for certain question types (0-99)
 * - questionParam validated based on question type requirements
 */
export const askQuestionSchema = z
	.object({
		questionType: questionTypeSchema,
		questionParam: z
			.number()
			.int('Question parameter must be an integer')
			.min(0, 'Question parameter must be >= 0')
			.max(99, 'Question parameter must be <= 99')
			.optional()
	})
	.refine(
		(data) => {
			// Question types that require a parameter
			const requiresParam = [
				'is_multiple_of',
				'is_divisible_by',
				'greater_than',
				'less_than',
				'units_digit',
				'tens_digit',
				'sum_digits'
			].includes(data.questionType);

			// If param is required, it must be provided
			return !requiresParam || data.questionParam !== undefined;
		},
		{
			message: 'questionParam is required for this question type',
			path: ['questionParam']
		}
	);

/**
 * POST /api/games/guess-who/[id]/answer
 * Answer opponent's question about your secret number
 *
 * Security constraints:
 * - answer must be boolean (true/false)
 * - Correct answer verified server-side against secret number
 */
export const answerQuestionSchema = z.object({
	answer: z.boolean('Answer must be a boolean (true or false)')
});

/**
 * POST /api/games/guess-who/[id]/guess
 * Make a final guess of opponent's secret number
 *
 * Security constraints:
 * - guessedNumber must be integer 2-99 (game grid range)
 * - Guess result verified server-side
 */
export const guessSchema = z.object({
	guessedNumber: z
		.number()
		.int('Guessed number must be an integer')
		.min(2, 'Guessed number must be >= 2')
		.max(99, 'Guessed number must be <= 99')
});

/**
 * POST /api/games/guess-who/[id]/eliminate
 * Update eliminated numbers on player's grid (client-side tracking only)
 *
 * Security constraints:
 * - eliminatedNumbers must be array of integers 2-99
 * - Max 24 numbers (allows eliminating up to 24 of 25 grid numbers)
 * - No duplicate numbers allowed
 */
export const eliminateSchema = z.object({
	eliminatedNumbers: z
		.array(
			z
				.number()
				.int('Eliminated numbers must be integers')
				.min(2, 'Eliminated numbers must be >= 2')
				.max(99, 'Eliminated numbers must be <= 99'),
			{
				message: 'eliminatedNumbers must be an array of integers'
			}
		)
		.max(24, 'Cannot eliminate more than 24 numbers (max grid size - 1)')
		.refine((nums) => new Set(nums).size === nums.length, {
			message: 'Eliminated numbers must be unique (no duplicates)'
		})
});

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

/**
 * Game ID URL parameter validation
 * Used in all game-specific endpoints
 *
 * Security constraints:
 * - id must be valid UUID (prevents injection)
 */
export const gameIdParamSchema = z.object({
	id: z.string().uuid('Game ID must be a valid UUID')
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;
export type GuessInput = z.infer<typeof guessSchema>;
export type EliminateInput = z.infer<typeof eliminateSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type GameIdParam = z.infer<typeof gameIdParamSchema>;
