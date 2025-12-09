/**
 * API endpoint for completing a multiplayer Minesweeper match
 * POST /api/games/minesweeper/multiplayer/[id]/complete
 *
 * Validates win condition server-side, distributes rewards, updates ELO
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { completeMatchSchema } from '$lib/server/validation/minesweeper-multiplayer';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * Complete a multiplayer match with server-side win validation
 *
 * @security Requires authentication (student role)
 * @security Validates grid state matches win conditions
 * @security Prevents double completion
 * @security Calculates rewards and ELO server-side only
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	const id = validateUuidParam(params.id);
	await requireRole(locals, 'student');

	// Validate request body
	const validation = completeMatchSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { time_seconds, grid_state } = validation.data;

	// Call database function for server-side validation and completion
	const { data, error: rpcError } = await locals.supabase.rpc('complete_multiplayer_match', {
		p_match_id: id,
		p_time_seconds: time_seconds,
		p_grid_state: grid_state
	});

	if (rpcError) {
		sanitizeRPCError(rpcError, 'complete_multiplayer_match');
	}

	return json(data);
};
