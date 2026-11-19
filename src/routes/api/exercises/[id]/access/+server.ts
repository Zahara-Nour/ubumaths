/**
 * API Route: /api/exercises/[id]/access
 *
 * GET - Check if a student has access to a specific exercise
 */

import type { RequestHandler } from './$types';
import { studentHasAccess } from '#lib/server/exercise-assignments.ts';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';

/**
 * GET /api/exercises/[id]/access
 *
 * Check if the current student can access an exercise.
 * Returns true if student has direct assignment, class assignment,
 * public assignment, or exercise is marked as public.
 *
 * Students only.
 *
 * @returns { has_access: boolean }
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

	const exerciseId = validateUuidParam(params.id, 'exerciseId');

	// Check access
	const hasAccess = await studentHasAccess(locals.supabase, exerciseId, user.id);

	return Response.json({ has_access: hasAccess });
};
