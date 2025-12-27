/**
 * Tutor Remaining Quotas API
 *
 * GET: Get remaining quotas for current user and optional exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRemainingUsage } from '$lib/server/tutor/tutor-rate-limiter';
import { requireAuth } from '$lib/server/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
	exerciseId: z.string().uuid().optional()
});

/**
 * GET /api/tutor/remaining?exerciseId=X
 *
 * Returns the remaining quotas for the current user.
 * If exerciseId is provided, also returns remaining for that exercise.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication with proper session validation
	const { user } = await requireAuth(locals);

	// Parse and validate query parameters
	const exerciseIdParam = url.searchParams.get('exerciseId');

	const validation = querySchema.safeParse({
		exerciseId: exerciseIdParam ?? undefined
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { exerciseId } = validation.data;

	// Get remaining usage
	const remaining = await getRemainingUsage(user.id, exerciseId);

	return json({ remaining });
};
