/**
 * API Endpoint: Minesweeper Multiplayer Queue
 * POST - Join matchmaking queue
 * DELETE - Leave matchmaking queue
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { joinQueueSchema } from '$lib/server/validation/minesweeper-multiplayer';
import { requireRole } from '$lib/server/middleware/auth';

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
	const { user } = await requireRole(locals, 'student');

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
		console.error('join_multiplayer_queue RPC error:', {
			userId: user.id,
			difficulty,
			match_type,
			error: rpcError
		});

		// Handle specific errors with French messages
		if (rpcError.message.includes('Already in queue')) {
			throw error(409, "Vous êtes déjà dans la file d'attente");
		}
		if (rpcError.message.includes('Already in active match')) {
			throw error(409, 'Vous avez déjà un match en cours');
		}
		if (rpcError.message.includes('Invalid difficulty')) {
			throw error(400, 'Difficulté invalide');
		}
		if (rpcError.message.includes('Invalid match_type')) {
			throw error(400, 'Type de match invalide');
		}

		throw error(500, 'Erreur lors de la recherche de match');
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
	const { user } = await requireRole(locals, 'student');

	const { data, error: rpcError } = await locals.supabase.rpc('leave_multiplayer_queue');

	if (rpcError) {
		console.error('leave_multiplayer_queue RPC error:', {
			userId: user.id,
			error: rpcError
		});
		throw error(500, "Erreur lors de l'annulation");
	}

	return json(data);
};
