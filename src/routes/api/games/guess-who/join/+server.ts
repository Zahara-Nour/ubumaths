/**
 * API Endpoint: Join a Guess Who Math Game via share token
 * Path: POST /api/games/guess-who/join
 *
 * Joins an existing game by:
 * - Validating the share token
 * - Finding a waiting game with matching token
 * - Assigning player2 and their secret number
 * - Starting the game (status: in_progress)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { joinGameSchema } from '$lib/server/validation/guess-who';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * POST /api/games/guess-who/join
 *
 * Joins a game via share token.
 *
 * **Security**:
 * - Requires authentication
 * - Token must be exactly 16 alphanumeric characters
 * - Game must be in 'waiting' status
 * - Player cannot join their own game
 *
 * **Request Body**:
 * ```json
 * { "token": "ABCdef123456789X" }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "game": {
 *     "id": "uuid",
 *     "status": "in_progress",
 *     "gridNumbers": [...],
 *     "currentTurnPlayerId": "player1-uuid"
 *   },
 *   "mySecretNumber": 37
 * }
 * ```
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	const { user } = await requireAuth(locals);

	// Validate request body
	const body = await request.json();
	const validation = joinGameSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { token } = validation.data;

	try {
		// Find waiting game with matching token
		const { data: game, error: findError } = await locals.supabase
			.from('guess_who_games')
			.select('*')
			.eq('share_token', token)
			.eq('status', 'waiting')
			.is('player2_id', null)
			.single();

		if (findError || !game) {
			throw error(404, 'Partie introuvable ou deja commencee');
		}

		// Check user is not joining their own game
		if (game.player1_id === user.id) {
			throw error(400, 'Vous ne pouvez pas rejoindre votre propre partie');
		}

		// Update game: assign player2, start game
		const { data: updatedGame, error: updateError } = await locals.supabase
			.from('guess_who_games')
			.update({
				player2_id: user.id,
				status: 'in_progress',
				current_turn_player_id: game.player1_id, // Player1 goes first
				turn_started_at: new Date().toISOString()
			})
			.eq('id', game.id)
			.eq('status', 'waiting') // Double-check to prevent race condition
			.select('*')
			.single();

		if (updateError) {
			sanitizePostgresError(updateError, 'GUESS_WHO_JOIN');
		}

		if (!updatedGame) {
			throw error(409, 'La partie a deja ete rejointe par un autre joueur');
		}

		return json({
			game: {
				id: updatedGame.id,
				player1Id: updatedGame.player1_id,
				player2Id: updatedGame.player2_id,
				status: updatedGame.status,
				gridNumbers: updatedGame.grid_numbers,
				currentTurnPlayerId: updatedGame.current_turn_player_id,
				bonusTurnsRemaining: updatedGame.bonus_turns_remaining,
				shareToken: updatedGame.share_token,
				turnStartedAt: updatedGame.turn_started_at,
				createdAt: updatedGame.created_at
			},
			mySecretNumber: updatedGame.player2_secret
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_JOIN');
	}
};
