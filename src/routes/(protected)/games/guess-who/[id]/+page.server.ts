/**
 * Protected Guess Who Game Page - Server Load
 * ============================================
 *
 * Loads the complete game state for authenticated players.
 * Verifies that the user is a participant in the game.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	const gameId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Fetch game data
		const { data: game, error: gameError } = await supabase
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
			throw error(403, "Vous n'êtes pas participant de cette partie");
		}

		// Get player's secret number (never reveal opponent's)
		const mySecretNumber = isPlayer1 ? game.player1_secret : game.player2_secret;

		// Fetch both players' profiles for display names
		const playerIds = [game.player1_id, game.player2_id].filter(Boolean);
		const { data: profiles, error: profilesError } = await supabase
			.from('profiles')
			.select('id, username, display_name')
			.in('id', playerIds);

		if (profilesError) {
			console.error('Failed to load player profiles:', profilesError);
		}

		// Create a map of player ID to display name
		const playerNames: Record<string, string> = {};
		profiles?.forEach((profile) => {
			playerNames[profile.id] = profile.display_name || profile.username;
		});

		// Fetch move history
		const { data: moves, error: movesError } = await supabase
			.from('guess_who_moves')
			.select('*')
			.eq('game_id', gameId)
			.order('move_number', { ascending: true });

		if (movesError) {
			console.error('Failed to load moves:', movesError);
		}

		// Fetch player's eliminated numbers
		const { data: eliminated, error: eliminatedError } = await supabase
			.from('guess_who_eliminated')
			.select('eliminated_numbers')
			.eq('game_id', gameId)
			.eq('player_id', user.id)
			.maybeSingle();

		if (eliminatedError) {
			console.error('Failed to load eliminated numbers:', eliminatedError);
		}

		return {
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
			myPlayerId: user.id,
			playerNames,
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
		};
	} catch (err) {
		console.error('Error loading game:', err);
		throw err;
	}
};
