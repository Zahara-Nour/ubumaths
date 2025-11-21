/**
 * Achievement Progress API
 * =========================
 *
 * Endpoint: GET /api/achievements/student/[studentId]/progress/[achievementId]
 * Purpose: Get student's progress for a specific progressive achievement
 *
 * Path Parameters:
 * - studentId: UUID of the student
 * - achievementId: Achievement ID (e.g., 'questions_master_calculus')
 *
 * Authorization:
 * - Teachers can access their students' progress
 * - Students can access their own progress
 * - Admins can access all students' progress
 *
 * Returns:
 * - Progress record (current_value, target_value, progress_percentage, etc.)
 * - Status 200: Success
 * - Status 400: Invalid parameters
 * - Status 401: Not authenticated
 * - Status 403: Not authorized
 * - Status 404: Progress not found
 * - Status 500: Server error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { studentIdSchema, achievementIdSchema } from '$lib/server/validation/achievements';
import { getStudentProgress, AchievementServiceError } from '$lib/server/achievements/service';

export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;

	try {
		// Validate path parameters
		const paramsValidation = studentIdSchema.safeParse({
			studentId: params.studentId
		});
		if (!paramsValidation.success) {
			throw error(400, paramsValidation.error.issues[0].message);
		}

		const achievementValidation = achievementIdSchema.safeParse({
			achievementId: params.achievementId
		});
		if (!achievementValidation.success) {
			throw error(400, achievementValidation.error.issues[0].message);
		}

		const { studentId } = paramsValidation.data;
		const { achievementId } = achievementValidation.data;

		// Authentication: require user to be logged in
		const { user, profile } = await requireRole(locals, 'student');

		// Authorization: check if user can access this student's data
		if (profile.role === 'student') {
			// Students can only access their own progress
			if (user.id !== studentId) {
				throw error(403, 'You can only access your own progress');
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

		// Fetch progress
		const progress = await getStudentProgress(supabase, studentId, achievementId);

		if (!progress) {
			throw error(404, 'Progress not found for this achievement');
		}

		return json({
			success: true,
			progress
		});
	} catch (err) {
		console.error('[API] Error fetching achievement progress:', err);

		if (err instanceof AchievementServiceError) {
			throw error(500, err.message);
		}

		// Re-throw SvelteKit errors (HttpError) to preserve status codes
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while fetching achievement progress');
	}
};
