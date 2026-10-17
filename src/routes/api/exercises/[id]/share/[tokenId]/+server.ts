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
import { revokeShareToken, SHARE_TOKEN_NOT_FOUND } from '$lib/server/exercise-share-tokens';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/exercises/[id]/share/[tokenId]/+server');

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
		throw error(404, 'Exercice introuvable');
	}

	if (exerciseResult.data.created_by !== user.id) {
		throw error(403, 'Seul l’auteur de l’exercice peut révoquer ses liens de partage');
	}

	// Revoke the token
	const revokeResult = await revokeShareToken(locals.supabase, tokenId, exerciseId);

	if (revokeResult.error) {
		if (revokeResult.error === SHARE_TOKEN_NOT_FOUND) {
			throw error(404, 'Lien de partage introuvable');
		}
		logger.error('Failed to revoke share token:', revokeResult.error);
		throw error(500, 'Impossible de révoquer le lien de partage');
	}

	return json({ success: true });
};
