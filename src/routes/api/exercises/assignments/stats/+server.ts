/**
 * API Route: /api/exercises/assignments/stats
 *
 * GET - Get aggregate assignment statistics for a teacher
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssignmentStats } from '$lib/server/exercise-assignments';

/**
 * GET /api/exercises/assignments/stats
 *
 * Get overall assignment statistics for the current teacher.
 * Returns counts for total, active, and categorized assignments.
 * Teacher only.
 *
 * @returns AssignmentStats object
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Check if user is a teacher
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		return json({ error: 'Forbidden - Teachers only' }, { status: 403 });
	}

	// Fetch statistics
	const { data: stats, error: statsError } = await getAssignmentStats(locals.supabase, user.id);

	if (statsError) {
		console.error('Failed to fetch assignment statistics:', statsError);
		return json({ error: 'Failed to fetch statistics' }, { status: 500 });
	}

	return json(stats);
};
