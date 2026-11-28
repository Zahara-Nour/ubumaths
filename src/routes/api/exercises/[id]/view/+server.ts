/**
 * API Route: /api/exercises/[id]/view
 *
 * POST - Track that a student viewed an exercise
 */

import type { RequestHandler } from './$types';
import { markExerciseAsViewed } from '#lib/server/exercise-assignments.ts';
import { validateViewExercise } from '#lib/server/validation/index.ts';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/exercises/[id]/view/+server');

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
		return Response.json({ error: `Données invalides : ${errorMsg}` }, { status: 400 });
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
		logger.error('Failed to track exercise view:', viewError);
		return Response.json({ error: 'Impossible d’enregistrer la consultation' }, { status: 500 });
	}

	return Response.json(completion);
};
