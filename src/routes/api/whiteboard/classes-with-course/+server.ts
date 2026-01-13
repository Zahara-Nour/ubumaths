/**
 * Classes with Google Classroom Course Endpoint
 * ==============================================
 *
 * Endpoint: GET /api/whiteboard/classes-with-course
 * Purpose: List teacher's classes that have an associated Google Classroom course
 *
 * Used by ExportToClassroomDialog to:
 * - Populate the class selector dropdown
 * - Enable auto-detection of current class based on schedule
 *
 * Security:
 * - Teacher role required
 * - Only returns classes owned by the teacher
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Get classes with Google Classroom course associations
 *
 * Returns classes that:
 * - Belong to the current teacher
 * - Have a google_classroom_course_id set (not null)
 * - Include schedules for auto-detection
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Fetch classes with course association and schedules
		const { data: classes, error: classesError } = await locals.supabase
			.from('classes')
			.select(
				`
				id,
				name,
				join_code,
				google_classroom_course_id,
				class_schedules (
					id,
					day_of_week,
					start_time,
					end_time,
					period_number,
					subject,
					room
				)
			`
			)
			.eq('teacher_id', user.id)
			.eq('is_active', true)
			.not('google_classroom_course_id', 'is', null)
			.order('name');

		if (classesError) {
			console.error('[Classes with Course] Query error:', classesError);
			throw error(500, 'Erreur lors de la récupération des classes');
		}

		// Transform to expected format
		const classesWithCourse = (classes || []).map((cls) => ({
			id: cls.id,
			name: cls.name,
			join_code: cls.join_code,
			google_classroom_course_id: cls.google_classroom_course_id,
			schedules: cls.class_schedules || []
		}));

		return json({ classes: classesWithCourse });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Classes with Course] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};
