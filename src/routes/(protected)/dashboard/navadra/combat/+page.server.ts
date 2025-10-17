// Combat page - Monster selection
// Author: Claude Code
// Date: 2025-10-15

import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { generateRandomMonster } from '$lib/utils/game/combat';
import { getRandomMonsterTemplate, getMonsterImagePaths } from '$lib/data/game/monsters';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Fetch game player
	const { data: gamePlayer } = await supabase
		.from('game_players')
		.select('*')
		.eq('user_id', user.id)
		.single();

	if (!gamePlayer) {
		throw error(404, 'Game profile not found');
	}

	// Fetch available monsters (not dead, spawned in last 24h)
	const { data: availableMonsters } = await supabase
		.from('game_monsters')
		.select('*')
		.eq('is_dead', false)
		.gte('spawned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
		.order('level', { ascending: true })
		.limit(20);

	return {
		gamePlayer,
		availableMonsters: availableMonsters || []
	};
};

export const actions: Actions = {
	// DEBUG: Create a very weak monster for testing (level 1, 1 HP)
	spawnDebugMonster: async ({ locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) throw error(401, 'Unauthorized');

		// Create a super weak debug monster
		const template = getRandomMonsterTemplate('fire', 'common');
		const imagePaths = getMonsterImagePaths(template);

		const { data: debugMonster, error: createError } = await supabase
			.from('game_monsters')
			.insert({
				name: '🐛 ' + template.name + ' DEBUG',
				element: 'fire',
				level: 1,
				category: 'common',
				max_endurance: 1, // Only 1 HP!
				attack_coefficient: 0.1,
				img_url: imagePaths.img_url,
				img_head_url: imagePaths.img_head_url,
				spawned_at: new Date().toISOString()
			})
			.select()
			.single();

		if (createError || !debugMonster) {
			throw error(500, 'Failed to create debug monster');
		}

		// Create combat
		const { data: combat, error: combatError } = await supabase
			.from('game_combats')
			.insert({
				organizer_id: user.id,
				monster_id: debugMonster.id,
				status: 'active',
				started_at: new Date().toISOString(),
				monster_endurance_remaining: debugMonster.max_endurance,
				monster_snapshot: {
					name: debugMonster.name,
					element: debugMonster.element,
					level: debugMonster.level,
					max_endurance: debugMonster.max_endurance,
					attack_coefficient: debugMonster.attack_coefficient,
					img_url: debugMonster.img_url
				},
				player_snapshots: {}
			})
			.select()
			.single();

		if (combatError || !combat) {
			throw error(500, 'Failed to create combat');
		}

		// Redirect to combat page
		throw redirect(303, `/dashboard/navadra/combat/${combat.id}`);
	},

	// Start a new combat with a random or selected monster
	startCombat: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) throw error(401, 'Unauthorized');

		const data = await request.formData();
		const monsterId = data.get('monster_id') as string | null;

		let monster;

		if (monsterId) {
			// Use existing monster
			const { data: existingMonster, error: monsterError } = await supabase
				.from('game_monsters')
				.select('*')
				.eq('id', monsterId)
				.single();

			if (monsterError || !existingMonster) {
				throw error(404, 'Monster not found');
			}

			monster = existingMonster;
		} else {
			// Generate random monster
			const { data: gamePlayer } = await supabase
				.from('game_players')
				.select('level')
				.eq('user_id', user.id)
				.single();

			const monsterConfig = generateRandomMonster(gamePlayer?.level || 1);

			// Get monster template with proper name and images
			const template = getRandomMonsterTemplate(monsterConfig.element, monsterConfig.category);
			const imagePaths = getMonsterImagePaths(template);

			// Create monster in database
			const { data: newMonster, error: createError } = await supabase
				.from('game_monsters')
				.insert({
					name: template.name,
					element: monsterConfig.element,
					level: monsterConfig.level,
					category: monsterConfig.category,
					max_endurance: monsterConfig.max_endurance,
					attack_coefficient: monsterConfig.attack_coefficient,
					img_url: imagePaths.img_url,
					img_head_url: imagePaths.img_head_url,
					spawned_at: new Date().toISOString()
				})
				.select()
				.single();

			if (createError || !newMonster) {
				throw error(500, 'Failed to create monster');
			}

			monster = newMonster;
		}

		// Create combat
		const { data: combat, error: combatError } = await supabase
			.from('game_combats')
			.insert({
				organizer_id: user.id,
				monster_id: monster.id,
				status: 'active',
				started_at: new Date().toISOString(),
				monster_endurance_remaining: monster.max_endurance,
				monster_snapshot: {
					name: monster.name,
					element: monster.element,
					level: monster.level,
					max_endurance: monster.max_endurance,
					attack_coefficient: monster.attack_coefficient,
					img_url: monster.img_url
				},
				player_snapshots: {} // Will be populated as players join
			})
			.select()
			.single();

		if (combatError || !combat) {
			throw error(500, 'Failed to create combat');
		}

		// Redirect to combat page
		throw redirect(303, `/dashboard/navadra/combat/${combat.id}`);
	}
};
