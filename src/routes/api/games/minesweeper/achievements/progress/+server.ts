import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * Get achievement progress for current student
 * GET /api/games/minesweeper/achievements/progress
 *
 * Fetches all available achievements with their unlock status for the authenticated student.
 * Shows both locked and unlocked achievements, useful for displaying achievement badges
 * and progress tracking on the profile page.
 *
 * Uses the `minesweeper_student_achievement_progress` view which handles:
 * - Cross-joining all achievements with student
 * - Expanding difficulty-specific achievements (3 rows each)
 * - Showing unlock status for each achievement/difficulty combination
 *
 * **Security**:
 * - Requires authentication (students only)
 * - View uses security_invoker to respect RLS
 * - Returns only the authenticated student's progress
 *
 * **Response**:
 * ```json
 * {
 *   "achievements": [
 *     {
 *       "achievement_id": "first_victory",
 *       "name": "Premier pas",
 *       "description": "Remporte ta première victoire au Démineur",
 *       "icon": "🎯",
 *       "difficulty_specific": false,
 *       "difficulty": null,
 *       "is_unlocked": true,
 *       "unlocked_at": "2025-11-19T12:30:00Z",
 *       "game_id": "uuid"
 *     },
 *     {
 *       "achievement_id": "no_flags",
 *       "name": "Sans drapeaux",
 *       "description": "Gagne une partie sans placer aucun drapeau",
 *       "icon": "🚫",
 *       "difficulty_specific": true,
 *       "difficulty": "beginner",
 *       "is_unlocked": false,
 *       "unlocked_at": null,
 *       "game_id": null
 *     }
 *   ]
 * }
 * ```
 */
export const GET: RequestHandler = async ({ locals }) => {
	// ✅ SECURITY: Require student authentication
	const { user } = await requireRole(locals, 'student');

	try {
		// ✅ Query achievement progress view filtered by current student
		const { data: progress, error: fetchError } = await locals.supabase
			.from('minesweeper_student_achievement_progress')
			.select(
				`
				achievement_id,
				name,
				description,
				icon,
				difficulty_specific,
				difficulty,
				is_unlocked,
				unlocked_at,
				game_id
			`
			)
			.eq('student_id', user.id)
			.order('achievement_id', { ascending: true })
			.order('difficulty', { ascending: true, nullsFirst: true });

		if (fetchError) {
			sanitizePostgresError(fetchError, 'MINESWEEPER_ACHIEVEMENT_PROGRESS');
		}

		// Return all achievements with unlock status
		return json({
			achievements: progress || []
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_ACHIEVEMENT_PROGRESS');
	}
};
