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
const BOMB_CARD_IDS = ['2048-bomb', '2048-bomb-2', '2048-bomb-3'];
const FREEZE_CARD_IDS = ['2048-freeze-spawn'];

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
			bombCardsAvailable: 0,
			freezeCardsAvailable: 0,
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
			bombCardsAvailable: 0,
			freezeCardsAvailable: 0,
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
		bombCardsAvailable: countAvailableConsumableUses(vipCards, BOMB_CARD_IDS),
		freezeCardsAvailable: countAvailableConsumableUses(vipCards, FREEZE_CARD_IDS),
		gidouilles
	};
};
