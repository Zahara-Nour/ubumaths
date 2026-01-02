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
 * Abandon a tournament game
 * POST /api/games/minesweeper/tournaments/[id]/games/[gameId]/abandon
 *
 * Marks a tournament game as abandoned.
 * Uses the `abandon_tournament_game()` RPC function which:
 * - Validates game ownership
 * - Validates game is in progress
 * - Updates game status to 'abandoned'
 *
 * **Security**:
 * - Requires student authentication
 * - Only the game owner can abandon their game
 *
 * **Response**:
 * ```json
 * {
 *   "success": true
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	// Only students can abandon tournament games
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

	try {
		// Call the abandon_tournament_game RPC function
		const { data, error: rpcError } = await locals.supabase
			.rpc('abandon_tournament_game', {
				p_game_id: gameId
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

			sanitizeRPCError(rpcError, 'abandon_tournament_game');
		}

		if (!data) {
			throw error(500, "Erreur lors de l'abandon de la partie");
		}

		// Type the response
		const result = data as { success: boolean };

		return json({
			success: result.success
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_ABANDON_GAME');
	}
};
