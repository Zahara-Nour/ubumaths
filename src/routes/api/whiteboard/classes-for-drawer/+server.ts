/**
 * Classes for FileDrawer Endpoint
 * ================================
 *
 * Endpoint: GET /api/whiteboard/classes-for-drawer
 * Purpose: List teacher's active classes for the FileDrawer folder organization
 *
 * Used by FileDrawer to:
 * - Populate the class selector dropdown
 * - Enable auto-detection of current class based on schedule
 * - Organize Drive files by class folders
 *
 * Differences from classes-with-course:
 * - Returns ALL active classes (not just those with Google Classroom)
 * - Designed for Drive folder organization
 *
 * Security:
 * - Teacher role required
 * - Only returns classes owned by the teacher
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Get classes for FileDrawer
 *
 * Returns classes that:
 * - Belong to the current teacher
 * - Are active
 * - Include schedules for auto-detection
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Fetch all active classes with schedules
		const { data: classes, error: classesError } = await locals.supabase
			.from('classes')
			.select(
				`
				id,
				name,
				join_code,
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
			.order('name');

		if (classesError) {
			console.error('[Classes for Drawer] Query error:', classesError);
			throw error(500, 'Erreur lors de la récupération des classes');
		}

		// Transform to expected format
		const classesForDrawer = (classes || []).map((cls) => ({
			id: cls.id,
			name: cls.name,
			join_code: cls.join_code,
			schedules: cls.class_schedules || []
		}));

		return json({ classes: classesForDrawer });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Classes for Drawer] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};
