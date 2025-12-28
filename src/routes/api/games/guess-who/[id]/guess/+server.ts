/**
 * API Endpoint: Make a Guess in Guess Who Game
 * Path: POST /api/games/guess-who/[id]/guess
 *
 * Allows the current player to guess the opponent's secret item.
 * A correct guess wins the game; an incorrect guess loses.
 * Supports both number packs and polymorphic packs.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { guessSchema } from '$lib/server/validation/guess-who';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';
import {
	deserializeGridItem,
	gridItemsEqual,
	serializeGridItem,
	type GridItem
} from '$lib/utils/guess-who';
import {
	updatePlayerStats,
	checkAndUnlockAchievements,
	type GameCompletionData
} from '$lib/server/guess-who/stats-tracker';

/**
 * POST /api/games/guess-who/[id]/guess
 *
 * Make a final guess of the opponent's secret item.
 *
 * **Security**:
 * - Requires authentication
 * - Must be player's turn
 * - Game must be in_progress
 * - Guessed item validated with Zod
 *
 * **Game Logic**:
 * - Correct guess: Player wins, game completed
 * - Incorrect guess: Opponent wins, game completed
 *
 * **Request Body (number packs)**:
 * ```json
 * { "guessedNumber": 42 }
 * ```
 *
 * **Request Body (polymorphic packs)**:
 * ```json
 * { "guessedItem": { "type": "fraction", "numerator": 1, "denominator": 2, ... } }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "isCorrect": true,
 *   "winnerId": "uuid",
 *   "opponentSecret": 42,        // For number packs
 *   "opponentSecretItem": {...}  // For polymorphic packs
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

	const { guessedNumber, guessedItem } = validation.data;

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

		const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
		const itemType = game.item_type || 'number';

		let isCorrect: boolean;
		let responseData: Record<string, unknown>;
		let moveInsertData: Record<string, unknown>;

		if (itemType === 'number') {
			// Number pack: compare numbers
			if (guessedNumber === undefined) {
				throw error(400, 'guessedNumber is required for number packs');
			}
			const opponentSecret = isPlayer1 ? game.player2_secret : game.player1_secret;
			isCorrect = guessedNumber === opponentSecret;
			responseData = { opponentSecret };
			moveInsertData = {
				guessed_number: guessedNumber
			};
		} else {
			// Polymorphic pack: compare items
			if (!guessedItem) {
				throw error(400, 'guessedItem is required for polymorphic packs');
			}
			const opponentSecretData = isPlayer1 ? game.player2_secret_item : game.player1_secret_item;
			if (!opponentSecretData) {
				throw error(500, 'Opponent secret item not found');
			}
			const opponentSecretItem = deserializeGridItem(opponentSecretData);
			isCorrect = gridItemsEqual(guessedItem as GridItem, opponentSecretItem);
			responseData = { opponentSecretItem };
			moveInsertData = {
				guessed_item: serializeGridItem(guessedItem as GridItem)
			};
		}

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
			is_correct: isCorrect,
			...moveInsertData
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

		// Track stats and achievements (async, don't block response)
		const gameTimeSeconds = game.created_at
			? Math.round((Date.now() - new Date(game.created_at).getTime()) / 1000)
			: 0;

		// Fetch all moves for stats calculation
		const { data: allMoves } = await locals.supabase
			.from('guess_who_moves')
			.select('player_id, move_type, is_correct')
			.eq('game_id', gameId);

		const completionData: GameCompletionData = {
			gameId,
			packId: game.pack_id,
			winnerId,
			player1Id: game.player1_id,
			player2Id: game.player2_id,
			gameTimeSeconds,
			moves: (allMoves || []).map((m) => ({
				playerId: m.player_id,
				moveType: m.move_type as 'question' | 'answer' | 'guess',
				isCorrect: m.is_correct
			}))
		};

		// Update stats (non-blocking)
		updatePlayerStats(locals.supabase, completionData).catch((err) => {
			console.error('Failed to update stats:', err);
		});

		// Check achievements for the winner
		const questionsAsked = completionData.moves.filter(
			(m) => m.playerId === winnerId && m.moveType === 'question'
		).length;

		const unlockedAchievements = await checkAndUnlockAchievements(
			locals.supabase,
			winnerId,
			gameId,
			game.pack_id,
			true,
			questionsAsked,
			gameTimeSeconds
		);

		// Also check achievements for the loser (they still get accuracy achievements, etc.)
		const loserId = winnerId === game.player1_id ? game.player2_id : game.player1_id;
		const loserQuestionsAsked = completionData.moves.filter(
			(m) => m.playerId === loserId && m.moveType === 'question'
		).length;

		checkAndUnlockAchievements(
			locals.supabase,
			loserId,
			gameId,
			game.pack_id,
			false,
			loserQuestionsAsked,
			gameTimeSeconds
		).catch((err) => {
			console.error('Failed to check loser achievements:', err);
		});

		return json({
			success: true,
			isCorrect,
			winnerId,
			unlockedAchievements: isCorrect ? unlockedAchievements : [],
			...responseData
		});
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_GUESS');
	}
};
