/**
 * API Route: /api/exercises/[id]/share
 *
 * Manage share tokens for private exercises.
 * Allows teachers to create shareable links for their exercises.
 *
 * POST - Create a new share token
 * GET - List all tokens for this exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getExercise } from '$lib/server/exercises';
import {
	createShareToken,
	getExerciseShareTokens,
	buildShareUrl
} from '$lib/server/exercise-share-tokens';
import { validateCreateShareToken } from '$lib/server/validation/exercises';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/exercises/[id]/share/+server');

/**
 * POST /api/exercises/[id]/share
 * Create a new share token for this exercise
 *
 * Request body:
 * - expires_in_days?: number (1-365, optional)
 *
 * Returns:
 * - token: ShareToken object
 * - share_url: Full shareable URL
 */
export const POST: RequestHandler = async ({ locals, params, request, url }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Verify exercise exists and belongs to user
	const exerciseResult = await getExercise(locals.supabase, exerciseId);
	if (exerciseResult.error || !exerciseResult.data) {
		throw error(404, 'Exercice introuvable');
	}

	if (exerciseResult.data.created_by !== user.id) {
		throw error(403, 'Seul l’auteur de l’exercice peut créer un lien de partage');
	}

	// Parse and validate request body
	let body: { expires_in_days?: number | null } = {};
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = validateCreateShareToken(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	// Create share token
	const tokenResult = await createShareToken(
		locals.supabase,
		exerciseId,
		user.id,
		validation.data.expires_in_days
	);

	if (tokenResult.error || !tokenResult.data) {
		logger.error('Failed to create share token:', tokenResult.error);
		throw error(500, 'Impossible de créer le lien de partage');
	}

	// Build shareable URL
	const slug = exerciseResult.data.slug || exerciseId;
	const baseUrl = url.origin;
	const shareUrl = buildShareUrl(baseUrl, slug, tokenResult.data.token);

	return json(
		{
			token: tokenResult.data,
			share_url: shareUrl
		},
		{ status: 201 }
	);
};

/**
 * GET /api/exercises/[id]/share
 * List all share tokens for this exercise
 *
 * Returns:
 * - tokens: Array of ShareToken objects
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Verify exercise exists and belongs to user
	const exerciseResult = await getExercise(locals.supabase, exerciseId);
	if (exerciseResult.error || !exerciseResult.data) {
		throw error(404, 'Exercice introuvable');
	}

	if (exerciseResult.data.created_by !== user.id) {
		throw error(403, 'Seul l’auteur de l’exercice peut voir ses liens de partage');
	}

	// Get tokens
	const tokensResult = await getExerciseShareTokens(locals.supabase, exerciseId);

	if (tokensResult.error) {
		logger.error('Failed to fetch share tokens:', tokensResult.error);
		throw error(500, 'Impossible de charger les liens de partage');
	}

	return json({
		tokens: tokensResult.data
	});
};
