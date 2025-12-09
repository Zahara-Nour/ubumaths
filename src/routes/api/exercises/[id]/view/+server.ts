/**
 * API Route: /api/exercises/[id]/view
 *
 * POST - Track that a student viewed an exercise
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markExerciseAsViewed } from '$lib/server/exercise-assignments';
import { validateViewExercise } from '$lib/server/validation';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

type ZodIssue = { path: (string | number)[]; message: string };

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
	const exerciseId = validateUuidParam(params.id);
	const { user } = await requireAuth(locals);

	// Parse and validate optional assignment_id from body
	const body = await request.json().catch(() => ({}));
	const validation = validateViewExercise(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		return json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
	}

	const assignmentId = validation.data.assignment_id;

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
