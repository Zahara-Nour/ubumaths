/**
 * Award Achievement API
 * =====================
 *
 * Endpoint: POST /api/achievements/award
 * Purpose: Manually award an achievement to a student (teacher only)
 *
 * Request Body:
 * ```json
 * {
 *   "studentId": "uuid",
 *   "achievementId": "social_helpful_peer",
 *   "reason": "Helped classmate understand quadratic equations"
 * }
 * ```
 *
 * Authorization:
 * - Teachers can award achievements to their students
 * - Admins can award achievements to any student
 *
 * Returns:
 * - success: true
 * - message: Success message
 * - Status 200: Success
 * - Status 400: Invalid request body
 * - Status 401: Not authenticated
 * - Status 403: Not authorized
 * - Status 500: Server error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { awardAchievementSchema } from '$lib/server/validation/achievements';
import { awardAchievement, AchievementServiceError } from '$lib/server/achievements/service';

export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;

	try {
		// Authentication: require teacher or admin
		const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

		// Validate request body
		const body = await request.json();
		const validation = awardAchievementSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { studentId, achievementId, reason } = validation.data;

		// Authorization: verify teacher teaches this student (admin bypass)
		const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);

		if (!hasAccess) {
			throw error(403, 'You can only award achievements to students you teach');
		}

		// Award the achievement
		const success = await awardAchievement(supabase, user.id, studentId, achievementId, reason);

		if (!success) {
			throw error(500, 'Failed to award achievement');
		}

		return json({
			success: true,
			message: 'Achievement awarded successfully'
		});
	} catch (err) {
		console.error('[API] Error awarding achievement:', err);

		if (err instanceof AchievementServiceError) {
			throw error(500, err.message);
		}

		// Re-throw SvelteKit errors (HttpError) to preserve status codes
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while awarding achievement');
	}
};
