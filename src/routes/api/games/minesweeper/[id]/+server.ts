import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { saveGameSchema, validateGridState } from '$lib/server/validation/minesweeper';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * Save Minesweeper game progress
 * PUT /api/games/minesweeper/[id]
 *
 * Updates the game state during gameplay (auto-save).
 * Only the game owner (student) can update their game.
 * RLS policies enforce ownership at the database level.
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates grid_state with difficulty-specific Zod schema
 * - RLS policies prevent updating other students' games
 *
 * **Request Body**:
 * ```json
 * {
 *   "grid_state": {
 *     "rows": 9,
 *     "cols": 9,
 *     "mines": [[1,2], [3,4]],
 *     "revealed": [[0,0], [0,1]],
 *     "flagged": [[1,2]],
 *     "adjacentCounts": { "0,0": 1, "0,1": 2 }
 *   },
 *   "flags_used": 1,
 *   "cells_revealed": 5
 * }
 * ```
 *
 * **Response**:
 * ```json
 * { "success": true }
 * ```
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const id = validateUuidParam(params.id);
	// ✅ SECURITY: Require student authentication
	const { user } = await requireRole(locals, 'student');

	// ✅ SECURITY: Validate input structure with Zod
	const body = await request.json();
	const validation = saveGameSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { grid_state, flags_used, cells_revealed } = validation.data;

	try {
		// ✅ CRITICAL FIX (C-4): Fetch difficulty BEFORE updating to validate grid_state
		// This prevents saving invalid data to the database
		// Trade-off: Adds ~10-20ms latency but ensures data integrity
		const { data: existingGame, error: fetchError } = await locals.supabase
			.from('minesweeper_games')
			.select('id, difficulty, status')
			.eq('id', id)
			.eq('student_id', user.id) // Explicit ownership check
			.eq('status', 'in_progress') // Only fetch in-progress games
			.single();

		if (fetchError || !existingGame) {
			throw error(404, 'Partie non trouvée ou déjà terminée');
		}

		// ✅ SECURITY: Pre-update validation (difficulty-specific bounds checking)
		// This prevents invalid data from ever reaching the database
		const gridValidation = validateGridState(existingGame.difficulty, grid_state);

		if (!gridValidation.success) {
			throw error(
				400,
				`État de grille invalide pour ${existingGame.difficulty}: ${gridValidation.error.issues[0].message}`
			);
		}

		// ✅ DATA INTEGRITY: Now safe to update with validated data
		const { error: updateError } = await locals.supabase
			.from('minesweeper_games')
			.update({
				grid_state: gridValidation.data, // Use validated data
				flags_used,
				cells_revealed
			})
			.eq('id', id)
			.eq('student_id', user.id)
			.eq('status', 'in_progress');

		if (updateError) {
			sanitizePostgresError(updateError, 'MINESWEEPER_SAVE');
		}

		return json({ success: true });
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_SAVE');
	}
};
