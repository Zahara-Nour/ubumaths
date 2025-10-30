// Spell collection page
// Author: Claude Code
// Date: 2025-10-15

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { unlockSpellSchema } from '$lib/server/validation/navadra';

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
		const { data: existingSpell } = await supabase
			.from('game_spells')
			.select('id')
			.eq('user_id', user.id)
			.eq('spell_num', spell_num)
			.single();

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
