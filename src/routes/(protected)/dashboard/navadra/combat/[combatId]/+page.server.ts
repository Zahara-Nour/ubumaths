// Active combat page
// Author: Claude Code
// Date: 2025-10-15

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { validateAnswer } from '$lib/utils/game/challenge-variables';
import {
	calculateDamage,
	calculateXPReward,
	calculatePrestigeReward,
	calculatePyrsReward
} from '$lib/utils/game/combat';
import { selectSpellSchema, submitAnswerSchema } from '$lib/server/validation/navadra';
import { validateUuidParam } from '$lib/server/validation/params';
import { toGameMonster } from '$lib/types/game';

/**
 * Tolérance de comparaison d'un défi, lue dans la colonne jsonb `answer`.
 *
 * Rend `undefined` si le champ est absent ou n'est pas un nombre, pour laisser
 * `validateAnswer` appliquer sa valeur par défaut plutôt qu'une tolérance
 * `NaN` — qui ferait échouer toute comparaison numérique.
 */
function toleranceDuDefi(answer: unknown): number | undefined {
	if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) return undefined;
	const tolerance = (answer as Record<string, unknown>).tolerance;
	return typeof tolerance === 'number' ? tolerance : undefined;
}

export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const combatId = validateUuidParam(params.combatId, 'combatId');

	// Fetch combat with monster data
	const { data: combat, error: combatError } = await supabase
		.from('game_combats')
		.select(
			`
			*,
			monster:game_monsters(*)
		`
		)
		.eq('id', combatId)
		.single();

	if (combatError || !combat) {
		throw error(404, 'Combat not found');
	}

	// Verify user is a participant
	const isParticipant = combat.organizer_id === user.id;

	if (!isParticipant) {
		throw error(403, 'You are not a participant in this combat');
	}

	// Fetch game player
	const { data: gamePlayer } = await supabase
		.from('game_players')
		.select('*')
		.eq('user_id', user.id)
		.single();

	// Fetch player's spells (from active deck)
	const { data: activeDeck } = await supabase
		.from('game_spell_decks')
		.select(
			`
			*,
			spells:game_spells(*)
		`
		)
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// If no active deck, get first 10 spells
	let playerSpells = [];
	if (activeDeck && activeDeck.spells) {
		playerSpells = activeDeck.spells;
	} else {
		const { data: spells } = await supabase
			.from('game_spells')
			.select('*')
			.eq('user_id', user.id)
			.limit(10);
		playerSpells = spells || [];
	}

	return {
		combat,
		monster: toGameMonster(combat.monster),
		gamePlayer,
		playerSpells
	};
};

export const actions: Actions = {
	// Select a spell for this turn
	selectSpell: async ({ request, params, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) throw error(401, 'Unauthorized');

		const combatId = validateUuidParam(params.combatId, 'combatId');
		const formData = await request.formData();

		// Validate input using Zod schema
		const validation = selectSpellSchema.safeParse({
			spell_num: parseInt(formData.get('spell_num') as string)
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message
			});
		}

		const { spell_num } = validation.data;

		// Fetch combat
		const { data: combat } = await supabase
			.from('game_combats')
			.select('*')
			.eq('id', combatId)
			.single();

		if (!combat || combat.status !== 'active') {
			return fail(400, { error: "Le combat n'est pas actif" });
		}

		// Fetch spell
		const { data: spell } = await supabase
			.from('game_spells')
			.select('*')
			.eq('user_id', user.id)
			.eq('spell_num', spell_num)
			.single();

		if (!spell) {
			return fail(400, { error: 'Sort introuvable' });
		}

		// Select random challenge based on spell element
		const { data: challenges } = await supabase
			.from('game_challenges')
			.select('*')
			.eq('element', spell.element)
			.eq('is_active', true)
			.limit(10);

		if (!challenges || challenges.length === 0) {
			return fail(500, { error: 'Aucun défi disponible pour cet élément' });
		}

		const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

		return {
			success: true,
			spell,
			challenge: randomChallenge
		};
	},

	// Submit challenge answer and resolve combat turn
	submitAnswer: async ({ request, params, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) throw error(401, 'Unauthorized');

		const combatId = validateUuidParam(params.combatId, 'combatId');
		const formData = await request.formData();

		// Validate input using Zod schema
		const validation = submitAnswerSchema.safeParse({
			challenge_id: formData.get('challenge_id'),
			answer: formData.get('answer'),
			correct_answer: formData.get('correct_answer'),
			time_taken: parseInt(formData.get('time_taken') as string),
			spell_num: parseInt(formData.get('spell_num') as string)
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message
			});
		}

		const { challenge_id, answer, correct_answer, time_taken, spell_num } = validation.data;

		console.log('[submitAnswer] Received form data:', {
			challenge_id,
			answer,
			correct_answer,
			time_taken,
			spell_num
		});

		// Fetch combat
		const { data: combat } = await supabase
			.from('game_combats')
			.select('*, monster:game_monsters(*)')
			.eq('id', combatId)
			.single();

		if (!combat || combat.status !== 'active') {
			return fail(400, { error: "Le combat n'est pas actif" });
		}

		// `element` et `category` sont des colonnes texte : rétrécies une fois ici
		// plutôt qu'à chaque calcul de récompense.
		const monstre = toGameMonster(combat.monster);

		// Fetch challenge
		const { data: challenge } = await supabase
			.from('game_challenges')
			.select('*')
			.eq('id', challenge_id)
			.single();

		if (!challenge) {
			return fail(400, { error: 'Défi introuvable' });
		}

		// Validate answer using the correct answer from the client
		// (generated on the client with the same random seed as displayed)
		console.log('[submitAnswer] Validating answer:');
		console.log('  - Student answer:', JSON.stringify(answer));
		console.log('  - Correct answer:', JSON.stringify(correct_answer));
		// `game_challenges.answer` est du jsonb, donc typé `Json` : il ne porte
		// aucune clé. On extrait la tolérance avec un garde, et `validateAnswer`
		// applique sa valeur par défaut (0.01) quand elle est absente.
		const tolerance = toleranceDuDefi(challenge.answer);
		console.log('  - Tolerance:', tolerance);
		const success = validateAnswer(answer, correct_answer, tolerance);
		console.log('[submitAnswer] Validation result:', success);

		// Record challenge attempt
		await supabase.from('game_challenge_attempts').insert({
			user_id: user.id,
			challenge_id,
			combat_id: combatId,
			success,
			time_taken,
			answer_given: answer,
			correct_answer,
			challenge_instance: null // We don't need to store the full instance anymore
		});

		// Fetch spell and player level
		const { data: spell } = await supabase
			.from('game_spells')
			.select('*')
			.eq('user_id', user.id)
			.eq('spell_num', spell_num)
			.single();

		const { data: gamePlayer } = await supabase
			.from('game_players')
			.select('level')
			.eq('user_id', user.id)
			.single();

		if (!spell || !gamePlayer) {
			return fail(500, { error: 'Échec de récupération des données du sort ou du joueur' });
		}

		// Calculate damage (only if answer is correct)
		const damage = success
			? calculateDamage(
					spell,
					gamePlayer.level,
					monstre.element,
					1.0, // Full effectiveness on correct answer
					0 // No combo meter for now
				)
			: 0; // No damage on wrong answer

		// Update monster HP
		const newMonsterHP = Math.max(
			0,
			(combat.monster_endurance_remaining || monstre.max_endurance) - damage
		);

		// Create combat turn
		const newTurn = {
			round: combat.current_round,
			turn: combat.current_turn,
			player_id: user.id,
			action: 'spell',
			spell_num,
			challenge_result: {
				challenge_id,
				success,
				time_taken
			},
			damage_dealt: damage,
			timestamp: new Date().toISOString()
		};

		const updatedFlow = [...(combat.combat_flow || []), newTurn];

		// Check if combat is over
		const isVictory = newMonsterHP <= 0;

		if (isVictory) {
			// Calculate rewards
			const xpGained = calculateXPReward(monstre, gamePlayer.level, 0);
			const prestigeGained = calculatePrestigeReward(monstre, time_taken / 1000, 0);
			const pyrsGained = calculatePyrsReward(monstre);

			// Update combat
			await supabase
				.from('game_combats')
				.update({
					combat_flow: updatedFlow,
					monster_endurance_remaining: newMonsterHP,
					status: 'completed',
					outcome: 'victory',
					completed_at: new Date().toISOString(),
					xp_gained: xpGained,
					prestige_gained: prestigeGained,
					pyrs_gained: { [monstre.element]: pyrsGained }
				})
				.eq('id', combatId);

			return {
				success: true,
				damageDealt: damage,
				challengeSuccess: success,
				victory: true,
				rewards: {
					xp: xpGained,
					prestige: prestigeGained,
					pyrs: pyrsGained,
					element: monstre.element
				}
			};
		} else {
			// Update combat
			await supabase
				.from('game_combats')
				.update({
					combat_flow: updatedFlow,
					monster_endurance_remaining: newMonsterHP,
					current_turn: combat.current_turn + 1
				})
				.eq('id', combatId);

			return {
				success: true,
				damageDealt: damage,
				challengeSuccess: success,
				victory: false
			};
		}
	}
};
