/**
 * API Route: /api/assessments/[id]/validate-attempt
 * POST - Validate if student can start a new attempt
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateAttempt } from '$lib/server/assessments';
import { uuidSchema } from '$lib/server/validation/common';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * POST /api/assessments/[id]/validate-attempt
 * Validate if student can attempt an assessment
 */
export const POST: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'student');

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid assignment ID format');
	}

	const assignmentId = idValidation.data;

	// Validate attempt
	const validation = await validateAttempt(locals.supabase, assignmentId, user.id);

	return json({ validation });
};
