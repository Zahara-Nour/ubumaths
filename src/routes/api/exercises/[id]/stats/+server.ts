/**
 * API Route: /api/exercises/[id]/stats
 *
 * GET - Get completion statistics for a specific exercise (teacher only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExerciseCompletionStats } from '$lib/server/exercise-assignments';
import { requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * GET /api/exercises/[id]/stats
 *
 * Get completion statistics for an exercise.
 * Shows total assigned, viewed, completed counts and completion rate.
 * Teacher only - must be creator of the exercise.
 *
 * @returns ExerciseCompletionStats object
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Verify teacher owns the exercise
	const { data: exercise } = await locals.supabase
		.from('exercises')
		.select('created_by')
		.eq('id', exerciseId)
		.single();

	if (!exercise) {
		return json({ error: 'Exercise not found' }, { status: 404 });
	}

	if (exercise.created_by !== user.id) {
		return json({ error: 'Not authorized to view statistics for this exercise' }, { status: 403 });
	}

	// Fetch statistics
	const { data: stats, error: statsError } = await getExerciseCompletionStats(
		locals.supabase,
		exerciseId
	);

	if (statsError) {
		console.error('Failed to fetch exercise statistics:', statsError);
		return json({ error: 'Failed to fetch statistics' }, { status: 500 });
	}

	return json(stats);
};
