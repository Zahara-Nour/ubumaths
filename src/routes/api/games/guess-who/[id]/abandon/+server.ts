/**
 * API Endpoint: Abandon a Guess Who Game
 * Path: POST /api/games/guess-who/[id]/abandon
 *
 * Allows a participant to abandon the game.
 * The opponent automatically wins.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * POST /api/games/guess-who/[id]/abandon
 *
 * Abandon the current game.
 *
 * **Security**:
 * - Requires authentication
 * - User must be a participant
 * - Game must be in progress or waiting
 *
 * **Game Logic**:
 * - Status set to 'abandoned'
 * - Opponent wins (if game was in progress)
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "winnerId": "opponent-uuid" | null
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const gameId = validateUuidParam(params.id);

	// Require authentication
	const { user } = await requireAuth(locals);

	try {
		// Fetch game to validate state
		const { data: game, error: gameError } = await locals.supabase
			.from('guess_who_games')
			.select('*')
			.eq('id', gameId)
			.single();

		if (gameError || !game) {
			throw error(404, 'Partie introuvable');
		}

		// Verify user is a participant
		const isPlayer1 = game.player1_id === user.id;
		const isPlayer2 = game.player2_id === user.id;

		if (!isPlayer1 && !isPlayer2) {
			throw error(403, "Vous n'etes pas participant de cette partie");
		}

		// Verify game is not already completed or abandoned
		if (game.status === 'completed' || game.status === 'abandoned') {
			throw error(400, 'La partie est deja terminee');
		}

		// Determine winner (opponent wins, unless game hasn't started yet)
		let winnerId = null;
		if (game.status === 'in_progress') {
			winnerId = isPlayer1 ? game.player2_id : game.player1_id;
		}

		// Update game status
		const { error: updateError } = await locals.supabase
			.from('guess_who_games')
			.update({
				status: 'abandoned',
				winner_id: winnerId,
				current_turn_player_id: null
			})
			.eq('id', gameId);

		if (updateError) {
			sanitizePostgresError(updateError, 'GUESS_WHO_ABANDON_UPDATE');
		}

		return json({
			success: true,
			winnerId
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_ABANDON');
	}
};
