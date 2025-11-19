/**
 * API endpoint for abandoning a multiplayer Minesweeper match
 * POST /api/games/minesweeper/multiplayer/[id]/abandon
 *
 * Handles forfeit, timeout, or disconnect scenarios
 * Awards win to opponent and updates stats
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { abandonMatchSchema } from '$lib/server/validation/minesweeper-multiplayer';

/**
 * Abandon a multiplayer match (forfeit/disconnect/timeout)
 *
 * @security Requires authentication (student role)
 * @security Only participants can abandon
 * @security Opponent automatically wins
 * @security ELO penalties applied (ranked matches)
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	await requireRole(locals, 'student');

	// Validate match ID format
	if (!params.id || !/^[0-9a-f-]{36}$/i.test(params.id)) {
		throw error(400, 'ID de match invalide');
	}

	// Validate request body (reason is optional with default)
	const validation = abandonMatchSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reason } = validation.data;

	// Call database function for abandonment handling
	const { data, error: rpcError } = await locals.supabase.rpc('abandon_multiplayer_match', {
		p_match_id: params.id,
		p_reason: reason
	});

	if (rpcError) {
		console.error('abandon_multiplayer_match error:', rpcError);

		// Handle specific error cases
		if (rpcError.message.includes('introuvable')) {
			throw error(404, 'Match introuvable');
		}
		if (rpcError.message.includes('ne participez pas')) {
			throw error(403, 'Vous ne participez pas à ce match');
		}
		if (rpcError.message.includes('ne peut pas être abandonné')) {
			throw error(409, 'Le match ne peut pas être abandonné');
		}

		// Generic error
		throw error(500, "Erreur lors de l'abandon du match");
	}

	return json(data);
};
