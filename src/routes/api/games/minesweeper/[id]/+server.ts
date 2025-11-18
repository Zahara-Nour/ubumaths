import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { saveGameSchema, validateGridState } from '$lib/server/validation/minesweeper';

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
		// ✅ SECURITY: Fetch game to get difficulty for validation
		const { data: existingGame, error: fetchError } = await locals.supabase
			.from('minesweeper_games')
			.select('id, difficulty, status')
			.eq('id', params.id)
			.eq('student_id', user.id)
			.single();

		if (fetchError || !existingGame) {
			throw error(404, 'Partie non trouvée');
		}

		if (existingGame.status !== 'in_progress') {
			throw error(400, 'Cette partie est déjà terminée');
		}

		// ✅ SECURITY: Validate grid_state with difficulty-specific schema
		const gridValidation = validateGridState(existingGame.difficulty, grid_state);

		if (!gridValidation.success) {
			throw error(400, gridValidation.error.issues[0].message);
		}

		// ✅ SECURITY: RLS policies enforce ownership (student_id = auth.uid())
		// Only the game owner can update their game
		const { data: game, error: updateError } = await locals.supabase
			.from('minesweeper_games')
			.update({
				grid_state: gridValidation.data,
				flags_used,
				cells_revealed
			})
			.eq('id', params.id)
			.eq('student_id', user.id) // Explicit ownership check
			.eq('status', 'in_progress') // Only update in-progress games
			.select()
			.single();

		if (updateError) {
			// Check if game doesn't exist or is not owned by user
			if (updateError.code === 'PGRST116') {
				throw error(404, 'Partie non trouvée ou déjà terminée');
			}
			console.error('Error updating game:', updateError);
			throw error(500, 'Erreur lors de la sauvegarde de la partie');
		}

		if (!game) {
			throw error(404, 'Partie non trouvée ou déjà terminée');
		}

		return json({ success: true });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in save game endpoint:', err);
		throw error(500, 'Erreur serveur lors de la sauvegarde de la partie');
	}
};
