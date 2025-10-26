/**
 * API Route: /api/exercises/[id]/view
 *
 * POST - Track that a student viewed an exercise
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markExerciseAsViewed } from '$lib/server/exercise-assignments';

/**
 * POST /api/exercises/[id]/view
 *
 * Mark that a student viewed an exercise.
 * Creates or updates completion tracking record.
 * Increments view count and updates last_viewed_at.
 *
 * @body { assignment_id?: string }
 * @returns Completion record with updated view data
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;
	const exerciseId = params.id;

	// Parse optional assignment_id from body
	const body = await request.json().catch(() => ({}));
	const assignmentId = body.assignment_id;

	// Track view
	const { data: completion, error: viewError } = await markExerciseAsViewed(
		locals.supabase,
		exerciseId,
		user.id,
		assignmentId
	);

	if (viewError) {
		console.error('Failed to track exercise view:', viewError);
		return json({ error: 'Failed to track view' }, { status: 500 });
	}

	return json(completion);
};
