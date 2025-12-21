/**
 * API Route: /api/exercises/[id]/share/[tokenId]
 *
 * Manage individual share tokens.
 *
 * DELETE - Revoke a share token
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getExercise } from '$lib/server/exercises';
import { revokeShareToken } from '$lib/server/exercise-share-tokens';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * DELETE /api/exercises/[id]/share/[tokenId]
 * Revoke a share token (sets is_active=false)
 *
 * Returns:
 * - success: true
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const exerciseId = validateUuidParam(params.id);
	const tokenId = validateUuidParam(params.tokenId);
	const { user } = await requireRole(locals, 'teacher');

	// Verify exercise exists and belongs to user
	const exerciseResult = await getExercise(locals.supabase, exerciseId);
	if (exerciseResult.error || !exerciseResult.data) {
		throw error(404, 'Exercise not found');
	}

	if (exerciseResult.data.created_by !== user.id) {
		throw error(403, 'You can only revoke share tokens for your own exercises');
	}

	// Revoke the token
	const revokeResult = await revokeShareToken(locals.supabase, tokenId, user.id);

	if (revokeResult.error) {
		if (revokeResult.error === 'Token not found') {
			throw error(404, 'Token not found');
		}
		console.error('Failed to revoke share token:', revokeResult.error);
		throw error(500, 'Failed to revoke share token');
	}

	return json({ success: true });
};
