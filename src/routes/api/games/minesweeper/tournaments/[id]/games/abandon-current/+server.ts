import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * UUID schema for path parameters
 */
const uuidSchema = z.string().uuid();

/**
 * Abandon the current in-progress tournament game
 * POST /api/games/minesweeper/tournaments/[id]/games/abandon-current
 *
 * Finds and abandons any in-progress game for the current user in this tournament.
 * Useful when the client doesn't know the game ID.
 *
 * **Security**:
 * - Requires student authentication
 * - Only abandons the current user's game
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "game_id": "uuid" // The abandoned game ID
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	// Only students can abandon tournament games
	const { user } = await requireRole(locals, 'student');

	// Validate tournament ID
	const tournamentIdValidation = uuidSchema.safeParse(params.id);
	if (!tournamentIdValidation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const tournamentId = tournamentIdValidation.data;

	try {
		// Find the in-progress game for this user in this tournament
		const { data: game, error: queryError } = await locals.supabase
			.from('minesweeper_tournament_games')
			.select('id')
			.eq('tournament_id', tournamentId)
			.eq('student_id', user.id)
			.eq('status', 'in_progress')
			.maybeSingle();

		if (queryError) {
			sanitizePostgresError(queryError, 'MINESWEEPER_TOURNAMENT_FIND_CURRENT');
		}

		if (!game) {
			// No in-progress game found - that's okay, return success
			return json({
				success: true,
				game_id: null
			});
		}

		// Call the abandon_tournament_game RPC function
		const { data, error: rpcError } = await locals.supabase
			.rpc('abandon_tournament_game', {
				p_game_id: game.id
			})
			.single();

		if (rpcError) {
			// Handle specific RPC errors
			if (rpcError.message?.includes('not in progress')) {
				// Game already ended, that's fine
				return json({
					success: true,
					game_id: game.id
				});
			}

			sanitizeRPCError(rpcError, 'abandon_tournament_game');
		}

		if (!data) {
			throw error(500, "Erreur lors de l'abandon de la partie");
		}

		return json({
			success: true,
			game_id: game.id
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_ABANDON_CURRENT');
	}
};
