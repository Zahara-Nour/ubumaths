/**
 * API Route: /api/exercises/[id]/access
 *
 * GET - Check if a student has access to a specific exercise
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { studentHasAccess } from '$lib/server/exercise-assignments';

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
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;
	const exerciseId = params.id;

	// Check access
	const hasAccess = await studentHasAccess(locals.supabase, exerciseId, user.id);

	return json({ has_access: hasAccess });
};
