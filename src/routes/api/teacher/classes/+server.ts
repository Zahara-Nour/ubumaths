import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTeacherClassesWithCounts } from '$lib/server/students';

/**
 * GET /api/teacher/classes
 *
 * Returns all classes for the authenticated teacher with student counts
 *
 * Security: Teacher role required
 *
 * Response:
 * {
 *   classes: ClassWithData[],
 *   timestamp: number
 * }
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Security: Only teachers can access
	if (!user || !profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden: Teacher role required');
	}

	try {
		const classes = await getTeacherClassesWithCounts(user.id, supabase);

		return json({
			classes,
			timestamp: Date.now()
		});
	} catch (err) {
		console.error('[API] Error loading teacher classes:', err);
		throw error(500, 'Failed to load classes');
	}
};
