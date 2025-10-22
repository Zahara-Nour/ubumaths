/**
 * API Route: /api/assessments/assigned
 * GET - Get assessments assigned to the current student
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStudentAssignments } from '$lib/server/assessments';

/**
 * GET /api/assessments/assigned
 * Get all assessments assigned to current student
 */
export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only students can access this
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'student') {
		throw error(403, 'Forbidden - Students only');
	}

	// Get assigned assessments
	const result = await getStudentAssignments(locals.supabase, user.id);

	if (result.error) {
		console.error('Failed to fetch assigned assessments:', result.error);
		throw error(500, 'Failed to fetch assigned assessments');
	}

	return json({ assignments: result.data });
};
