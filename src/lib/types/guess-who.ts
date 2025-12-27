/**
 * TypeScript types for Guess Who Math Game
 *
 * @module types/guess-who
 */

import type { QuestionType } from '$lib/utils/guess-who/math-properties';
import type { GridItem, GridItemType } from '$lib/utils/guess-who/grid-item';
import type { FractionQuestionType } from '$lib/utils/guess-who/fraction-properties';
import { generateUniqueFractions } from '$lib/utils/guess-who/fraction-properties';
import type { Shape2DQuestionType } from '$lib/utils/guess-who/shape2d-properties';
import { generateShapeGrid } from '$lib/utils/guess-who/shape2d-properties';
import type { ExpressionQuestionType } from '$lib/utils/guess-who/expression-properties';
import { generateExpressionGrid } from '$lib/utils/guess-who/expression-properties';
import type { FunctionQuestionType } from '$lib/utils/guess-who/function-properties';
import { generateFunctionGrid } from '$lib/utils/guess-who/function-properties';
import type { PolyhedronQuestionType } from '$lib/utils/guess-who/polyhedron-properties';
import { generatePolyhedronGrid } from '$lib/utils/guess-who/polyhedron-properties';
import {
	fractionItemFrom,
	shape2DItemFrom,
	expressionItemFrom,
	functionItemFrom,
	polyhedronItemFrom
} from '$lib/utils/guess-who/grid-item';

// Re-export for convenience
export type { QuestionType } from '$lib/utils/guess-who/math-properties';
export type { GridItem, GridItemType } from '$lib/utils/guess-who/grid-item';

// ============================================================================
// GAME PACKS
// ============================================================================

/**
 * Available game pack identifiers
 */
export type GamePackId =
	// Number packs
	| 'naturals_easy' // CM1: 2-50
	| 'naturals_medium' // CM2: 2-99 (default)
	| 'naturals_hard' // 6ème: 10-200
	| 'times_tables' // CM1-CM2: Multiples focus
	| 'primes_focus' // 6ème: Prime numbers focus
	// Fraction packs
	| 'fractions_6eme' // 6ème: Basic fractions
	| 'fractions_5eme' // 5ème: Mixed fractions
	| 'fractions_4eme' // 4ème: Complex fractions
	// 2D Shape packs
	| 'shapes2d_cm1' // CM1: Basic shapes
	| 'shapes2d_cm2' // CM2: More shapes
	| 'shapes2d_6eme' // 6ème: All shapes
	| 'shapes2d_5eme' // 5ème: Advanced properties
	// Algebraic expression packs
	| 'expressions_4eme' // 4ème: Simple expressions
	| 'expressions_3eme' // 3ème: Polynomials
	| 'expressions_2nde' // 2nde: Advanced expressions
	// Function graph packs
	| 'functions_3eme' // 3ème: Linear/quadratic
	| 'functions_2nde' // 2nde: More functions
	| 'functions_1ere' // 1ère: All function types
	// 3D Polyhedra packs
	| 'polyhedra_5eme' // 5ème: Basic solids
	| 'polyhedra_4eme' // 4ème: Platonic + prisms
	| 'polyhedra_3eme'; // 3ème: All polyhedra

/**
 * All question types across all pack types
 */
export type AnyQuestionType =
	| QuestionType
	| FractionQuestionType
	| Shape2DQuestionType
	| ExpressionQuestionType
	| FunctionQuestionType
	| PolyhedronQuestionType;

/**
 * Levels available for packs
 */
export type PackLevel = 'CM1' | 'CM2' | '6ème' | '5ème' | '4ème' | '3ème' | '2nde' | '1ère';

/**
 * Base configuration for all game packs
 */
export interface BaseGamePackConfig {
	id: GamePackId;
	nameFr: string;
	descriptionFr: string;
	level: PackLevel;
	gridSize: number;
	/** Type of items in this pack */
	itemType: GridItemType;
}

/**
 * Configuration for number-based packs
 */
export interface NumberPackConfig extends BaseGamePackConfig {
	itemType: 'number';
	/** Function to generate numbers for this pack */
	generateNumbers: () => number[];
	/** Question types available in this pack */
	availableQuestions: QuestionType[];
}

/**
 * Configuration for polymorphic packs (non-number)
 */
export interface PolymorphicPackConfig extends BaseGamePackConfig {
	itemType: Exclude<GridItemType, 'number'>;
	/** Function to generate items for this pack */
	generateItems: () => GridItem[];
	/** Question types available in this pack */
	availableQuestions: AnyQuestionType[];
}

/**
 * Union of all pack configuration types
 */
export type GamePackConfig = NumberPackConfig | PolymorphicPackConfig;

/**
 * Type guard for number packs
 */
export function isNumberPack(config: GamePackConfig): config is NumberPackConfig {
	return config.itemType === 'number';
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
		itemType: 'number',
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
		itemType: 'number',
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
		itemType: 'number',
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
		itemType: 'number',
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
		itemType: 'number',
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
	},
	// ========== FRACTION PACKS ==========
	fractions_6eme: {
		id: 'fractions_6eme',
		nameFr: 'Fractions (6ème)',
		descriptionFr: 'Fractions simples - Initiation aux fractions',
		level: '6ème',
		gridSize: 24,
		itemType: 'fraction',
		generateItems: () => generateUniqueFractions(24, 1, 10, 2, 10).map(fractionItemFrom),
		availableQuestions: [
			'is_irreducible',
			'numerator_even',
			'numerator_odd',
			'denominator_even',
			'denominator_odd',
			'greater_than_one',
			'less_than_one',
			'equals_one'
		] as FractionQuestionType[]
	},
	fractions_5eme: {
		id: 'fractions_5eme',
		nameFr: 'Fractions (5ème)',
		descriptionFr: 'Fractions avec nombres premiers',
		level: '5ème',
		gridSize: 24,
		itemType: 'fraction',
		generateItems: () => generateUniqueFractions(24, 1, 15, 2, 12).map(fractionItemFrom),
		availableQuestions: [
			'is_irreducible',
			'numerator_even',
			'numerator_odd',
			'numerator_prime',
			'denominator_even',
			'denominator_odd',
			'denominator_prime',
			'greater_than_one',
			'less_than_one',
			'equivalent_to_half'
		] as FractionQuestionType[]
	},
	fractions_4eme: {
		id: 'fractions_4eme',
		nameFr: 'Fractions (4ème)',
		descriptionFr: 'Fractions complexes avec comparaisons',
		level: '4ème',
		gridSize: 24,
		itemType: 'fraction',
		generateItems: () => generateUniqueFractions(24, 1, 20, 2, 15).map(fractionItemFrom),
		availableQuestions: [
			'is_irreducible',
			'numerator_even',
			'numerator_odd',
			'numerator_prime',
			'denominator_even',
			'denominator_odd',
			'denominator_prime',
			'greater_than_one',
			'less_than_one',
			'equivalent_to_half',
			'numerator_greater_than',
			'numerator_less_than',
			'denominator_greater_than',
			'denominator_less_than'
		] as FractionQuestionType[]
	},
	// ========== 2D SHAPE PACKS ==========
	shapes2d_cm1: {
		id: 'shapes2d_cm1',
		nameFr: 'Formes 2D (CM1)',
		descriptionFr: 'Formes géométriques de base',
		level: 'CM1',
		gridSize: 24,
		itemType: 'shape2d',
		generateItems: () => generateShapeGrid(24, { maxSides: 4 }).map(shape2DItemFrom),
		availableQuestions: [
			'sides_count',
			'has_right_angles',
			'is_triangle',
			'is_quadrilateral',
			'has_curved_edges'
		] as Shape2DQuestionType[]
	},
	shapes2d_cm2: {
		id: 'shapes2d_cm2',
		nameFr: 'Formes 2D (CM2)',
		descriptionFr: 'Polygones réguliers et propriétés',
		level: 'CM2',
		gridSize: 24,
		itemType: 'shape2d',
		generateItems: () =>
			generateShapeGrid(24, { maxSides: 6, onlyPolygons: true }).map(shape2DItemFrom),
		availableQuestions: [
			'sides_count',
			'sides_greater_than',
			'sides_less_than',
			'has_right_angles',
			'is_regular',
			'is_triangle',
			'is_quadrilateral',
			'is_polygon'
		] as Shape2DQuestionType[]
	},
	shapes2d_6eme: {
		id: 'shapes2d_6eme',
		nameFr: 'Formes 2D (6ème)',
		descriptionFr: 'Toutes les formes avec symétrie',
		level: '6ème',
		gridSize: 24,
		itemType: 'shape2d',
		generateItems: () => generateShapeGrid(24).map(shape2DItemFrom),
		availableQuestions: [
			'sides_count',
			'sides_greater_than',
			'sides_less_than',
			'has_right_angles',
			'is_regular',
			'is_convex',
			'has_axis_symmetry',
			'has_center_symmetry',
			'is_triangle',
			'is_quadrilateral'
		] as Shape2DQuestionType[]
	},
	shapes2d_5eme: {
		id: 'shapes2d_5eme',
		nameFr: 'Formes 2D (5ème)',
		descriptionFr: 'Propriétés avancées des polygones',
		level: '5ème',
		gridSize: 24,
		itemType: 'shape2d',
		generateItems: () => generateShapeGrid(24).map(shape2DItemFrom),
		availableQuestions: [
			'sides_count',
			'sides_greater_than',
			'has_right_angles',
			'is_regular',
			'is_convex',
			'has_axis_symmetry',
			'axes_count',
			'axes_greater_than',
			'has_center_symmetry',
			'has_equal_sides',
			'has_parallel_sides'
		] as Shape2DQuestionType[]
	},
	// ========== EXPRESSION PACKS ==========
	expressions_4eme: {
		id: 'expressions_4eme',
		nameFr: 'Expressions (4ème)',
		descriptionFr: 'Expressions algébriques simples',
		level: '4ème',
		gridSize: 24,
		itemType: 'expression',
		generateItems: () => generateExpressionGrid(24).map(expressionItemFrom),
		availableQuestions: [
			'degree_equals',
			'is_monomial',
			'is_polynomial',
			'term_count_equals',
			'has_x_squared',
			'coeff_x_positive',
			'coeff_x_negative',
			'constant_positive',
			'constant_negative',
			'constant_zero'
		] as ExpressionQuestionType[]
	},
	expressions_3eme: {
		id: 'expressions_3eme',
		nameFr: 'Expressions (3ème)',
		descriptionFr: 'Polynômes et propriétés',
		level: '3ème',
		gridSize: 24,
		itemType: 'expression',
		generateItems: () => generateExpressionGrid(24).map(expressionItemFrom),
		availableQuestions: [
			'degree_equals',
			'degree_greater_than',
			'is_monomial',
			'is_polynomial',
			'term_count_equals',
			'term_count_greater_than',
			'has_x_squared',
			'has_x_cubed',
			'coeff_x_positive',
			'coeff_x_negative',
			'coeff_x2_positive',
			'coeff_x2_negative',
			'leading_coeff_positive',
			'leading_coeff_negative'
		] as ExpressionQuestionType[]
	},
	expressions_2nde: {
		id: 'expressions_2nde',
		nameFr: 'Expressions (2nde)',
		descriptionFr: 'Expressions avancées avec racines',
		level: '2nde',
		gridSize: 24,
		itemType: 'expression',
		generateItems: () => generateExpressionGrid(24).map(expressionItemFrom),
		availableQuestions: [
			'degree_equals',
			'degree_greater_than',
			'degree_less_than',
			'variable_count',
			'has_variable',
			'is_monomial',
			'is_polynomial',
			'term_count_equals',
			'has_fraction',
			'has_square_root',
			'has_x_squared',
			'has_x_cubed',
			'coeff_x_positive',
			'coeff_x2_positive',
			'leading_coeff_positive'
		] as ExpressionQuestionType[]
	},
	// ========== FUNCTION PACKS ==========
	functions_3eme: {
		id: 'functions_3eme',
		nameFr: 'Fonctions (3ème)',
		descriptionFr: 'Fonctions linéaires et affines',
		level: '3ème',
		gridSize: 24,
		itemType: 'function',
		generateItems: () => generateFunctionGrid(24).map(functionItemFrom),
		availableQuestions: [
			'passes_origin',
			'increasing_at_zero',
			'decreasing_at_zero',
			'y_intercept_positive',
			'y_intercept_negative',
			'y_intercept_zero',
			'is_always_positive',
			'is_always_negative'
		] as FunctionQuestionType[]
	},
	functions_2nde: {
		id: 'functions_2nde',
		nameFr: 'Fonctions (2nde)',
		descriptionFr: 'Fonctions polynomiales',
		level: '2nde',
		gridSize: 24,
		itemType: 'function',
		generateItems: () => generateFunctionGrid(24).map(functionItemFrom),
		availableQuestions: [
			'passes_origin',
			'increasing_at_zero',
			'decreasing_at_zero',
			'has_maximum',
			'has_minimum',
			'has_root',
			'root_count',
			'y_intercept_positive',
			'y_intercept_negative',
			'is_even',
			'is_odd'
		] as FunctionQuestionType[]
	},
	functions_1ere: {
		id: 'functions_1ere',
		nameFr: 'Fonctions (1ère)',
		descriptionFr: 'Toutes les fonctions avec asymptotes',
		level: '1ère',
		gridSize: 24,
		itemType: 'function',
		generateItems: () => generateFunctionGrid(24).map(functionItemFrom),
		availableQuestions: [
			'passes_origin',
			'increasing_at_zero',
			'decreasing_at_zero',
			'has_maximum',
			'has_minimum',
			'has_root',
			'root_count',
			'root_count_greater_than',
			'has_horizontal_asymptote',
			'has_vertical_asymptote',
			'is_even',
			'is_odd',
			'y_intercept_positive',
			'y_intercept_negative'
		] as FunctionQuestionType[]
	},
	// ========== POLYHEDRA PACKS ==========
	polyhedra_5eme: {
		id: 'polyhedra_5eme',
		nameFr: 'Polyèdres (5ème)',
		descriptionFr: 'Solides de base',
		level: '5ème',
		gridSize: 24,
		itemType: 'polyhedron',
		generateItems: () => generatePolyhedronGrid(24).map(polyhedronItemFrom),
		availableQuestions: [
			'face_count_equals',
			'face_count_greater_than',
			'vertex_count_equals',
			'is_prism',
			'is_pyramid',
			'has_square_faces',
			'has_triangular_faces'
		] as PolyhedronQuestionType[]
	},
	polyhedra_4eme: {
		id: 'polyhedra_4eme',
		nameFr: 'Polyèdres (4ème)',
		descriptionFr: 'Solides de Platon et prismes',
		level: '4ème',
		gridSize: 24,
		itemType: 'polyhedron',
		generateItems: () => generatePolyhedronGrid(24).map(polyhedronItemFrom),
		availableQuestions: [
			'face_count_equals',
			'face_count_greater_than',
			'face_count_less_than',
			'vertex_count_equals',
			'vertex_count_greater_than',
			'edge_count_equals',
			'is_regular',
			'is_prism',
			'is_pyramid',
			'has_square_faces',
			'has_triangular_faces',
			'has_pentagonal_faces',
			'is_platonic_solid'
		] as PolyhedronQuestionType[]
	},
	polyhedra_3eme: {
		id: 'polyhedra_3eme',
		nameFr: 'Polyèdres (3ème)',
		descriptionFr: 'Tous les polyèdres',
		level: '3ème',
		gridSize: 24,
		itemType: 'polyhedron',
		generateItems: () => generatePolyhedronGrid(24).map(polyhedronItemFrom),
		availableQuestions: [
			'face_count_equals',
			'face_count_greater_than',
			'face_count_less_than',
			'vertex_count_equals',
			'vertex_count_greater_than',
			'edge_count_equals',
			'edge_count_greater_than',
			'is_regular',
			'is_prism',
			'is_pyramid',
			'is_antiprism',
			'has_square_faces',
			'has_triangular_faces',
			'has_pentagonal_faces',
			'has_hexagonal_faces',
			'has_uniform_faces',
			'is_convex',
			'is_platonic_solid'
		] as PolyhedronQuestionType[]
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
	type: AnyQuestionType;
	labelFr: string;
	requiresParam: boolean;
	paramOptions?: number[];
}

/**
 * All question types organized by category
 */
export const QUESTION_INFO: Record<GridItemType, QuestionInfo[]> = {
	// Number questions
	number: [
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
	],
	// Fraction questions
	fraction: [
		{ type: 'is_irreducible', labelFr: 'Est-elle irréductible ?', requiresParam: false },
		{ type: 'numerator_even', labelFr: 'Le numérateur est-il pair ?', requiresParam: false },
		{ type: 'numerator_odd', labelFr: 'Le numérateur est-il impair ?', requiresParam: false },
		{ type: 'numerator_prime', labelFr: 'Le numérateur est-il premier ?', requiresParam: false },
		{
			type: 'denominator_even',
			labelFr: 'Le dénominateur est-il pair ?',
			requiresParam: false
		},
		{
			type: 'denominator_odd',
			labelFr: 'Le dénominateur est-il impair ?',
			requiresParam: false
		},
		{
			type: 'denominator_prime',
			labelFr: 'Le dénominateur est-il premier ?',
			requiresParam: false
		},
		{ type: 'greater_than_one', labelFr: 'Est-elle supérieure à 1 ?', requiresParam: false },
		{ type: 'less_than_one', labelFr: 'Est-elle inférieure à 1 ?', requiresParam: false },
		{ type: 'equals_one', labelFr: 'Est-elle égale à 1 ?', requiresParam: false },
		{ type: 'equivalent_to_half', labelFr: 'Est-elle équivalente à 1/2 ?', requiresParam: false },
		{
			type: 'numerator_greater_than',
			labelFr: 'Le numérateur est-il supérieur à...',
			requiresParam: true,
			paramOptions: [1, 2, 3, 5, 10]
		},
		{
			type: 'numerator_less_than',
			labelFr: 'Le numérateur est-il inférieur à...',
			requiresParam: true,
			paramOptions: [5, 10, 15, 20]
		},
		{
			type: 'denominator_greater_than',
			labelFr: 'Le dénominateur est-il supérieur à...',
			requiresParam: true,
			paramOptions: [2, 3, 5, 10]
		},
		{
			type: 'denominator_less_than',
			labelFr: 'Le dénominateur est-il inférieur à...',
			requiresParam: true,
			paramOptions: [5, 10, 12, 15]
		},
		{
			type: 'denominator_equals',
			labelFr: 'Le dénominateur est-il égal à...',
			requiresParam: true,
			paramOptions: [2, 3, 4, 5, 6, 8, 10, 12]
		}
	],
	// 2D Shape questions
	shape2d: [
		{
			type: 'sides_count',
			labelFr: 'A-t-elle... côtés ?',
			requiresParam: true,
			paramOptions: [0, 3, 4, 5, 6, 8]
		},
		{
			type: 'sides_greater_than',
			labelFr: 'A-t-elle plus de... côtés ?',
			requiresParam: true,
			paramOptions: [3, 4, 5, 6]
		},
		{
			type: 'sides_less_than',
			labelFr: 'A-t-elle moins de... côtés ?',
			requiresParam: true,
			paramOptions: [4, 5, 6, 8]
		},
		{ type: 'has_right_angles', labelFr: 'A-t-elle des angles droits ?', requiresParam: false },
		{ type: 'is_regular', labelFr: 'Est-elle régulière ?', requiresParam: false },
		{ type: 'is_convex', labelFr: 'Est-elle convexe ?', requiresParam: false },
		{
			type: 'has_axis_symmetry',
			labelFr: 'A-t-elle un axe de symétrie ?',
			requiresParam: false
		},
		{
			type: 'axes_count',
			labelFr: 'A-t-elle... axes de symétrie ?',
			requiresParam: true,
			paramOptions: [0, 1, 2, 3, 4, 5, 6]
		},
		{
			type: 'axes_greater_than',
			labelFr: 'A-t-elle plus de... axes de symétrie ?',
			requiresParam: true,
			paramOptions: [0, 1, 2, 3, 4]
		},
		{
			type: 'has_center_symmetry',
			labelFr: 'A-t-elle un centre de symétrie ?',
			requiresParam: false
		},
		{ type: 'has_equal_sides', labelFr: 'A-t-elle des côtés égaux ?', requiresParam: false },
		{
			type: 'has_parallel_sides',
			labelFr: 'A-t-elle des côtés parallèles ?',
			requiresParam: false
		},
		{ type: 'is_triangle', labelFr: 'Est-ce un triangle ?', requiresParam: false },
		{ type: 'is_quadrilateral', labelFr: 'Est-ce un quadrilatère ?', requiresParam: false },
		{ type: 'is_polygon', labelFr: 'Est-ce un polygone ?', requiresParam: false },
		{ type: 'has_curved_edges', labelFr: 'A-t-elle des bords courbes ?', requiresParam: false }
	],
	// Expression questions
	expression: [
		{
			type: 'degree_equals',
			labelFr: 'Le degré est-il égal à...',
			requiresParam: true,
			paramOptions: [0, 1, 2, 3]
		},
		{
			type: 'degree_greater_than',
			labelFr: 'Le degré est-il supérieur à...',
			requiresParam: true,
			paramOptions: [0, 1, 2]
		},
		{
			type: 'degree_less_than',
			labelFr: 'Le degré est-il inférieur à...',
			requiresParam: true,
			paramOptions: [2, 3, 4]
		},
		{
			type: 'variable_count',
			labelFr: 'Y a-t-il... variables ?',
			requiresParam: true,
			paramOptions: [0, 1, 2, 3]
		},
		{ type: 'has_variable', labelFr: 'Contient-elle la variable x ?', requiresParam: false },
		{ type: 'is_monomial', labelFr: 'Est-ce un monôme ?', requiresParam: false },
		{ type: 'is_polynomial', labelFr: 'Est-ce un polynôme ?', requiresParam: false },
		{
			type: 'term_count_equals',
			labelFr: 'Y a-t-il... termes ?',
			requiresParam: true,
			paramOptions: [1, 2, 3, 4]
		},
		{
			type: 'term_count_greater_than',
			labelFr: 'Y a-t-il plus de... termes ?',
			requiresParam: true,
			paramOptions: [1, 2, 3]
		},
		{ type: 'has_fraction', labelFr: 'Contient-elle une fraction ?', requiresParam: false },
		{
			type: 'has_square_root',
			labelFr: 'Contient-elle une racine carrée ?',
			requiresParam: false
		},
		{ type: 'has_x_squared', labelFr: 'Contient-elle x² ?', requiresParam: false },
		{ type: 'has_x_cubed', labelFr: 'Contient-elle x³ ?', requiresParam: false },
		{
			type: 'coeff_x_positive',
			labelFr: 'Le coefficient de x est-il positif ?',
			requiresParam: false
		},
		{
			type: 'coeff_x_negative',
			labelFr: 'Le coefficient de x est-il négatif ?',
			requiresParam: false
		},
		{
			type: 'coeff_x2_positive',
			labelFr: 'Le coefficient de x² est-il positif ?',
			requiresParam: false
		},
		{
			type: 'coeff_x2_negative',
			labelFr: 'Le coefficient de x² est-il négatif ?',
			requiresParam: false
		},
		{
			type: 'constant_positive',
			labelFr: 'La constante est-elle positive ?',
			requiresParam: false
		},
		{
			type: 'constant_negative',
			labelFr: 'La constante est-elle négative ?',
			requiresParam: false
		},
		{ type: 'constant_zero', labelFr: 'La constante est-elle nulle ?', requiresParam: false },
		{
			type: 'leading_coeff_positive',
			labelFr: 'Le coefficient dominant est-il positif ?',
			requiresParam: false
		},
		{
			type: 'leading_coeff_negative',
			labelFr: 'Le coefficient dominant est-il négatif ?',
			requiresParam: false
		}
	],
	// Function questions
	function: [
		{ type: 'passes_origin', labelFr: "Passe-t-elle par l'origine ?", requiresParam: false },
		{
			type: 'increasing_at_zero',
			labelFr: 'Est-elle croissante en 0 ?',
			requiresParam: false
		},
		{
			type: 'decreasing_at_zero',
			labelFr: 'Est-elle décroissante en 0 ?',
			requiresParam: false
		},
		{ type: 'has_maximum', labelFr: 'A-t-elle un maximum ?', requiresParam: false },
		{ type: 'has_minimum', labelFr: 'A-t-elle un minimum ?', requiresParam: false },
		{ type: 'has_root', labelFr: 'A-t-elle une racine ?', requiresParam: false },
		{
			type: 'root_count',
			labelFr: 'A-t-elle... racines ?',
			requiresParam: true,
			paramOptions: [0, 1, 2, 3]
		},
		{
			type: 'root_count_greater_than',
			labelFr: 'A-t-elle plus de... racines ?',
			requiresParam: true,
			paramOptions: [0, 1, 2]
		},
		{
			type: 'has_horizontal_asymptote',
			labelFr: 'A-t-elle une asymptote horizontale ?',
			requiresParam: false
		},
		{
			type: 'has_vertical_asymptote',
			labelFr: 'A-t-elle une asymptote verticale ?',
			requiresParam: false
		},
		{ type: 'is_even', labelFr: 'Est-elle paire ?', requiresParam: false },
		{ type: 'is_odd', labelFr: 'Est-elle impaire ?', requiresParam: false },
		{
			type: 'y_intercept_positive',
			labelFr: "L'ordonnée à l'origine est-elle positive ?",
			requiresParam: false
		},
		{
			type: 'y_intercept_negative',
			labelFr: "L'ordonnée à l'origine est-elle négative ?",
			requiresParam: false
		},
		{
			type: 'y_intercept_zero',
			labelFr: "L'ordonnée à l'origine est-elle nulle ?",
			requiresParam: false
		},
		{
			type: 'is_always_positive',
			labelFr: 'Est-elle toujours positive ?',
			requiresParam: false
		},
		{
			type: 'is_always_negative',
			labelFr: 'Est-elle toujours négative ?',
			requiresParam: false
		}
	],
	// Polyhedron questions
	polyhedron: [
		{
			type: 'face_count_equals',
			labelFr: 'A-t-il... faces ?',
			requiresParam: true,
			paramOptions: [4, 5, 6, 8, 10, 12, 20]
		},
		{
			type: 'face_count_greater_than',
			labelFr: 'A-t-il plus de... faces ?',
			requiresParam: true,
			paramOptions: [4, 5, 6, 8, 10]
		},
		{
			type: 'face_count_less_than',
			labelFr: 'A-t-il moins de... faces ?',
			requiresParam: true,
			paramOptions: [6, 8, 10, 12]
		},
		{
			type: 'vertex_count_equals',
			labelFr: 'A-t-il... sommets ?',
			requiresParam: true,
			paramOptions: [4, 5, 6, 8, 10, 12, 20]
		},
		{
			type: 'vertex_count_greater_than',
			labelFr: 'A-t-il plus de... sommets ?',
			requiresParam: true,
			paramOptions: [4, 5, 6, 8, 10]
		},
		{
			type: 'edge_count_equals',
			labelFr: 'A-t-il... arêtes ?',
			requiresParam: true,
			paramOptions: [6, 8, 10, 12, 15, 18, 30]
		},
		{
			type: 'edge_count_greater_than',
			labelFr: 'A-t-il plus de... arêtes ?',
			requiresParam: true,
			paramOptions: [6, 8, 10, 12, 15]
		},
		{ type: 'is_regular', labelFr: 'Est-il régulier ?', requiresParam: false },
		{ type: 'is_prism', labelFr: 'Est-ce un prisme ?', requiresParam: false },
		{ type: 'is_pyramid', labelFr: 'Est-ce une pyramide ?', requiresParam: false },
		{ type: 'is_antiprism', labelFr: 'Est-ce un antiprisme ?', requiresParam: false },
		{ type: 'has_square_faces', labelFr: 'A-t-il des faces carrées ?', requiresParam: false },
		{
			type: 'has_triangular_faces',
			labelFr: 'A-t-il des faces triangulaires ?',
			requiresParam: false
		},
		{
			type: 'has_pentagonal_faces',
			labelFr: 'A-t-il des faces pentagonales ?',
			requiresParam: false
		},
		{
			type: 'has_hexagonal_faces',
			labelFr: 'A-t-il des faces hexagonales ?',
			requiresParam: false
		},
		{
			type: 'has_rectangular_faces',
			labelFr: 'A-t-il des faces rectangulaires ?',
			requiresParam: false
		},
		{
			type: 'has_uniform_faces',
			labelFr: 'Toutes ses faces sont-elles identiques ?',
			requiresParam: false
		},
		{ type: 'is_convex', labelFr: 'Est-il convexe ?', requiresParam: false },
		{ type: 'is_platonic_solid', labelFr: 'Est-ce un solide de Platon ?', requiresParam: false },
		{
			type: 'face_type_count',
			labelFr: 'A-t-il... types de faces ?',
			requiresParam: true,
			paramOptions: [1, 2, 3]
		}
	]
};

/**
 * Get question info for a specific item type
 */
export function getQuestionInfoForType(itemType: GridItemType): QuestionInfo[] {
	return QUESTION_INFO[itemType] ?? [];
}
