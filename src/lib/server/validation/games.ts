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
 * Valid game modes for 2048
 */
export const gameModeSchema = z.enum(['classic', 'multiplication', 'equations', 'fractions'], {
	message:
		"Invalid game mode. Must be one of: 'classic', 'multiplication', 'equations', 'fractions'"
});

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
		reached_4096: z.boolean(),
		mode: gameModeSchema.default('classic')
	})
	.refine(
		(data) => {
			// Business logic validation: must reach 2048 before 4096 (only in classic mode)
			if (data.mode === 'classic' && data.reached_4096 && !data.reached_2048) {
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
 * GET /api/games/2048/leaderboard?limit=10&mode=classic
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
		.pipe(z.number().int().min(1).max(100)),
	mode: z
		.string()
		.optional()
		.default('classic')
		.transform((val) => val as 'classic' | 'multiplication' | 'equations' | 'fractions')
		.pipe(gameModeSchema)
});

// ============================================================================
// RESPONSE SCHEMAS (for output validation)
// ============================================================================

/**
 * Response schema for POST /api/games/2048/scores
 */
export const submit2048ScoreResponseSchema = z.object({
	success: z.literal(true),
	best_score: z.number().int().nonnegative(),
	is_new_best: z.boolean(),
	games_played: z.number().int().positive()
});

/**
 * Response schema for GET /api/games/2048/scores
 */
export const get2048ScoreResponseSchema = z.object({
	best_score: z.number().int().nonnegative(),
	games_played: z.number().int().nonnegative(),
	tiles_2048_reached: z.number().int().nonnegative(),
	tiles_4096_reached: z.number().int().nonnegative(),
	mode: gameModeSchema
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
