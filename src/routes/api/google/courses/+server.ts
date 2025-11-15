/**
 * Google Classroom Courses Endpoint
 * ==================================
 *
 * Endpoint: GET /api/google/courses
 * Purpose: List synced Google Classroom courses for coursework sharing
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Query synced courses from database
 * 3. Return courses sorted by most recently updated
 *
 * Security:
 * - Teacher role required
 * - Only returns current teacher's courses
 * - No sensitive data in response
 *
 * Response:
 * {
 *   courses: Array<{
 *     id: string,                // UbuMaths course ID
 *     googleCourseId: string,    // Google Classroom course ID
 *     name: string,              // Course name
 *     section: string | null,    // Course section
 *     description: string | null, // Course description
 *     room: string | null,       // Room number
 *     courseState: string,       // ACTIVE, ARCHIVED, etc.
 *     alternateLink: string,     // Link to Google Classroom
 *     creationTime: string,      // ISO timestamp
 *     updateTime: string         // ISO timestamp
 *   }>
 * }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * List synced Google Classroom courses
 *
 * Security: Teacher role required
 *
 * Returns array of synced courses for current teacher, sorted by most recent update
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Only teachers can list courses
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Query synced courses from database
		const { data: courses, error: fetchError } = await locals.supabase
			.from('google_classroom_courses')
			.select(
				'id, google_course_id, name, section, description, room, course_state, alternate_link, creation_time, update_time'
			)
			.eq('teacher_id', user.id)
			.order('update_time', { ascending: false });

		if (fetchError) {
			console.error('[Google Courses] Database error:', fetchError);
			throw error(500, 'Failed to fetch Google Classroom courses');
		}

		// Transform to camelCase for response
		const transformedCourses = (courses || []).map((course) => ({
			id: course.id,
			googleCourseId: course.google_course_id,
			name: course.name,
			section: course.section,
			description: course.description,
			room: course.room,
			courseState: course.course_state,
			alternateLink: course.alternate_link,
			creationTime: course.creation_time,
			updateTime: course.update_time
		}));

		// Return transformed courses
		return json({
			courses: transformedCourses
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google Courses] Error fetching courses:', err);
		throw error(500, 'An error occurred while fetching courses');
	}
};
