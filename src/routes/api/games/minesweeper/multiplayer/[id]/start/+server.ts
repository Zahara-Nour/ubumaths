/**
 * API Endpoint: Match Start for Multiplayer Minesweeper
 * Path: /api/games/minesweeper/multiplayer/[id]/start
 *
 * POST: Transition match from 'countdown' to 'in_progress'
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * POST /api/games/minesweeper/multiplayer/[id]/start
 * Start a match (transition from countdown to in_progress)
 *
 * This endpoint is called when the countdown timer reaches zero.
 * Both players should call this endpoint simultaneously to mark
 * the match as started.
 *
 * Security:
 * - Verifies player is participant in match
 * - Validates match is in 'countdown' status
 * - Sets started_at timestamp
 *
 * Response:
 * - success: boolean
 * - match_id: UUID
 * - status: "in_progress"
 * - started_at: timestamp
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const matchId = validateUuidParam(params.id);
	// ✅ SECURITY: Require student authentication
	await requireRole(locals, 'student');

	// Call RPC function to start match
	const { data, error: rpcError } = await locals.supabase.rpc('start_match', {
		p_match_id: matchId
	});

	if (rpcError) {
		sanitizeRPCError(rpcError, 'start_match');
	}

	return json(data);
};
