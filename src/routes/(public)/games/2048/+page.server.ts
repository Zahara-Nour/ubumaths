/**
 * 2048 Game - Server Load
 * =======================
 * Loads the user's best score from the database if authenticated.
 * Also checks if the user can save scores (must be a student).
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Not authenticated - return defaults
	if (!user || !profile) {
		return {
			serverBestScore: null,
			canSaveScore: false,
			gamesPlayed: 0
		};
	}

	// Only students can save scores
	const canSaveScore = profile.role === 'student';

	if (!canSaveScore) {
		return {
			serverBestScore: null,
			canSaveScore: false,
			gamesPlayed: 0
		};
	}

	// Fetch user's best score for classic mode
	const { data: scoreData } = await supabase
		.from('game_2048_scores')
		.select('best_score, games_played')
		.eq('user_id', user.id)
		.eq('mode', 'classic')
		.maybeSingle();

	return {
		serverBestScore: scoreData?.best_score ?? null,
		canSaveScore,
		gamesPlayed: scoreData?.games_played ?? 0
	};
};
