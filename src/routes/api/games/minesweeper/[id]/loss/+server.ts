import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { completeGameSchema, validateGridState } from '$lib/server/validation/minesweeper';

/**
 * Record Minesweeper game loss
 * POST /api/games/minesweeper/[id]/loss
 *
 * Marks the game as lost using SECURITY DEFINER RPC function.
 * No Gidouilles are awarded for losses.
 *
 * The RPC function handles:
 * - Verifying game ownership
 * - Saving final grid_state
 * - Updating game status to 'lost'
 * - Preventing duplicate completions
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates grid_state with difficulty-specific Zod schema
 * - RPC function verifies ownership and game state
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
 *     "adjacentCounts": { "0,0": 1 }
 *   }
 * }
 * ```
 *
 * **Response**:
 * ```json
 * { "success": true }
 * ```
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// ✅ SECURITY: Require student authentication
	const { user } = await requireRole(locals, 'student');

	// ✅ SECURITY: Validate input structure with Zod
	const body = await request.json();
	const validation = completeGameSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { grid_state } = validation.data;

	try {
		// ✅ SECURITY: Fetch game to get difficulty for validation
		const { data: game, error: fetchError } = await locals.supabase
			.from('minesweeper_games')
			.select('id, difficulty, status')
			.eq('id', params.id)
			.eq('student_id', user.id)
			.single();

		if (fetchError || !game) {
			throw error(404, 'Partie non trouvée');
		}

		if (game.status !== 'in_progress') {
			throw error(400, 'Cette partie est déjà terminée');
		}

		// ✅ SECURITY: Validate grid_state with difficulty-specific schema
		const gridValidation = validateGridState(game.difficulty, grid_state);

		if (!gridValidation.success) {
			throw error(400, gridValidation.error.issues[0].message);
		}

		// ✅ SECURITY: Call SECURITY DEFINER RPC function
		// The function verifies ownership and updates game status atomically
		const { error: rpcError } = await locals.supabase.rpc('record_minesweeper_loss', {
			p_game_id: params.id,
			p_grid_state: gridValidation.data
		});

		if (rpcError) {
			console.error('RPC error recording loss:', rpcError);

			// Handle specific RPC errors
			if (rpcError.message?.includes('not found')) {
				throw error(404, 'Partie non trouvée');
			}
			if (rpcError.message?.includes('not owned')) {
				throw error(403, 'Cette partie ne vous appartient pas');
			}
			if (rpcError.message?.includes('already completed')) {
				throw error(400, 'Cette partie est déjà terminée');
			}
			if (rpcError.message?.includes('not in progress')) {
				throw error(400, 'Cette partie n\'est pas en cours');
			}

			throw error(500, 'Erreur lors de l\'enregistrement de la défaite');
		}

		return json({ success: true });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in loss game endpoint:', err);
		throw error(500, 'Erreur serveur lors de l\'enregistrement de la défaite');
	}
};
