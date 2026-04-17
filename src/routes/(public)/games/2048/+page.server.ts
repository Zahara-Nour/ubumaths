/**
 * 2048 Game - Server Load
 * =======================
 * Loads the user's best score and VIP card data from the database if authenticated.
 * Also checks if the user can save scores (must be a student).
 */

import type { PageServerLoad } from './$types';
import type { StudentVipCards } from '$lib/types/vip-card';
import { countAvailableConsumableUses } from '$lib/utils/vip-cards';

// VIP card IDs for 2048 powers
const UNDO_CARD_IDS = ['2048-undo'];
// Bomb tiers are counted separately in the return value
const FREEZE_CARD_IDS = ['2048-freeze-spawn'];
const FUSION_CARD_IDS = ['2048-merge'];
const JOKER_CARD_IDS = ['2048-joker'];
const VISION_CARD_IDS = ['2048-vision'];
// Multiplier factors are counted separately in the return value

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Not authenticated - return defaults
	if (!user || !profile) {
		return {
			serverBestScore: null,
			canSaveScore: false,
			gamesPlayed: 0,
			vipCards: null,
			undoCardsAvailable: 0,
			bombCardsAvailable: { tier1: 0, tier2: 0 },
			freezeCardsAvailable: 0,
			fusionCardsAvailable: 0,
			jokerCardsAvailable: 0,
			visionCardsAvailable: 0,
			multiplierCardsAvailable: { x15: 0, x2: 0 },
			gidouilles: 0
		};
	}

	// Only students can save scores
	const canSaveScore = profile.role === 'student';

	if (!canSaveScore) {
		return {
			serverBestScore: null,
			canSaveScore: false,
			gamesPlayed: 0,
			vipCards: null,
			undoCardsAvailable: 0,
			bombCardsAvailable: { tier1: 0, tier2: 0 },
			freezeCardsAvailable: 0,
			fusionCardsAvailable: 0,
			jokerCardsAvailable: 0,
			visionCardsAvailable: 0,
			multiplierCardsAvailable: { x15: 0, x2: 0 },
			gidouilles: 0
		};
	}

	// Fetch score and profile data in parallel
	const [scoreResult, profileResult] = await Promise.all([
		supabase
			.from('game_2048_scores')
			.select('best_score, games_played')
			.eq('user_id', user.id)
			.eq('mode', 'classic')
			.maybeSingle(),
		supabase.from('profiles').select('vip_cards, gidouilles').eq('id', user.id).single()
	]);

	const vipCards = (profileResult.data?.vip_cards as StudentVipCards | null) ?? {};
	const gidouilles = (profileResult.data?.gidouilles as number) ?? 0;

	return {
		serverBestScore: scoreResult.data?.best_score ?? null,
		canSaveScore,
		gamesPlayed: scoreResult.data?.games_played ?? 0,
		vipCards,
		undoCardsAvailable: countAvailableConsumableUses(vipCards, UNDO_CARD_IDS),
		bombCardsAvailable: {
			tier1: countAvailableConsumableUses(vipCards, ['2048-bomb']),
			tier2: countAvailableConsumableUses(vipCards, ['2048-bomb-2'])
		},
		freezeCardsAvailable: countAvailableConsumableUses(vipCards, FREEZE_CARD_IDS),
		fusionCardsAvailable: countAvailableConsumableUses(vipCards, FUSION_CARD_IDS),
		jokerCardsAvailable: countAvailableConsumableUses(vipCards, JOKER_CARD_IDS),
		visionCardsAvailable: countAvailableConsumableUses(vipCards, VISION_CARD_IDS),
		multiplierCardsAvailable: {
			x15: countAvailableConsumableUses(vipCards, ['2048-multiplier']),
			x2: countAvailableConsumableUses(vipCards, ['2048-multiplier-2'])
		},
		gidouilles
	};
};
