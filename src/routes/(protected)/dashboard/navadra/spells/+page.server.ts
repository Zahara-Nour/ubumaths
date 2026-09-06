// Spell collection page
// Author: Claude Code
// Date: 2025-10-15

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { unlockSpellSchema } from '$lib/server/validation/navadra';
import { toGameSpell, toGamePlayer } from '$lib/types/game';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

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

	// Fetch spell decks
	const { data: decks, error: decksError } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true });

	if (decksError) {
		console.error('Lecture impossible :', decksError);
		throw error(500, 'Impossible de charger les données');
	}

	// Fetch active deck
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

	// Fetch game player for pyrs
	const { data: gamePlayer, error: gamePlayerError } = await supabase
		.from('game_players')
		.select('*')
		.eq('user_id', user.id)
		.single();

	// Élément de contexte : le repli d'affichage existe déjà, mais son absence
	// ne doit pas se confondre avec une donnée réellement vide.
	if (gamePlayerError && gamePlayerError.code !== 'PGRST116') {
		console.error('Contexte illisible :', gamePlayerError);
	}

	// L'écran du grimoire lit les pyrs du joueur dès son en-tête : sans fiche de
	// jeu, il n'y a rien à afficher.
	if (!gamePlayer) {
		throw error(404, 'Aucune fiche de joueur : lance une partie depuis Navadra.');
	}

	return {
		// `element` et `type` sont des colonnes texte, `tutorial_stage` aussi.
		spells: (spells ?? []).map(toGameSpell),
		decks: decks || [],
		activeDeck: activeDeck || null,
		gamePlayer: toGamePlayer(gamePlayer)
	};
};

export const actions: Actions = {
	// Unlock a new spell (for testing - normally unlocked through gameplay)
	unlockSpell: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) throw error(401, 'Unauthorized');

		const formData = await request.formData();

		// Validate input using Zod schema
		const validation = unlockSpellSchema.safeParse({
			spell_num: parseInt(formData.get('spell_num') as string),
			element: formData.get('element'),
			type: formData.get('type'),
			power: parseInt(formData.get('power') as string)
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message
			});
		}

		const { spell_num, element, type, power } = validation.data;

		// Check if spell already unlocked
		const { data: existingSpell, error: existingSpellError } = await supabase
			.from('game_spells')
			.select('id')
			.eq('user_id', user.id)
			.eq('spell_num', spell_num)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (existingSpellError && existingSpellError.code !== 'PGRST116') {
			console.error('Lecture impossible :', existingSpellError);
			return fail(500, { error: 'Lecture impossible' });
		}

		if (existingSpell) {
			return fail(400, { error: 'Sort déjà débloqué' });
		}

		// Unlock spell
		const { error: unlockError } = await supabase.from('game_spells').insert({
			user_id: user.id,
			spell_num,
			level: 1,
			element,
			power,
			type
		});

		if (unlockError) {
			return fail(500, { error: 'Échec du déblocage du sort' });
		}

		return { success: true };
	}
};
