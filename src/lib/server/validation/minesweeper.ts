import { z } from 'zod';

/**
 * Validation schemas for Minesweeper game API endpoints
 * All endpoints require strict validation to prevent manipulation
 */

// Difficulty configs (match TypeScript constants)
const DIFFICULTY_CONFIGS = {
	beginner: { rows: 9, cols: 9, mines: 10, maxCells: 81 },
	intermediate: { rows: 16, cols: 16, mines: 40, maxCells: 256 },
	expert: { rows: 16, cols: 30, mines: 99, maxCells: 480 }
} as const;

/**
 * Create difficulty-specific grid state schema with bounds checking
 */
const createGridStateSchema = (difficulty: 'beginner' | 'intermediate' | 'expert') => {
	const config = DIFFICULTY_CONFIGS[difficulty];

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

	return z.object({
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
};

export const beginnerGridStateSchema = createGridStateSchema('beginner');
export const intermediateGridStateSchema = createGridStateSchema('intermediate');
export const expertGridStateSchema = createGridStateSchema('expert');

/**
 * Validate grid state based on difficulty
 */
export const validateGridState = (difficulty: string, gridState: unknown) => {
	switch (difficulty) {
		case 'beginner':
			return beginnerGridStateSchema.safeParse(gridState);
		case 'intermediate':
			return intermediateGridStateSchema.safeParse(gridState);
		case 'expert':
			return expertGridStateSchema.safeParse(gridState);
		default:
			return {
				success: false,
				error: { issues: [{ message: 'Invalid difficulty' }] }
			} as const;
	}
};

/**
 * POST /api/games/minesweeper/start
 * Start a new Minesweeper game
 */
export const startGameSchema = z.object({
	difficulty: z.enum(['beginner', 'intermediate', 'expert'])
});

/**
 * PUT /api/games/minesweeper/[id]
 * Save game progress (auto-save during gameplay)
 * Note: grid_state validation happens in endpoint after fetching difficulty
 */
export const saveGameSchema = z.object({
	grid_state: z.any(), // Will be validated in endpoint after fetching difficulty
	flags_used: z.number().int().min(0).max(200),
	cells_revealed: z.number().int().min(0).max(10000)
});

/**
 * POST /api/games/minesweeper/[id]/complete
 * POST /api/games/minesweeper/[id]/loss
 * Complete a game (win or loss) - calls SECURITY DEFINER RPC
 * Note: grid_state validation happens in endpoint after fetching difficulty
 */
export const completeGameSchema = z.object({
	grid_state: z.any() // Will be validated in endpoint after fetching difficulty
});
