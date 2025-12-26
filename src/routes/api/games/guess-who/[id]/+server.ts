/**
 * API Endpoint: Get Guess Who Game State
 * Path: GET /api/games/guess-who/[id]
 *
 * Returns the current game state including:
 * - Game data (grid, status, turn info)
 * - Player's secret number (never opponent's)
 * - Move history
 * - Player's eliminated numbers
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * GET /api/games/guess-who/[id]
 *
 * Retrieves the current state of a game.
 *
 * **Security**:
 * - Requires authentication
 * - User must be a participant (player1 or player2)
 * - Secret numbers are filtered to only show the player's own
 *
 * **Response**:
 * ```json
 * {
 *   "game": { ... },
 *   "mySecretNumber": 42,
 *   "moves": [...],
 *   "eliminatedNumbers": [...]
 * }
 * ```
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const gameId = validateUuidParam(params.id);

	// Require authentication
	const { user } = await requireAuth(locals);

	try {
		// Fetch game data
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

		// Get player's secret number (never reveal opponent's)
		const mySecretNumber = isPlayer1 ? game.player1_secret : game.player2_secret;

		// Fetch move history
		const { data: moves, error: movesError } = await locals.supabase
			.from('guess_who_moves')
			.select('*')
			.eq('game_id', gameId)
			.order('move_number', { ascending: true });

		if (movesError) {
			sanitizePostgresError(movesError, 'GUESS_WHO_GET_MOVES');
		}

		// Fetch player's eliminated numbers
		const { data: eliminated, error: eliminatedError } = await locals.supabase
			.from('guess_who_eliminated')
			.select('eliminated_numbers')
			.eq('game_id', gameId)
			.eq('player_id', user.id)
			.maybeSingle();

		if (eliminatedError) {
			sanitizePostgresError(eliminatedError, 'GUESS_WHO_GET_ELIMINATED');
		}

		return json({
			game: {
				id: game.id,
				player1Id: game.player1_id,
				player2Id: game.player2_id,
				status: game.status,
				gridNumbers: game.grid_numbers,
				currentTurnPlayerId: game.current_turn_player_id,
				bonusTurnsRemaining: game.bonus_turns_remaining,
				winnerId: game.winner_id,
				shareToken: game.share_token,
				turnStartedAt: game.turn_started_at,
				createdAt: game.created_at,
				updatedAt: game.updated_at
			},
			mySecretNumber,
			moves:
				moves?.map((m) => ({
					id: m.id,
					gameId: m.game_id,
					playerId: m.player_id,
					moveNumber: m.move_number,
					moveType: m.move_type,
					questionType: m.question_type,
					questionParam: m.question_param,
					answer: m.answer,
					isCorrect: m.is_correct,
					correctAnswer: m.correct_answer,
					guessedNumber: m.guessed_number,
					createdAt: m.created_at
				})) ?? [],
			eliminatedNumbers: eliminated?.eliminated_numbers ?? []
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_GET');
	}
};
