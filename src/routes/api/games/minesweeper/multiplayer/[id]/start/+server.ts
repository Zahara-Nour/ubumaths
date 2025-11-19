/**
 * API Endpoint: Match Start for Multiplayer Minesweeper
 * Path: /api/games/minesweeper/multiplayer/[id]/start
 *
 * POST: Transition match from 'countdown' to 'in_progress'
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/auth';

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
	// ✅ SECURITY: Require student authentication
	await requireRole(locals, 'student');

	// Validate match ID parameter
	const matchId = params.id;
	if (!matchId) {
		throw error(400, 'Match ID requis');
	}

	// Call RPC function to start match
	const { data, error: rpcError } = await locals.supabase.rpc('start_match', {
		p_match_id: matchId
	});

	if (rpcError) {
		console.error('start_match error:', rpcError);

		// Handle specific error cases
		if (rpcError.message.includes('not a participant')) {
			throw error(403, 'Vous ne participez pas à ce match');
		}
		if (rpcError.message.includes('cannot be started')) {
			throw error(
				409,
				'Le match ne peut pas être démarré (doit être en phase de compte à rebours)'
			);
		}

		throw error(500, 'Erreur lors du démarrage du match');
	}

	return json(data);
};
