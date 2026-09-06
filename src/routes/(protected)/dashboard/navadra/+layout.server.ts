// Navadra game layout server load
// Author: Claude Code
// Date: 2025-10-15

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { toGameSpell, toGamePlayer } from '$lib/types/game';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'You must be logged in to play Navadra');
	}

	// Fetch or create game player profile
	const { data: initialGamePlayer, error: gamePlayerError } = await supabase
		.from('game_players')
		.select('*')
		.eq('user_id', user.id)
		.single();

	let gamePlayer = initialGamePlayer;

	// If game player doesn't exist, create one
	if (gamePlayerError?.code === 'PGRST116') {
		// Not found, create new game player
		const { data: newGamePlayer, error: createError } = await supabase
			.from('game_players')
			.insert({
				user_id: user.id
			})
			.select()
			.single();

		if (createError) {
			console.error('Failed to create game player:', createError);
			throw error(500, 'Failed to create game profile');
		}

		gamePlayer = newGamePlayer;
	} else if (gamePlayerError) {
		console.error('Failed to fetch game player:', gamePlayerError);
		throw error(500, 'Failed to load game profile');
	}

	// Les deux branches ci-dessus garantissent une fiche, mais le compilateur ne
	// le déduit pas d'un `let` réaffecté : la garde le lui dit.
	if (!gamePlayer) {
		throw error(500, 'Failed to load game profile');
	}

	// Fetch player's spells
	const { data: spells } = await supabase
		.from('game_spells')
		.select('*')
		.eq('user_id', user.id)
		.order('spell_num', { ascending: true });

	// Fetch player's active spell deck
	const { data: activeDeck } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Fetch all player's spell decks
	const { data: allDecks } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true });

	return {
		// `tutorial_stage` est du texte et `music_settings` du jsonb.
		gamePlayer: toGamePlayer(gamePlayer),
		// `element` et `type` sont des colonnes texte : rétrécies ici plutôt que
		// dans chaque écran de combat.
		spells: (spells ?? []).map(toGameSpell),
		activeDeck: activeDeck || null,
		allDecks: allDecks || []
	};
};
