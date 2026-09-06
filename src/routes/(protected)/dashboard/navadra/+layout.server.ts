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
	const { data: spells, error: spellsError } = await supabase
		.from('game_spells')
		.select('*')
		.eq('user_id', user.id)
		.order('spell_num', { ascending: true });

	if (spellsError) {
		console.error('Lecture impossible :', spellsError);
		throw error(500, 'Impossible de charger les données');
	}

	// Fetch player's active spell deck
	const { data: activeDeck, error: activeDeckError } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Élément de contexte : le repli d'affichage existe déjà, mais son absence
	// ne doit pas se confondre avec une donnée réellement vide.
	if (activeDeckError && activeDeckError.code !== 'PGRST116') {
		console.error('Contexte illisible :', activeDeckError);
	}

	// Fetch all player's spell decks
	const { data: allDecks, error: allDecksError } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true });

	if (allDecksError) {
		console.error('Lecture impossible :', allDecksError);
		throw error(500, 'Impossible de charger les données');
	}

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
