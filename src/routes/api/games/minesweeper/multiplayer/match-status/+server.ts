/**
 * API Endpoint: Check Match Status
 * GET - Check if a match was found while waiting in queue
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/games/minesweeper/multiplayer/match-status
 * Check if player is in an active match (for polling while in queue)
 *
 * Response (if in match):
 * {
 *   in_match: true,
 *   match_id: string,
 *   opponent_id: string,
 *   seed: string,
 *   difficulty: string,
 *   match_type: string,
 *   status: string,
 *   player_number: 1 | 2
 * }
 *
 * Response (if not in match):
 * {
 *   in_match: false
 * }
 */
export const GET: RequestHandler = async ({ locals }) => {
	await requireRole(locals, 'student');

	const { data, error: rpcError } = await locals.supabase.rpc('check_match_status');

	if (rpcError) {
		console.error('check_match_status RPC error:', rpcError);
		throw error(500, 'Erreur lors de la vérification du match');
	}

	return json(data);
};
