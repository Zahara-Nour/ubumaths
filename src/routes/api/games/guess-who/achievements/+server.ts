/**
 * API Endpoint: Get Guess Who Achievements
 * Path: GET /api/games/guess-who/achievements
 *
 * Returns all achievements with unlock status for the current player.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import type {
	GuessWhoAchievementDisplay,
	AchievementCategory,
	AchievementRarity
} from '$lib/types/guess-who';

/**
 * GET /api/games/guess-who/achievements
 *
 * Get all achievements with player unlock status.
 *
 * **Response**:
 * ```json
 * {
 *   "achievements": [...],
 *   "unlockedCount": 5,
 *   "totalCount": 13,
 *   "totalPoints": 150
 * }
 * ```
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);

	// Get all achievement definitions
	const { data: allAchievements, error: achievementsError } = await locals.supabase
		.from('guess_who_achievements')
		.select('*')
		.order('sort_order');

	if (achievementsError) {
		console.error('Error fetching achievements:', achievementsError);
		return json({ achievements: [], unlockedCount: 0, totalCount: 0, totalPoints: 0 });
	}

	// Get player's unlocked achievements
	const { data: playerAchievements, error: playerError } = await locals.supabase
		.from('guess_who_player_achievements')
		.select('achievement_id, unlocked_at')
		.eq('player_id', user.id);

	if (playerError) {
		console.error('Error fetching player achievements:', playerError);
	}

	// Create a map of unlocked achievements
	const unlockedMap = new Map<string, string>();
	(playerAchievements || []).forEach((pa) => {
		unlockedMap.set(pa.achievement_id, pa.unlocked_at);
	});

	// Transform to display format
	const achievements: GuessWhoAchievementDisplay[] = (allAchievements || []).map((a) => ({
		id: a.id,
		nameFr: a.name_fr,
		nameEn: a.name_en,
		descriptionFr: a.description_fr,
		descriptionEn: a.description_en,
		icon: a.icon,
		category: a.category as AchievementCategory,
		points: a.points,
		rarity: a.rarity as AchievementRarity,
		sortOrder: a.sort_order,
		unlocked: unlockedMap.has(a.id),
		unlockedAt: unlockedMap.get(a.id) || null
	}));

	const unlockedCount = achievements.filter((a) => a.unlocked).length;
	const totalPoints = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.points, 0);

	return json({
		achievements,
		unlockedCount,
		totalCount: achievements.length,
		totalPoints
	});
};
