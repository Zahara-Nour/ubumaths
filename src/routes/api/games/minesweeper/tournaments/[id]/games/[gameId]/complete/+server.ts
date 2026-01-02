import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { completeTournamentGameSchema } from '$lib/server/validation/minesweeper-tournament';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * UUID schema for path parameters
 */
const uuidSchema = z.string().uuid();

/**
 * Complete a tournament game
 * POST /api/games/minesweeper/tournaments/[id]/games/[gameId]/complete
 *
 * Records the completion of a tournament game.
 * Uses the `complete_tournament_game()` RPC function which:
 * - Validates game ownership
 * - Validates game is in progress
 * - For wins: validates grid state with existing validate_minesweeper_win()
 * - Updates game record with status and time
 *
 * **Security**:
 * - Requires student authentication
 * - Only the game owner can complete their game
 * - Server-side win validation
 *
 * **Request Body**:
 * ```json
 * {
 *   "status": "won" | "lost",
 *   "time_seconds": 145,
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
 *   "status": "won"
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Only students can complete tournament games
	await requireRole(locals, 'student');

	// Validate path parameters
	const tournamentIdValidation = uuidSchema.safeParse(params.id);
	if (!tournamentIdValidation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const gameIdValidation = uuidSchema.safeParse(params.gameId);
	if (!gameIdValidation.success) {
		throw error(400, 'ID de partie invalide');
	}

	const gameId = gameIdValidation.data;

	// Validate request body
	const body = await request.json();
	const validation = completeTournamentGameSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { status, time_seconds, grid_state } = validation.data;

	try {
		// Call the complete_tournament_game RPC function
		const { data, error: rpcError } = await locals.supabase
			.rpc('complete_tournament_game', {
				p_game_id: gameId,
				p_status: status,
				p_time_seconds: time_seconds,
				p_grid_state: grid_state
			})
			.single();

		if (rpcError) {
			// Handle specific RPC errors with French messages
			if (rpcError.message?.includes('not found') || rpcError.message?.includes('introuvable')) {
				throw error(404, 'Partie introuvable');
			}
			if (rpcError.message?.includes('does not belong')) {
				throw error(403, 'Cette partie ne vous appartient pas');
			}
			if (rpcError.message?.includes('not in progress')) {
				throw error(400, "Cette partie n'est pas en cours");
			}
			if (rpcError.message?.includes('Invalid time')) {
				throw error(400, 'Temps de completion invalide');
			}
			if (rpcError.message?.includes('Grid state too large')) {
				throw error(400, 'Grille trop volumineuse');
			}
			if (
				rpcError.message?.includes('Invalid grid state') ||
				rpcError.message?.includes('valid win')
			) {
				throw error(400, 'Etat de grille invalide - ne represente pas une victoire valide');
			}

			sanitizeRPCError(rpcError, 'complete_tournament_game');
		}

		if (!data) {
			throw error(500, 'Erreur lors de la completion de la partie');
		}

		// Type the response
		const result = data as { success: boolean; final_status: string };

		return json({
			success: result.success,
			status: result.final_status
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_COMPLETE_GAME');
	}
};
