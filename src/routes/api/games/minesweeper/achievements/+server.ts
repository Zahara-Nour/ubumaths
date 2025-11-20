import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * Get student's unlocked Minesweeper achievements
 * GET /api/games/minesweeper/achievements
 *
 * Fetches all achievements unlocked by the authenticated student, ordered by most recent first.
 * Returns detailed achievement information including unlock timestamp and associated game.
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Returns only the authenticated student's achievements
 * - RLS policies ensure data isolation
 *
 * **Response**:
 * ```json
 * {
 *   "achievements": [
 *     {
 *       "id": "uuid",
 *       "achievement_id": "first_victory",
 *       "name": "Premier pas",
 *       "description": "Remporte ta première victoire au Démineur",
 *       "icon": "🎯",
 *       "difficulty": null,
 *       "unlocked_at": "2025-11-19T12:30:00Z",
 *       "game_id": "uuid"
 *     }
 *   ],
 *   "stats": {
 *     "total_unlocked": 3,
 *     "total_possible": 10,
 *     "progress_percentage": 30
 *   }
 * }
 * ```
 */
export const GET: RequestHandler = async ({ locals }) => {
	// ✅ SECURITY: Require student authentication
	const { user } = await requireRole(locals, 'student');

	try {
		// ✅ Fetch student's unlocked achievements with full details
		const { data: achievements, error: fetchError } = await locals.supabase
			.from('minesweeper_student_achievements')
			.select(
				`
				id,
				achievement_id,
				difficulty,
				unlocked_at,
				game_id,
				minesweeper_achievements (
					name,
					description,
					icon
				)
			`
			)
			.eq('student_id', user.id)
			.order('unlocked_at', { ascending: false });

		if (fetchError) {
			sanitizePostgresError(fetchError, 'MINESWEEPER_ACHIEVEMENTS');
		}

		// Transform nested structure to flat format
		const flattenedAchievements = (achievements || []).map((item) => {
			const achievementData = Array.isArray(item.minesweeper_achievements)
				? item.minesweeper_achievements[0]
				: item.minesweeper_achievements;

			return {
				id: item.id,
				achievement_id: item.achievement_id,
				name: achievementData?.name || 'Unknown',
				description: achievementData?.description || '',
				icon: achievementData?.icon || '❓',
				difficulty: item.difficulty,
				unlocked_at: item.unlocked_at,
				game_id: item.game_id
			};
		});

		// Calculate total possible achievements
		// 1 first_victory (global) + 3 difficulty-specific × 3 difficulties = 10 max
		const totalPossible = 10;
		const totalUnlocked = flattenedAchievements.length;
		const progressPercentage = Math.round((totalUnlocked / totalPossible) * 100);

		return json({
			achievements: flattenedAchievements,
			stats: {
				total_unlocked: totalUnlocked,
				total_possible: totalPossible,
				progress_percentage: progressPercentage
			}
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_ACHIEVEMENTS');
	}
};
