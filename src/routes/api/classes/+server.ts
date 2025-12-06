/**
 * API Route: /api/classes
 * GET - Fetch all classes for the authenticated teacher
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getTeacherClassesWithCounts } from '$lib/server/students';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/classes
 * Fetch all classes owned by the authenticated teacher
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Use the existing server function to get classes with counts
		const classes = await getTeacherClassesWithCounts(user.id, locals.supabase);

		return json({
			classes
		});
	} catch (err) {
		console.error('Error fetching teacher classes:', err);
		throw error(500, 'Erreur lors du chargement des classes');
	}
};
