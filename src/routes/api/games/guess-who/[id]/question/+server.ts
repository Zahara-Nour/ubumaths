/**
 * API Endpoint: Ask a Question in Guess Who Game
 * Path: POST /api/games/guess-who/[id]/question
 *
 * Allows the current player to ask a mathematical property question
 * about the opponent's secret number.
 *
 * Flow:
 * 1. Validate it's the player's turn
 * 2. Validate question type and parameter
 * 3. Insert move with type 'question'
 * 4. Reset turn timer
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { askQuestionSchema } from '$lib/server/validation/guess-who';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * POST /api/games/guess-who/[id]/question
 *
 * Ask a question about the opponent's secret number.
 *
 * **Security**:
 * - Requires authentication
 * - Must be player's turn
 * - Game must be in_progress
 * - Question type and params validated with Zod
 *
 * **Request Body**:
 * ```json
 * {
 *   "questionType": "is_divisible_by",
 *   "questionParam": 7
 * }
 * ```
 *
 * **Response**:
 * ```json
 * { "success": true, "moveNumber": 1 }
 * ```
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const gameId = validateUuidParam(params.id);

	// Require authentication
	const { user } = await requireAuth(locals);

	// Validate request body
	const body = await request.json();
	const validation = askQuestionSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { questionType, questionParam } = validation.data;

	try {
		// Fetch game to validate turn and status
		const { data: game, error: gameError } = await locals.supabase
			.from('guess_who_games')
			.select('*')
			.eq('id', gameId)
			.single();

		if (gameError || !game) {
			throw error(404, 'Partie introuvable');
		}

		// Verify user is a participant
		if (game.player1_id !== user.id && game.player2_id !== user.id) {
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

		// Get next move number
		const { count, error: countError } = await locals.supabase
			.from('guess_who_moves')
			.select('*', { count: 'exact', head: true })
			.eq('game_id', gameId);

		if (countError) {
			sanitizePostgresError(countError, 'GUESS_WHO_QUESTION_COUNT');
		}

		const moveNumber = (count ?? 0) + 1;

		// Insert the question move
		const { error: insertError } = await locals.supabase.from('guess_who_moves').insert({
			game_id: gameId,
			player_id: user.id,
			move_number: moveNumber,
			move_type: 'question',
			question_type: questionType,
			question_param: questionParam ?? null
		});

		if (insertError) {
			sanitizePostgresError(insertError, 'GUESS_WHO_QUESTION_INSERT');
		}

		// Update game: reset turn timer (opponent now needs to answer)
		const { error: updateError } = await locals.supabase
			.from('guess_who_games')
			.update({
				turn_started_at: new Date().toISOString()
			})
			.eq('id', gameId);

		if (updateError) {
			sanitizePostgresError(updateError, 'GUESS_WHO_QUESTION_UPDATE');
		}

		return json({
			success: true,
			moveNumber
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_QUESTION');
	}
};
