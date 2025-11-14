/**
 * Google Classroom Courses Endpoint
 * ==================================
 *
 * Endpoint: GET /api/google/courses
 * Purpose: List synced Google Classroom courses for linking to UbuMaths classes
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Query synced courses from database
 * 3. Return courses sorted by name
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
 *     google_course_id: string,  // Google Classroom course ID
 *     name: string,              // Course name
 *     section: string | null,    // Course section
 *     room: string | null,       // Room number
 *     course_state: string,      // ACTIVE, ARCHIVED, etc.
 *     enrollment_code: string | null,
 *     description_heading: string | null,
 *     last_synced_at: string,    // ISO timestamp
 *     created_at: string,        // ISO timestamp
 *     updated_at: string         // ISO timestamp
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
 * Returns array of synced courses for current teacher
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Only teachers can list courses
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Query synced courses from database
		const { data: courses, error: fetchError } = await locals.supabase
			.from('google_classroom_courses')
			.select('*')
			.eq('teacher_id', user.id)
			.order('name', { ascending: true });

		if (fetchError) {
			console.error('[Google Courses] Database error:', fetchError);
			throw error(500, 'Failed to fetch Google Classroom courses');
		}

		// Return courses (or empty array if none)
		return json({
			courses: courses || []
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
