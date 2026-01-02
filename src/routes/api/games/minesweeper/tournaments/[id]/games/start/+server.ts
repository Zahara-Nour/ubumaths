import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { startTournamentGameSchema } from '$lib/server/validation/minesweeper-tournament';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';
import type { TournamentGameStartResponse } from '$lib/types/minesweeper';

/**
 * Start a new game in a tournament
 * POST /api/games/minesweeper/tournaments/[id]/games/start
 *
 * Creates a new game record for the student in the tournament.
 * Uses the `start_tournament_game()` RPC function which:
 * - Validates tournament is active and in date range
 * - Checks student can participate (class membership or global)
 * - Ensures no existing in-progress game
 * - Generates deterministic seed for grid
 * - Creates game record
 *
 * **Security**:
 * - Requires student authentication
 * - Validates tournament participation eligibility
 * - One in-progress game at a time per tournament
 *
 * **Response**:
 * ```json
 * {
 *   "game_id": "uuid",
 *   "seed": "tournament-uuid-game-1",
 *   "game_number": 1
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	// Only students can start tournament games
	await requireRole(locals, 'student');

	// Validate tournament ID
	const validation = startTournamentGameSchema.safeParse({ tournament_id: params.id });

	if (!validation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const tournamentId = validation.data.tournament_id;

	try {
		// Call the start_tournament_game RPC function
		const { data, error: rpcError } = await locals.supabase
			.rpc('start_tournament_game', {
				p_tournament_id: tournamentId
			})
			.single();

		if (rpcError) {
			// Log the actual error for debugging
			console.error('[TOURNAMENT_START_GAME] RPC Error:', {
				code: rpcError.code,
				message: rpcError.message,
				details: rpcError.details,
				hint: rpcError.hint
			});

			// Handle specific RPC errors with French messages
			if (rpcError.message?.includes('not found') || rpcError.message?.includes('introuvable')) {
				throw error(404, 'Tournoi introuvable');
			}
			if (rpcError.message?.includes('not active')) {
				throw error(400, "Ce tournoi n'est pas actif");
			}
			if (rpcError.message?.includes('not started')) {
				throw error(400, "Ce tournoi n'a pas encore commence");
			}
			if (rpcError.message?.includes('ended') || rpcError.message?.includes('termine')) {
				throw error(400, 'Ce tournoi est termine');
			}
			if (rpcError.message?.includes('not eligible') || rpcError.message?.includes('participer')) {
				throw error(403, "Vous n'etes pas eligible a participer a ce tournoi");
			}
			if (rpcError.message?.includes('in progress') || rpcError.message?.includes('en cours')) {
				throw error(400, 'Vous avez deja une partie en cours dans ce tournoi');
			}

			sanitizeRPCError(rpcError, 'start_tournament_game');
		}

		if (!data) {
			throw error(500, 'Erreur lors du demarrage de la partie');
		}

		// Type the response
		const gameData = data as TournamentGameStartResponse;

		return json(
			{
				game_id: gameData.game_id,
				seed: gameData.seed,
				game_number: gameData.game_number
			},
			{ status: 201 }
		);
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_START_GAME');
	}
};
