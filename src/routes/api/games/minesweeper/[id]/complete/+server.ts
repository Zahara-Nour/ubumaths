import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { completeGameSchema, validateGridState } from '$lib/server/validation/minesweeper';

/**
 * Type for the complete_minesweeper_game RPC response
 */
interface CompleteMinesweeperGameResponse {
	success: boolean;
	gidouilles_awarded: number;
	time_seconds: number;
	achievements: Array<{
		achievement_id: string;
		name: string;
		icon: string;
		difficulty: string | null;
	}>;
}

/**
 * Complete Minesweeper game (WIN)
 * POST /api/games/minesweeper/[id]/complete
 *
 * Marks the game as won and awards Gidouilles using SECURITY DEFINER RPC function.
 * The RPC function handles:
 * - Verifying game ownership
 * - Calculating time taken
 * - Awarding Gidouilles based on difficulty
 * - Preventing duplicate rewards
 * - Atomic transaction (game update + reward insert)
 * - Checking and unlocking achievements automatically
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates grid_state with difficulty-specific Zod schema
 * - RPC function is SECURITY DEFINER (bypasses RLS for reward insertion)
 * - RPC verifies ownership and game state
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
 * {
 *   "success": true,
 *   "gidouilles": 10,
 *   "time": 145,
 *   "achievements": [
 *     {
 *       "achievement_id": "first_victory",
 *       "name": "Premier pas",
 *       "icon": "🎯",
 *       "difficulty": null
 *     }
 *   ]
 * }
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
		// The function verifies ownership, calculates rewards, and updates atomically
		const { data, error: rpcError } = await locals.supabase
			.rpc('complete_minesweeper_game', {
				p_game_id: params.id,
				p_grid_state: gridValidation.data
			})
			.single();

		if (rpcError) {
			console.error('RPC error completing game:', rpcError);

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
				throw error(400, "Cette partie n'est pas en cours");
			}

			throw error(500, 'Erreur lors de la finalisation de la partie');
		}

		if (!data) {
			throw error(500, 'Aucune donnée retournée par la fonction de complétion');
		}

		// Type assertion for RPC response
		const response = data as CompleteMinesweeperGameResponse;

		// ✅ Return success with gidouilles, time, and newly unlocked achievements
		return json({
			success: true,
			gidouilles: response.gidouilles_awarded,
			time: response.time_seconds,
			achievements: response.achievements || []
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in complete game endpoint:', err);
		throw error(500, 'Erreur serveur lors de la finalisation de la partie');
	}
};
