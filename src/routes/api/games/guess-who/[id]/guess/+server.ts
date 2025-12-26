/**
 * API Endpoint: Make a Guess in Guess Who Game
 * Path: POST /api/games/guess-who/[id]/guess
 *
 * Allows the current player to guess the opponent's secret number.
 * A correct guess wins the game; an incorrect guess loses.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { guessSchema } from '$lib/server/validation/guess-who';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * POST /api/games/guess-who/[id]/guess
 *
 * Make a final guess of the opponent's secret number.
 *
 * **Security**:
 * - Requires authentication
 * - Must be player's turn
 * - Game must be in_progress
 * - Guessed number validated with Zod (2-99)
 *
 * **Game Logic**:
 * - Correct guess: Player wins, game completed
 * - Incorrect guess: Opponent wins, game completed
 *
 * **Request Body**:
 * ```json
 * { "guessedNumber": 42 }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "isCorrect": true,
 *   "winnerId": "uuid",
 *   "opponentSecret": 42
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const gameId = validateUuidParam(params.id);

	// Require authentication
	const { user } = await requireAuth(locals);

	// Validate request body
	const body = await request.json();
	const validation = guessSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { guessedNumber } = validation.data;

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

		// Verify game is in progress
		if (game.status !== 'in_progress') {
			throw error(400, "La partie n'est pas en cours");
		}

		// Verify it's the player's turn
		if (game.current_turn_player_id !== user.id) {
			throw error(400, "Ce n'est pas votre tour");
		}

		// Get opponent's secret number
		const opponentSecret = isPlayer1 ? game.player2_secret : game.player1_secret;
		const opponentId = isPlayer1 ? game.player2_id : game.player1_id;

		// Check if guess is correct
		const isCorrect = guessedNumber === opponentSecret;
		const winnerId = isCorrect ? user.id : opponentId;

		// Get next move number
		const { count, error: countError } = await locals.supabase
			.from('guess_who_moves')
			.select('*', { count: 'exact', head: true })
			.eq('game_id', gameId);

		if (countError) {
			sanitizePostgresError(countError, 'GUESS_WHO_GUESS_COUNT');
		}

		const moveNumber = (count ?? 0) + 1;

		// Insert the guess move
		const { error: insertError } = await locals.supabase.from('guess_who_moves').insert({
			game_id: gameId,
			player_id: user.id,
			move_number: moveNumber,
			move_type: 'guess',
			guessed_number: guessedNumber,
			is_correct: isCorrect
		});

		if (insertError) {
			sanitizePostgresError(insertError, 'GUESS_WHO_GUESS_INSERT');
		}

		// Update game: set winner and mark as completed
		const { error: updateError } = await locals.supabase
			.from('guess_who_games')
			.update({
				status: 'completed',
				winner_id: winnerId,
				current_turn_player_id: null
			})
			.eq('id', gameId);

		if (updateError) {
			sanitizePostgresError(updateError, 'GUESS_WHO_GUESS_UPDATE');
		}

		return json({
			success: true,
			isCorrect,
			winnerId,
			opponentSecret
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_GUESS');
	}
};
