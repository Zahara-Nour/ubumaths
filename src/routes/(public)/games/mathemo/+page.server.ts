/**
 * Mathemo Game - Server Load
 * ===========================
 * Loads the user's game stats from the database if authenticated.
 * Determines if the user can earn rewards (must be a student).
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Not authenticated - return defaults
	if (!user || !profile) {
		return {
			canSaveScore: false,
			gamesPlayed: 0,
			gamesWon: 0
		};
	}

	// Only students can save scores
	const canSaveScore = profile.role === 'student';

	if (!canSaveScore) {
		return {
			canSaveScore: false,
			gamesPlayed: 0,
			gamesWon: 0
		};
	}

	const { data: scoreData } = await supabase
		.from('mathemo_scores')
		.select('games_played, games_won')
		.eq('user_id', user.id)
		.maybeSingle();

	return {
		canSaveScore,
		gamesPlayed: scoreData?.games_played ?? 0,
		gamesWon: scoreData?.games_won ?? 0
	};
};
