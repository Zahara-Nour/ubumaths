import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { startGameSchema } from '$lib/server/validation/minesweeper';

/**
 * Difficulty configurations for Minesweeper game
 * Defines grid size and mine count for each difficulty level
 */
const DIFFICULTY_CONFIGS = {
	beginner: { rows: 9, cols: 9, mines: 10 },
	intermediate: { rows: 16, cols: 16, mines: 40 },
	expert: { rows: 16, cols: 30, mines: 99 }
} as const;

/**
 * Start a new Minesweeper game
 * POST /api/games/minesweeper/start
 *
 * Creates a new game record in the database for the authenticated student.
 * Grid state is initialized as empty and will be populated on first move.
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates difficulty with Zod
 *
 * **Request Body**:
 * ```json
 * { "difficulty": "beginner" | "intermediate" | "expert" }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "game": {
 *     "id": "uuid",
 *     "difficulty": "beginner",
 *     "mines_count": 10,
 *     "status": "in_progress",
 *     "created_at": "timestamp"
 *   }
 * }
 * ```
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ SECURITY: Require student authentication
	const { user } = await requireRole(locals, 'student');

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = startGameSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { difficulty } = validation.data;
	const config = DIFFICULTY_CONFIGS[difficulty];

	try {
		// Create new game record
		const { data: game, error: createError } = await locals.supabase
			.from('minesweeper_games')
			.insert({
				student_id: user.id,
				difficulty,
				status: 'in_progress',
				mines_count: config.mines,
				grid_state: {
					rows: config.rows,
					cols: config.cols,
					mines: [],
					revealed: [],
					flagged: [],
					adjacentCounts: {}
				},
				flags_used: 0,
				cells_revealed: 0
			})
			.select()
			.single();

		if (createError || !game) {
			console.error('Error creating game:', createError);
			throw error(500, 'Erreur lors de la création de la partie');
		}

		return json({
			success: true,
			game: {
				id: game.id,
				difficulty: game.difficulty,
				mines_count: game.mines_count,
				status: game.status,
				created_at: game.created_at
			}
		});
	} catch (err) {
		console.error('Error in start game endpoint:', err);
		throw error(500, 'Erreur serveur lors de la création de la partie');
	}
};
