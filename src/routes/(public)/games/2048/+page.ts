/**
 * 2048 Game - Client Load
 * =======================
 * Merges parent layout data with page server data.
 */
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, data }) => {
	const { user } = await parent();

	// Pass through server data (serverBestScore, canSaveScore, gamesPlayed)
	return {
		user,
		...data
	};
};
