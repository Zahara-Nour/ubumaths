/**
 * API Endpoint: Answer a Question in Guess Who Game
 * Path: POST /api/games/guess-who/[id]/answer
 *
 * Allows a player to answer the opponent's question about their secret number.
 * The server validates the answer and applies bonus turn logic.
 *
 * Flow:
 * 1. Validate there's a pending question to answer
 * 2. Calculate the correct answer using checkProperty()
 * 3. If incorrect: increment bonus_turns (max 3), keep same turn
 * 4. If correct: switch turn, reset bonus_turns
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { answerQuestionSchema } from '$lib/server/validation/guess-who';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';
import {
	checkProperty,
	checkQuestion,
	deserializeGridItem,
	type AnyQuestionType
} from '$lib/utils/guess-who';
import type { QuestionType } from '$lib/utils/guess-who/math-properties';

const MAX_BONUS_TURNS = 3;

/**
 * POST /api/games/guess-who/[id]/answer
 *
 * Answer a pending question about your secret number.
 *
 * **Security**:
 * - Requires authentication
 * - Must be opponent's turn (respondent answers during asker's turn)
 * - Game must be in_progress
 * - There must be a pending question to answer
 * - Answer is validated against actual secret number server-side
 *
 * **Request Body**:
 * ```json
 * { "answer": true }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "isCorrect": true,
 *   "correctAnswer": true,
 *   "bonusTurnsRemaining": 0
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const gameId = validateUuidParam(params.id);

	// Require authentication
	const { user } = await requireAuth(locals);

	// Validate request body
	const body = await request.json();
	const validation = answerQuestionSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { answer } = validation.data;

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

		// Verify it's NOT the player's turn (respondent answers during asker's turn)
		if (game.current_turn_player_id === user.id) {
			throw error(400, "C'est votre tour de poser une question, pas de repondre");
		}

		// Get the last question move (pending question)
		const { data: lastQuestion, error: questionError } = await locals.supabase
			.from('guess_who_moves')
			.select('*')
			.eq('game_id', gameId)
			.eq('move_type', 'question')
			.order('move_number', { ascending: false })
			.limit(1)
			.single();

		if (questionError || !lastQuestion) {
			throw error(400, 'Aucune question en attente');
		}

		// Check if this question was already answered
		const { data: existingAnswer, error: answerCheckError } = await locals.supabase
			.from('guess_who_moves')
			.select('id')
			.eq('game_id', gameId)
			.eq('move_type', 'answer')
			.gt('move_number', lastQuestion.move_number)
			.limit(1)
			.maybeSingle();

		if (answerCheckError) {
			sanitizePostgresError(answerCheckError, 'GUESS_WHO_ANSWER_CHECK');
		}

		if (existingAnswer) {
			throw error(400, 'Cette question a deja ete repondue');
		}

		// Get the respondent's secret (number or item)
		const itemType = game.item_type || 'number';
		let correctAnswer: boolean;

		if (itemType === 'number') {
			// Number pack: use the numeric secret
			const mySecret = isPlayer1 ? game.player1_secret : game.player2_secret;
			correctAnswer = checkProperty(
				mySecret,
				lastQuestion.question_type as QuestionType,
				lastQuestion.question_param ?? undefined
			);
		} else {
			// Polymorphic pack: use the secret item
			const mySecretItemData = isPlayer1 ? game.player1_secret_item : game.player2_secret_item;
			if (!mySecretItemData) {
				throw error(500, 'Secret item not found for polymorphic game');
			}
			const mySecretItem = deserializeGridItem(mySecretItemData);
			correctAnswer = checkQuestion(
				mySecretItem,
				lastQuestion.question_type as AnyQuestionType,
				lastQuestion.question_param ?? lastQuestion.question_param_text ?? undefined
			);
		}

		const isCorrect = answer === correctAnswer;

		// Get next move number
		const moveNumber = lastQuestion.move_number + 1;

		// Insert the answer move
		const { error: insertError } = await locals.supabase.from('guess_who_moves').insert({
			game_id: gameId,
			player_id: user.id,
			move_number: moveNumber,
			move_type: 'answer',
			answer,
			is_correct: isCorrect,
			correct_answer: correctAnswer
		});

		if (insertError) {
			sanitizePostgresError(insertError, 'GUESS_WHO_ANSWER_INSERT');
		}

		// Update game state based on answer correctness
		let newBonusTurns = game.bonus_turns_remaining;
		let newTurnPlayerId = game.current_turn_player_id;

		if (!isCorrect) {
			// Wrong answer: increment bonus turns (max 3), keep same player's turn
			newBonusTurns = Math.min(game.bonus_turns_remaining + 1, MAX_BONUS_TURNS);
		} else {
			// Correct answer: switch turn, reset bonus turns
			newTurnPlayerId = user.id; // The answerer now gets their turn
			newBonusTurns = 0;
		}

		const { error: updateError } = await locals.supabase
			.from('guess_who_games')
			.update({
				current_turn_player_id: newTurnPlayerId,
				bonus_turns_remaining: newBonusTurns,
				turn_started_at: new Date().toISOString()
			})
			.eq('id', gameId);

		if (updateError) {
			sanitizePostgresError(updateError, 'GUESS_WHO_ANSWER_UPDATE');
		}

		return json({
			success: true,
			isCorrect,
			correctAnswer,
			bonusTurnsRemaining: newBonusTurns
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_ANSWER');
	}
};
