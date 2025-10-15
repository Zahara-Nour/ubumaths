// Spell collection page
// Author: Claude Code
// Date: 2025-10-15

import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	// Fetch player's spells
	const { data: spells } = await supabase
		.from('game_spells')
		.select('*')
		.eq('user_id', user.id)
		.order('spell_num', { ascending: true });

	// Fetch spell decks
	const { data: decks } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true });

	// Fetch active deck
	const { data: activeDeck } = await supabase
		.from('game_spell_decks')
		.select('*')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Fetch game player for pyrs
	const { data: gamePlayer } = await supabase
		.from('game_players')
		.select('*')
		.eq('user_id', user.id)
		.single();

	return {
		spells: spells || [],
		decks: decks || [],
		activeDeck: activeDeck || null,
		gamePlayer
	};
};

export const actions: Actions = {
	// Unlock a new spell (for testing - normally unlocked through gameplay)
	unlockSpell: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) throw error(401, 'Unauthorized');

		const data = await request.formData();
		const spellNum = parseInt(data.get('spell_num') as string);
		const element = data.get('element') as string;
		const type = data.get('type') as string;
		const power = parseInt(data.get('power') as string);

		// Check if spell already unlocked
		const { data: existingSpell } = await supabase
			.from('game_spells')
			.select('id')
			.eq('user_id', user.id)
			.eq('spell_num', spellNum)
			.single();

		if (existingSpell) {
			return { error: 'Spell already unlocked' };
		}

		// Unlock spell
		const { error: unlockError } = await supabase.from('game_spells').insert({
			user_id: user.id,
			spell_num: spellNum,
			level: 1,
			element,
			power,
			type
		});

		if (unlockError) {
			return { error: 'Failed to unlock spell' };
		}

		return { success: true };
	}
};
