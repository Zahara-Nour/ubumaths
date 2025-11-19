import { z } from 'zod';

/**
 * Validation schemas for Minesweeper daily challenge API endpoints
 * All endpoints require strict validation to prevent manipulation
 */

// Difficulty configs (match TypeScript constants)
const DIFFICULTY_CONFIGS = {
	beginner: { rows: 9, cols: 9, mines: 10, maxCells: 81 },
	intermediate: { rows: 16, cols: 16, mines: 40, maxCells: 256 },
	expert: { rows: 16, cols: 30, mines: 99, maxCells: 480 }
} as const;

/**
 * Grid state schema for daily challenge completion
 * Same validation as regular minesweeper but without difficulty-specific bounds
 * (difficulty comes from the challenge itself)
 */
export const dailyChallengeGridStateSchema = z.object({
	rows: z.number().int().positive().max(100), // Reasonable upper bound
	cols: z.number().int().positive().max(100),
	mines: z.array(z.tuple([z.number(), z.number()])).max(999), // Max possible mines
	revealed: z.array(z.tuple([z.number(), z.number()])).max(10000), // DoS protection
	flagged: z.array(z.tuple([z.number(), z.number()])).max(999),
	adjacentCounts: z.record(
		z.string().regex(/^\d+,\d+$/), // Validate key format
		z.number().int().min(0).max(8)
	)
});

/**
 * POST /api/games/minesweeper/daily-challenge/complete
 * Submit daily challenge completion
 */
export const completeDailyChallengeSchema = z.object({
	challenge_id: z.string().uuid(),
	time_seconds: z.number().int().min(1).max(14400).finite(), // 1 second to 4 hours
	status: z.enum(['won', 'lost']),
	grid_state: dailyChallengeGridStateSchema
});

/**
 * GET /api/games/minesweeper/daily-challenge/leaderboard
 * Query parameters for leaderboard endpoint
 */
export const leaderboardQuerySchema = z.object({
	challenge_id: z.string().uuid().optional(),
	limit: z
		.string()
		.optional()
		.transform((val) => (val ? parseInt(val, 10) : 100))
		.pipe(z.number().int().min(1).max(1000)) // Default 100, max 1000
});

/**
 * Validate grid state against difficulty-specific constraints
 * Used for server-side validation after fetching challenge difficulty
 */
export const validateDailyChallengeGridState = (difficulty: string, gridState: unknown) => {
	const config = DIFFICULTY_CONFIGS[difficulty as keyof typeof DIFFICULTY_CONFIGS];

	if (!config) {
		return {
			success: false,
			error: { issues: [{ message: 'Invalid difficulty' }] }
		} as const;
	}

	// Coordinate validator: [row, col] within grid bounds
	const coordinateSchema = z.tuple([
		z
			.number()
			.int()
			.min(0)
			.max(config.rows - 1),
		z
			.number()
			.int()
			.min(0)
			.max(config.cols - 1)
	]);

	const schema = z.object({
		rows: z.literal(config.rows),
		cols: z.literal(config.cols),
		mines: z.array(coordinateSchema).length(config.mines), // Exact mine count required
		revealed: z.array(coordinateSchema).max(config.maxCells), // DoS protection
		flagged: z.array(coordinateSchema).max(config.mines * 2), // Reasonable upper bound
		adjacentCounts: z.record(
			z.string().regex(/^\d+,\d+$/), // Validate key format
			z.number().int().min(0).max(8)
		)
	});

	return schema.safeParse(gridState);
};
