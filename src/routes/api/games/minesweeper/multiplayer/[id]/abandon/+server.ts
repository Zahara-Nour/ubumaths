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
import { sanitizeRPCError } from '$lib/server/utils/error-handler';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * Abandon a multiplayer match (forfeit/disconnect/timeout)
 *
 * @security Requires authentication (student role)
 * @security Only participants can abandon
 * @security Opponent automatically wins
 * @security ELO penalties applied (ranked matches)
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	const id = validateUuidParam(params.id);
	await requireRole(locals, 'student');

	// Validate request body (reason is optional with default)
	const validation = abandonMatchSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reason } = validation.data;

	// Call database function for abandonment handling
	const { data, error: rpcError } = await locals.supabase.rpc('abandon_multiplayer_match', {
		p_match_id: id,
		p_reason: reason
	});

	if (rpcError) {
		sanitizeRPCError(rpcError, 'abandon_multiplayer_match');
	}

	return json(data);
};
