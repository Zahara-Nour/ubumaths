/**
 * Games Validation Schemas
 * ========================
 * Zod validation schemas for game-related API endpoints
 */

import { z } from 'zod';

// ============================================================================
// 2048 GAME SCHEMAS
// ============================================================================

/**
 * Schema for submitting a 2048 game score
 * POST /api/games/2048/scores
 */
export const submit2048ScoreSchema = z
	.object({
		score: z
			.number()
			.int('Score must be an integer')
			.min(0, 'Score cannot be negative')
			.max(4_000_000, 'Score exceeds maximum possible value (theoretical max ~3.9M)')
			.finite('Score must be a finite number'),
		reached_2048: z.boolean(),
		reached_4096: z.boolean()
	})
	.refine(
		(data) => {
			// Business logic validation: must reach 2048 before 4096
			if (data.reached_4096 && !data.reached_2048) {
				return false;
			}
			return true;
		},
		{
			message: 'Invalid tile progression: cannot reach 4096 without reaching 2048 first'
		}
	);

/**
 * Schema for 2048 leaderboard query parameters
 * GET /api/games/2048/leaderboard?limit=10
 */
export const leaderboard2048QuerySchema = z.object({
	limit: z
		.string()
		.optional()
		.default('10')
		.transform((val) => {
			const parsed = parseInt(val, 10);
			// Validate after parsing
			if (isNaN(parsed) || parsed < 1 || parsed > 100) {
				return 10; // Default fallback
			}
			return parsed;
		})
		.pipe(z.number().int().min(1).max(100))
});

// ============================================================================
// RESPONSE SCHEMAS (for output validation)
// ============================================================================

/**
 * Response schema for POST /api/games/2048/scores (legacy, without rewards)
 */
export const submit2048ScoreResponseSchema = z.object({
	success: z.literal(true),
	best_score: z.number().int().nonnegative(),
	is_new_best: z.boolean(),
	games_played: z.number().int().positive()
});

/**
 * Schema for 2048 reward data returned in score submission response
 */
export const reward2048Schema = z.object({
	theoretical_reward: z.number().nonnegative(),
	actual_reward: z.number().nonnegative(),
	is_first_win_of_day: z.boolean(),
	week_best_reward: z.number().nonnegative()
});

/**
 * Schema for a milestone unlocked during a 2048 game
 */
export const milestone2048Schema = z.object({
	slug: z.string(),
	name: z.string(),
	gidouilles_reward: z.number().nonnegative()
});

/**
 * Response schema for POST /api/games/2048/scores (with rewards)
 */
export const submit2048ScoreWithRewardResponseSchema = z.object({
	success: z.literal(true),
	best_score: z.number().int().nonnegative(),
	is_new_best: z.boolean(),
	games_played: z.number().int().positive(),
	reward: reward2048Schema.nullable(),
	milestones: z.array(milestone2048Schema)
});

/**
 * Response schema for GET /api/games/2048/scores
 */
export const get2048ScoreResponseSchema = z.object({
	best_score: z.number().int().nonnegative(),
	games_played: z.number().int().nonnegative(),
	tiles_2048_reached: z.number().int().nonnegative(),
	tiles_4096_reached: z.number().int().nonnegative()
});

/**
 * Schema for a single leaderboard entry
 */
export const leaderboardEntrySchema = z.object({
	rank: z.number().int().positive(),
	user_id: z.string().uuid(),
	name: z.string(),
	avatar_url: z.string().url().nullable(),
	best_score: z.number().int().nonnegative(),
	games_played: z.number().int().nonnegative(),
	tiles_2048_reached: z.number().int().nonnegative(),
	tiles_4096_reached: z.number().int().nonnegative()
});

/**
 * Response schema for GET /api/games/2048/leaderboard
 */
export const leaderboard2048ResponseSchema = z.object({
	leaderboard: z.array(leaderboardEntrySchema),
	user_rank: z.number().int().positive().nullable()
});

// ============================================================================
// MATHEMO GAME SCHEMAS
// ============================================================================

/**
 * Schema for submitting a Mathemo game result
 * POST /api/games/mathemo/scores
 */
export const submitMathemoScoreSchema = z
	.object({
		word_length: z
			.number()
			.int()
			.min(2, 'Word length must be at least 2')
			.max(20, 'Word length cannot exceed 20'),
		attempts_used: z
			.number()
			.int()
			.min(1, 'Must use at least 1 attempt')
			.max(10, 'Cannot exceed 10 attempts'),
		max_attempts: z
			.number()
			.int()
			.min(3, 'Max attempts must be at least 3')
			.max(10, 'Max attempts cannot exceed 10'),
		won: z.boolean(),
		found_first_try: z.boolean(),
		score_multiplier: z.number().min(1).max(2).default(1)
	})
	.refine((data) => data.attempts_used <= data.max_attempts, {
		message: 'attempts_used cannot exceed max_attempts'
	})
	.refine((data) => !data.found_first_try || (data.won && data.attempts_used === 1), {
		message: 'found_first_try requires won=true and attempts_used=1'
	});

/**
 * Schema for Mathemo reward data
 */
export const rewardMathemoSchema = z.object({
	theoretical_reward: z.number().nonnegative(),
	actual_reward: z.number().nonnegative(),
	is_first_win_of_day: z.boolean(),
	week_best_reward: z.number().nonnegative()
});

/**
 * Schema for a milestone unlocked during a Mathemo game
 */
export const milestoneMathemoSchema = z.object({
	slug: z.string(),
	name: z.string(),
	gidouilles_reward: z.number().nonnegative()
});

/**
 * Response schema for POST /api/games/mathemo/scores
 */
export const submitMathemoScoreWithRewardResponseSchema = z.object({
	success: z.literal(true),
	games_played: z.number().int().positive(),
	games_won: z.number().int().nonnegative(),
	reward: rewardMathemoSchema.nullable(),
	milestones: z.array(milestoneMathemoSchema)
});

/**
 * Response schema for GET /api/games/mathemo/scores
 */
export const getMathemoScoreResponseSchema = z.object({
	games_played: z.number().int().nonnegative(),
	games_won: z.number().int().nonnegative(),
	best_word_length: z.number().int().nonnegative(),
	first_try_count: z.number().int().nonnegative()
});

// ============================================================================
// UNIFIED GAME LEADERBOARDS (3 scopes: class / grade / school)
// ============================================================================

/** Games exposed in the unified leaderboard (must match the RPC `p_game` whitelist). */
export const GAME_LEADERBOARD_GAMES = ['2048', 'mathemo', 'minesweeper'] as const;
/** Scopes exposed as tabs (must match the RPC `p_scope` whitelist). */
export const GAME_LEADERBOARD_SCOPES = ['class', 'grade', 'school'] as const;

export type GameLeaderboardGame = (typeof GAME_LEADERBOARD_GAMES)[number];
export type GameLeaderboardScope = (typeof GAME_LEADERBOARD_SCOPES)[number];

/**
 * Schema for the unified leaderboard page query params.
 * Load: /games/leaderboards?game=...&scope=...&limit=...
 *
 * Query params arrive as strings (or absent). Designed to NEVER throw on a page load:
 * - `game`/`scope` absent OR unknown → fall back (first game / `class` scope) via `.catch()`;
 * - `limit` is coerced, truncated and clamped to [1, 200] (absent/invalid → 50).
 * The RPC re-guards game/scope and re-clamps limit anyway (defense-in-depth).
 */
export const gameLeaderboardQuerySchema = z.object({
	game: z.enum(GAME_LEADERBOARD_GAMES).catch(GAME_LEADERBOARD_GAMES[0]),
	scope: z.enum(GAME_LEADERBOARD_SCOPES).catch('class'),
	limit: z.coerce
		.number()
		.catch(50)
		.transform((n) => {
			const t = Math.trunc(n);
			return Math.min(Math.max(Number.isFinite(t) ? t : 50, 1), 200);
		})
});
