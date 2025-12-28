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
 * Number question types (for number-based packs)
 */
export const numberQuestionTypeSchema = z.enum([
	'is_even',
	'is_odd',
	'is_prime',
	'is_multiple_of',
	'is_divisible_by',
	'greater_than',
	'less_than',
	'units_digit',
	'tens_digit',
	'hundreds_digit',
	'is_perfect_square',
	'sum_digits'
]);

/**
 * Fraction question types (for fraction-based packs)
 */
export const fractionQuestionTypeSchema = z.enum([
	'is_irreducible',
	'has_even_numerator',
	'has_odd_numerator',
	'has_prime_denominator',
	'greater_than_one',
	'less_than_one',
	'equal_to_half',
	'numerator_greater_than',
	'denominator_less_than'
]);

/**
 * 2D Shape question types (for geometry-based packs)
 */
export const shape2DQuestionTypeSchema = z.enum([
	'side_count_equals',
	'side_count_greater_than',
	'is_regular_polygon',
	'is_convex',
	'has_right_angle',
	'has_parallel_sides',
	'has_equal_sides',
	'symmetry_axes_greater_than'
]);

/**
 * Expression question types (for algebra-based packs)
 */
export const expressionQuestionTypeSchema = z.enum([
	'degree_equals',
	'degree_greater_than',
	'is_monomial',
	'is_polynomial',
	'has_x_squared',
	'has_x_cubed',
	'coefficient_of_x_positive',
	'coefficient_of_x_negative',
	'constant_term_positive',
	'has_fraction',
	'has_square_root',
	'has_trig_function',
	'has_exp_function',
	'has_log_function'
]);

/**
 * Function question types (for function graph packs)
 */
export const functionQuestionTypeSchema = z.enum([
	'passes_origin',
	'increasing_at_zero',
	'decreasing_at_zero',
	'has_maximum',
	'has_minimum',
	'has_root',
	'root_count',
	'has_horizontal_asymptote',
	'has_vertical_asymptote',
	'is_even_function',
	'is_odd_function',
	'y_intercept_positive',
	'y_intercept_negative'
]);

/**
 * Polyhedron question types (for 3D geometry packs)
 */
export const polyhedronQuestionTypeSchema = z.enum([
	'face_count_equals',
	'face_count_greater_than',
	'vertex_count_equals',
	'edge_count_equals',
	'is_regular_polyhedron',
	'is_prism',
	'is_pyramid',
	'has_square_faces',
	'has_triangular_faces',
	'is_platonic_solid'
]);

/**
 * Combined question types enum (all types for polymorphic support)
 */
export const questionTypeSchema = z.union([
	numberQuestionTypeSchema,
	fractionQuestionTypeSchema,
	shape2DQuestionTypeSchema,
	expressionQuestionTypeSchema,
	functionQuestionTypeSchema,
	polyhedronQuestionTypeSchema
]);

/**
 * Game pack IDs - different number sets and difficulty levels
 */
export const gamePackIdSchema = z.enum([
	// Number packs
	'naturals_easy', // CM1: 2-50
	'naturals_medium', // CM2: 2-99 (default)
	'naturals_hard', // 6ème: 10-200
	'times_tables', // CM1-CM2: Multiples focus
	'primes_focus', // 6ème: Prime numbers focus
	// Fraction packs
	'fractions_6eme',
	'fractions_5eme',
	'fractions_4eme',
	// 2D Shape packs
	'shapes2d_cm1',
	'shapes2d_cm2',
	'shapes2d_6eme',
	'shapes2d_5eme',
	// Expression packs
	'expressions_4eme',
	'expressions_3eme',
	'expressions_2nde',
	// Function packs
	'functions_3eme',
	'functions_2nde',
	'functions_1ere',
	// Polyhedra packs
	'polyhedra_5eme',
	'polyhedra_4eme',
	'polyhedra_3eme'
]);

// ============================================================================
// GAME MANAGEMENT SCHEMAS
// ============================================================================

/**
 * POST /api/games/guess-who/create
 * Create a new Guess Who game
 *
 * Security constraints:
 * - packId optional (defaults to 'naturals_medium')
 * - Game ID and secret number generated server-side
 */
export const createGameSchema = z.object({
	packId: gamePackIdSchema.optional().default('naturals_medium')
});

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
 * Ask a question about opponent's secret item (polymorphic support)
 *
 * Security constraints:
 * - questionType must be valid enum value for the item type
 * - questionParam required for certain question types (numeric)
 * - questionParamText for questions requiring string params (not implemented yet)
 */
export const askQuestionSchema = z
	.object({
		questionType: questionTypeSchema,
		questionParam: z
			.number()
			.int('Question parameter must be an integer')
			.min(0, 'Question parameter must be >= 0')
			.max(200, 'Question parameter must be <= 200')
			.optional(),
		questionParamText: z.string().max(100).optional()
	})
	.refine(
		(data) => {
			// Question types that require a numeric parameter
			const requiresNumericParam = [
				// Number questions
				'is_multiple_of',
				'is_divisible_by',
				'greater_than',
				'less_than',
				'units_digit',
				'tens_digit',
				'hundreds_digit',
				'sum_digits',
				// Fraction questions
				'numerator_greater_than',
				'denominator_less_than',
				// Shape questions
				'side_count_equals',
				'side_count_greater_than',
				'symmetry_axes_greater_than',
				// Expression questions
				'degree_equals',
				'degree_greater_than',
				// Function questions
				'root_count',
				// Polyhedron questions
				'face_count_equals',
				'face_count_greater_than',
				'vertex_count_equals',
				'edge_count_equals'
			].includes(data.questionType);

			// If param is required, it must be provided
			return !requiresNumericParam || data.questionParam !== undefined;
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
 * Grid item schema for polymorphic guesses
 * Matches the GridItem type structure
 */
export const gridItemSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('number'), value: z.number() }),
	z.object({ type: z.literal('fraction'), numerator: z.number(), denominator: z.number() }),
	z.object({
		type: z.literal('shape2d'),
		shapeName: z.string(),
		sideCount: z.number(),
		isRegular: z.boolean(),
		isConvex: z.boolean(),
		hasRightAngle: z.boolean(),
		nameFr: z.string(),
		svgPath: z.string(),
		shape: z.object({}).passthrough()
	}),
	z.object({
		type: z.literal('expression'),
		latex: z.string(),
		expression: z.object({}).passthrough()
	}),
	z.object({
		type: z.literal('function'),
		latex: z.string(),
		graph: z.object({}).passthrough()
	}),
	z.object({
		type: z.literal('polyhedron'),
		name: z.string(),
		nameFr: z.string(),
		faceCount: z.number(),
		vertexCount: z.number(),
		edgeCount: z.number(),
		isRegular: z.boolean(),
		polyhedron: z.object({}).passthrough()
	})
]);

/**
 * POST /api/games/guess-who/[id]/guess
 * Make a final guess of opponent's secret item
 *
 * Security constraints:
 * - For number packs: guessedNumber must be integer 2-200
 * - For polymorphic packs: guessedItem must be a valid GridItem
 * - Guess result verified server-side
 */
export const guessSchema = z
	.object({
		guessedNumber: z
			.number()
			.int('Guessed number must be an integer')
			.min(2, 'Guessed number must be >= 2')
			.max(200, 'Guessed number must be <= 200')
			.optional(),
		guessedItem: gridItemSchema.optional()
	})
	.refine((data) => data.guessedNumber !== undefined || data.guessedItem !== undefined, {
		message: 'Either guessedNumber or guessedItem must be provided'
	});

/**
 * POST /api/games/guess-who/[id]/eliminate
 * Update eliminated numbers on player's grid (client-side tracking only)
 *
 * Security constraints:
 * - eliminatedNumbers must be array of integers 2-200 (varies by pack)
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
				.max(200, 'Eliminated numbers must be <= 200'),
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

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;
export type GuessInput = z.infer<typeof guessSchema>;
export type EliminateInput = z.infer<typeof eliminateSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type GameIdParam = z.infer<typeof gameIdParamSchema>;
export type GamePackIdInput = z.infer<typeof gamePackIdSchema>;
