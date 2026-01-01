import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { completeGameSchema, validateGridState } from '$lib/server/validation/minesweeper';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';
import { validateUuidParam } from '$lib/server/validation/params';

import type { RewardBreakdown } from '$lib/types/minesweeper';

/**
 * Type for the complete_minesweeper_game RPC response
 *
 * Strategy D Update:
 * - gidouilles_awarded is now decimal (0.3-8.0 range)
 * - Formula: base × time_mult × (1 - hint_penalty) × daily_mult
 */
interface CompleteMinesweeperGameResponse {
	gidouilles_earned: number; // Decimal: 0.3-8.0 per game
	points_earned: number; // Integer points for leaderboard
	achievements: Array<{
		achievement_id: string;
		name: string;
		icon: string;
		difficulty: string | null;
	}>;
	breakdown: RewardBreakdown; // Detailed calculation factors
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
 * **Response** (Strategy D):
 * ```json
 * {
 *   "success": true,
 *   "gidouilles": 1.3,
 *   "points": 65,
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
 *
 * **Gidouilles Calculation** (Strategy D):
 * - Base: Beginner=1.0, Intermediate=3.0, Expert=6.0
 * - Time mult: 1.3 (fast) to 0.8 (at/beyond reference)
 * - Hint penalty: Progressive (10/22/35% gidouilles, 5/11/17% items)
 * - Daily mult: 100% first win, -15% each, min 30%
 * - Bounds: 0.3 min, 8.0 max per game
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const id = validateUuidParam(params.id);
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
			.eq('id', id)
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
				p_game_id: id,
				p_grid_state: gridValidation.data
			})
			.single();

		if (rpcError) {
			sanitizeRPCError(rpcError, 'complete_minesweeper_game');
		}

		if (!data) {
			throw error(500, 'Aucune donnée retournée par la fonction de complétion');
		}

		// Type assertion for RPC response
		// Strategy D: gidouilles_earned is now decimal (0.3-8.0 range)
		const response = data as CompleteMinesweeperGameResponse;

		// ✅ Return success with gidouilles (decimal), points, achievements, and breakdown
		return json({
			success: true,
			gidouilles: response.gidouilles_earned, // Decimal: e.g., 1.3, 5.2
			points: response.points_earned, // Integer for leaderboard
			achievements: response.achievements || [],
			breakdown: response.breakdown // Detailed calculation factors for VictoryModal
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_COMPLETE');
	}
};
