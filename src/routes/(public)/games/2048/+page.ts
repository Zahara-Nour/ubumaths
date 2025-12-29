/**
 * Page load function for 2048 game
 * Currently minimal - prepared for future features like:
 * - Loading best score from database (if user is logged in)
 * - Loading game history/statistics
 * - Loading leaderboard data
 */
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { user } = await parent();

	// Future: Load best score from database if user is logged in
	// const bestScore = user ? await loadBestScore(user.id) : 0;

	return {
		user
		// bestScore
	};
};
