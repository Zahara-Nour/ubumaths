/**
 * Mathemo Game - Server Load
 * ===========================
 * Loads the user's game stats, VIP cards, and gidouilles from the database.
 * Determines if the user can earn rewards (must be a student).
 */

import type { PageServerLoad } from './$types';
import type { StudentVipCards } from '$lib/types/vip-card';
import { countAvailableConsumableUses } from '$lib/utils/vip-cards';

const LETTER_CARD_IDS = ['mathemo-letter'];
const UNDO_CARD_IDS = ['mathemo-undo'];
const VOWELS_CARD_IDS = ['mathemo-vowels'];
const MULTIPLIER_CARD_IDS = ['mathemo-multiplier'];

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	const defaults = {
		canSaveScore: false,
		gamesPlayed: 0,
		gamesWon: 0,
		vipCards: null as StudentVipCards | null,
		letterCardsAvailable: 0,
		undoCardsAvailable: 0,
		vowelsCardsAvailable: 0,
		multiplierCardsAvailable: 0,
		gidouilles: 0
	};

	if (!user || !profile) return defaults;

	const canSaveScore = profile.role === 'student';
	if (!canSaveScore) return defaults;

	const [scoreResult, profileResult] = await Promise.all([
		supabase
			.from('mathemo_scores')
			.select('games_played, games_won')
			.eq('user_id', user.id)
			.maybeSingle(),
		supabase.from('profiles').select('vip_cards, gidouilles').eq('id', user.id).single()
	]);

	const vipCards = (profileResult.data?.vip_cards as StudentVipCards | null) ?? {};
	const gidouilles = (profileResult.data?.gidouilles as number) ?? 0;

	return {
		canSaveScore,
		gamesPlayed: scoreResult.data?.games_played ?? 0,
		gamesWon: scoreResult.data?.games_won ?? 0,
		vipCards,
		letterCardsAvailable: countAvailableConsumableUses(vipCards, LETTER_CARD_IDS),
		undoCardsAvailable: countAvailableConsumableUses(vipCards, UNDO_CARD_IDS),
		vowelsCardsAvailable: countAvailableConsumableUses(vipCards, VOWELS_CARD_IDS),
		multiplierCardsAvailable: countAvailableConsumableUses(vipCards, MULTIPLIER_CARD_IDS),
		gidouilles
	};
};
