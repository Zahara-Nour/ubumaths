/**
 * API Endpoint: Game State Management for Multiplayer Minesweeper
 * Path: /api/games/minesweeper/multiplayer/[id]/state
 *
 * GET: Retrieve current match state (both players)
 * PATCH: Update player's game state (real-time sync)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/auth';
import { realtimeStateUpdateSchema } from '$lib/server/validation/minesweeper-multiplayer';

/**
 * GET /api/games/minesweeper/multiplayer/[id]/state
 * Retrieve complete match state for real-time synchronization
 *
 * Response includes:
 * - Match info (id, type, difficulty, seed, status)
 * - Player 1 state (id, name, cells_revealed, flags_used, time_elapsed)
 * - Player 2 state (id, name, cells_revealed, flags_used, time_elapsed)
 * - Your player number (1 or 2)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// ✅ SECURITY: Require student authentication
	await requireRole(locals, 'student');

	// Validate match ID parameter
	const matchId = params.id;
	if (!matchId) {
		throw error(400, 'Match ID requis');
	}

	// Call RPC function to get match state
	const { data, error: rpcError } = await locals.supabase.rpc('get_match_state', {
		p_match_id: matchId
	});

	if (rpcError) {
		console.error('get_match_state error:', rpcError);

		// Handle specific error cases
		if (rpcError.message.includes('not a participant')) {
			throw error(403, 'Vous ne participez pas à ce match');
		}

		throw error(500, "Erreur lors de la récupération de l'état du match");
	}

	return json(data);
};

/**
 * PATCH /api/games/minesweeper/multiplayer/[id]/state
 * Update player's game state during active match
 *
 * Request body (validated with Zod):
 * - cells_revealed: number (0-480)
 * - flags_used: number (0-99)
 * - time_elapsed: number (0-7200 seconds)
 * - last_action?: { type, row, col, timestamp } (optional)
 *
 * Security:
 * - Validates all input with Zod schema
 * - Verifies player is participant in match
 * - Checks match is in valid status (countdown/in_progress)
 */
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	// ✅ SECURITY: Require student authentication
	await requireRole(locals, 'student');

	// Validate match ID parameter
	const matchId = params.id;
	if (!matchId) {
		throw error(400, 'Match ID requis');
	}

	// ✅ SECURITY: Parse and validate request body with Zod
	const body = await request.json();
	const validation = realtimeStateUpdateSchema.safeParse(body);

	if (!validation.success) {
		console.error('Validation error:', validation.error.issues);
		throw error(400, validation.error.issues[0].message);
	}

	const { cells_revealed, flags_used, time_elapsed, last_action } = validation.data;

	// Call RPC function to update game state
	const { data, error: rpcError } = await locals.supabase.rpc('update_game_state', {
		p_match_id: matchId,
		p_cells_revealed: cells_revealed,
		p_flags_used: flags_used,
		p_time_elapsed: time_elapsed,
		p_last_action: last_action || null
	});

	if (rpcError) {
		console.error('update_game_state error:', rpcError);

		// Handle specific error cases
		if (rpcError.message.includes('not a participant')) {
			throw error(403, 'Vous ne participez pas à ce match');
		}
		if (rpcError.message.includes('not in progress')) {
			throw error(409, "Le match n'est pas en cours");
		}
		if (rpcError.message.includes('Invalid cells_revealed')) {
			throw error(400, 'Nombre de cellules révélées invalide');
		}
		if (rpcError.message.includes('Invalid flags_used')) {
			throw error(400, 'Nombre de drapeaux invalide');
		}
		if (rpcError.message.includes('Invalid time_elapsed')) {
			throw error(400, 'Temps écoulé invalide');
		}

		throw error(500, "Erreur lors de la mise à jour de l'état du jeu");
	}

	return json(data);
};
