/**
 * Student Achievements API
 * =========================
 *
 * Endpoint: GET /api/achievements/student/[studentId]?context=minesweeper
 * Purpose: Get all achievements unlocked by a specific student
 *
 * Path Parameters:
 * - studentId: UUID of the student
 *
 * Query Parameters:
 * - context (optional): Achievement context to filter by
 *
 * Authorization:
 * - Teachers can access their students' achievements
 * - Students can access their own achievements
 * - Admins can access all students' achievements
 *
 * Returns:
 * - Array of student achievement records
 * - Status 200: Success
 * - Status 400: Invalid parameters
 * - Status 401: Not authenticated
 * - Status 403: Not authorized
 * - Status 500: Server error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { studentIdSchema, achievementContextSchema } from '$lib/server/validation/achievements';
import { getStudentAchievements, AchievementServiceError } from '$lib/server/achievements/service';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const supabase = locals.supabase;

	try {
		// Validate path parameters
		const paramsValidation = studentIdSchema.safeParse(params);
		if (!paramsValidation.success) {
			throw error(400, paramsValidation.error.issues[0].message);
		}

		const { studentId } = paramsValidation.data;

		// Validate query parameters
		const context = url.searchParams.get('context');
		const queryValidation = achievementContextSchema.safeParse({
			context: context || undefined
		});

		if (!queryValidation.success) {
			throw error(400, queryValidation.error.issues[0].message);
		}

		const { context: validatedContext } = queryValidation.data;

		// Authentication: require user to be logged in
		const { user, profile } = await requireRole(locals, 'student');

		// Authorization: check if user can access this student's data
		if (profile.role === 'student') {
			// Students can only access their own achievements
			if (user.id !== studentId) {
				throw error(403, 'You can only access your own achievements');
			}
		} else if (profile.role === 'teacher' || profile.role === 'admin') {
			// Teachers can access their students, admins can access all
			const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);

			if (!hasAccess) {
				throw error(403, 'You can only access students you teach');
			}
		} else {
			// Unknown role
			throw error(403, 'Not authorized');
		}

		// Fetch student achievements
		const achievements = await getStudentAchievements(supabase, studentId, validatedContext);

		return json({
			success: true,
			achievements,
			count: achievements.length
		});
	} catch (err) {
		console.error('[API] Error fetching student achievements:', err);

		if (err instanceof AchievementServiceError) {
			throw error(500, err.message);
		}

		// Re-throw SvelteKit errors (HttpError) to preserve status codes
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while fetching student achievements');
	}
};
