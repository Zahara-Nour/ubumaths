/**
 * API Endpoint: Minesweeper Multiplayer Queue
 * POST - Join matchmaking queue
 * DELETE - Leave matchmaking queue
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { joinQueueSchema } from '$lib/server/validation/minesweeper-multiplayer';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';

/**
 * POST /api/games/minesweeper/multiplayer/queue
 * Join the matchmaking queue for multiplayer Minesweeper
 *
 * Request body:
 * - difficulty: 'beginner' | 'intermediate' | 'expert'
 * - match_type: 'quick' | 'ranked' (default: 'quick')
 *
 * Response (if matched immediately):
 * {
 *   matched: true,
 *   match_id: string,
 *   opponent_id: string,
 *   seed: string,
 *   difficulty: string,
 *   match_type: string,
 *   player_number: 1 | 2
 * }
 *
 * Response (if waiting in queue):
 * {
 *   matched: false,
 *   waiting: true,
 *   difficulty: string,
 *   match_type: string,
 *   rank: number
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRole(locals, 'student');

	// Validate request body
	const body = await request.json();
	const validation = joinQueueSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { difficulty, match_type } = validation.data;

	// Call RPC function
	const { data, error: rpcError } = await locals.supabase.rpc('join_multiplayer_queue', {
		p_difficulty: difficulty,
		p_match_type: match_type
	});

	if (rpcError) {
		sanitizeRPCError(rpcError, 'join_multiplayer_queue');
	}

	return json(data);
};

/**
 * DELETE /api/games/minesweeper/multiplayer/queue
 * Leave the matchmaking queue
 *
 * Response:
 * {
 *   success: true,
 *   removed: boolean
 * }
 */
export const DELETE: RequestHandler = async ({ locals }) => {
	await requireRole(locals, 'student');

	const { data, error: rpcError } = await locals.supabase.rpc('leave_multiplayer_queue');

	if (rpcError) {
		sanitizeRPCError(rpcError, 'leave_multiplayer_queue');
	}

	return json(data);
};
