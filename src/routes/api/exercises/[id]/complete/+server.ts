/**
 * API Route: /api/exercises/[id]/complete
 *
 * POST - Mark an exercise as completed (student)
 * DELETE - Mark an exercise as incomplete/unmark (student)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markExerciseAsComplete, markExerciseAsIncomplete } from '$lib/server/exercise-assignments';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * POST /api/exercises/[id]/complete
 *
 * Mark an exercise as completed by the current student.
 * Sets completed_at timestamp and updates view tracking.
 *
 * @returns Completion record with completed_at set
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

	const exerciseId = params.id;

	// Mark exercise as complete
	const { data: completion, error: completeError } = await markExerciseAsComplete(
		locals.supabase,
		exerciseId,
		user.id
	);

	if (completeError) {
		console.error('Failed to mark exercise as complete:', completeError);
		return json({ error: 'Failed to mark as complete' }, { status: 500 });
	}

	return json(completion);
};

/**
 * DELETE /api/exercises/[id]/complete
 *
 * Unmark an exercise as completed (student changed their mind).
 * Sets completed_at back to null while preserving view history.
 *
 * @returns Completion record with completed_at=null
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

	const exerciseId = params.id;

	// Unmark exercise as complete
	const { data: completion, error: incompleteError } = await markExerciseAsIncomplete(
		locals.supabase,
		exerciseId,
		user.id
	);

	if (incompleteError) {
		console.error('Failed to mark exercise as incomplete:', incompleteError);
		return json({ error: 'Failed to unmark as complete' }, { status: 500 });
	}

	return json(completion);
};
