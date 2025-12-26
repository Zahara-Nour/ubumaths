/**
 * Join Guess Who Game via Token - Server Load
 * ============================================
 *
 * Validates the share token and checks if the game is joinable.
 * - If authenticated: Load game data to prepare for auto-join
 * - If not authenticated: Return token for use after login
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { token } = params;
	const { user, supabase } = locals;

	// Validate token format (16 alphanumeric characters)
	if (!/^[A-Za-z0-9]{16}$/.test(token)) {
		throw error(400, 'Lien invalide');
	}

	// Find the game with this token
	const { data: game, error: gameError } = await supabase
		.from('guess_who_games')
		.select('id, player1_id, player2_id, status, share_token')
		.eq('share_token', token)
		.single();

	if (gameError || !game) {
		throw error(404, 'Partie introuvable');
	}

	// Check if game is joinable
	if (game.status !== 'waiting') {
		throw error(400, 'Cette partie a déjà commencé ou est terminée');
	}

	if (game.player2_id !== null) {
		throw error(400, 'Cette partie est déjà complète');
	}

	// If user is authenticated, check if they're trying to join their own game
	if (user && game.player1_id === user.id) {
		throw error(400, 'Vous ne pouvez pas rejoindre votre propre partie');
	}

	return {
		token,
		gameId: game.id,
		isAuthenticated: !!user,
		user: user || null
	};
};
