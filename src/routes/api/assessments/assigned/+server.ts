/**
 * API Route: /api/assessments/assigned
 * GET - Get assessments assigned to the current student
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStudentAssignments } from '$lib/server/assessments';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/assessments/assigned
 * Get all assessments assigned to current student
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	// Get assigned assessments
	const result = await getStudentAssignments(locals.supabase, user.id);

	if (result.error) {
		console.error('Failed to fetch assigned assessments:', result.error);
		throw error(500, 'Failed to fetch assigned assessments');
	}

	return json({ assignments: result.data });
};
