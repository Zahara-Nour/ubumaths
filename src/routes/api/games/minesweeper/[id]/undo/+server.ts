import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * Type definition for use_minesweeper_undo RPC function return value
 */
interface UseUndoResult {
	success: boolean;
	error?: string;
	message?: string;
}

/**
 * Request body schema for undo endpoint
 */
const undoRequestSchema = z.object({
	grid_state: z.object({
		rows: z.number().int().min(1).max(100),
		cols: z.number().int().min(1).max(100),
		mines: z.array(z.tuple([z.number(), z.number()])),
		revealed: z.array(z.tuple([z.number(), z.number()])),
		flagged: z.array(z.tuple([z.number(), z.number()])),
		adjacentCounts: z.record(z.string(), z.number())
	})
});

/**
 * Use Undo (Seconde Chance) in Minesweeper Game
 * POST /api/games/minesweeper/[id]/undo
 *
 * Uses the "Seconde Chance" item to undo a fatal bomb reveal.
 * The RPC function handles:
 * - Verifying game ownership and status (must be in_progress)
 * - Checking undo hasn't been used already in this game (max 1 per game)
 * - Consuming the undo item from inventory
 * - Updating the game state with the reverted grid
 * - Atomic transaction (all operations succeed or fail together)
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates game_id is valid UUID
 * - Validates grid_state structure
 * - RPC function is SECURITY DEFINER (bypasses RLS for transaction atomicity)
 * - RPC verifies ownership and game state server-side
 *
 * **Limits**:
 * - Maximum 1 undo per game (regardless of how many items owned)
 * - Requires "Seconde Chance" (minesweeper_undo) item in inventory
 *
 * **Request**:
 * ```json
 * {
 *   "grid_state": {
 *     "rows": 9,
 *     "cols": 9,
 *     "mines": [[0,0], [1,2], ...],
 *     "revealed": [[2,3], [4,5], ...],
 *     "flagged": [[0,0]],
 *     "adjacentCounts": {"2,3": 1, "4,5": 2}
 *   }
 * }
 * ```
 *
 * **Response** (success):
 * ```json
 * {
 *   "success": true,
 *   "message": "Seconde Chance utilisée avec succès"
 * }
 * ```
 *
 * **Error Responses**:
 * - `400 Bad Request` - Invalid request, undo already used, or no items available
 * - `404 Not Found` - Game not found or not in progress
 * - `500 Internal Server Error` - Database error
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Require student authentication
	await requireRole(locals, 'student');

	// Validate game ID parameter with Zod
	const gameIdSchema = z.string().uuid('ID de partie invalide');
	const idValidation = gameIdSchema.safeParse(params.id);

	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const gameId = idValidation.data;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const bodyValidation = undoRequestSchema.safeParse(body);
	if (!bodyValidation.success) {
		throw error(400, bodyValidation.error.issues[0].message);
	}

	const { grid_state } = bodyValidation.data;

	try {
		// Call SECURITY DEFINER RPC function
		// The function verifies ownership, checks undo hasn't been used, consumes item, and updates game
		const { data, error: rpcError } = await locals.supabase
			.rpc('use_minesweeper_undo', {
				p_game_id: gameId,
				p_grid_state: grid_state as unknown as Record<string, unknown>
			})
			.single();

		if (rpcError) {
			sanitizeRPCError(rpcError, 'use_minesweeper_undo');
		}

		if (!data) {
			throw error(500, 'Aucune donnée retournée par la fonction');
		}

		// Type assertion for RPC return value
		const result = data as UseUndoResult;

		if (!result.success) {
			// RPC returned an error in its response
			throw error(400, result.error || 'Échec de la Seconde Chance');
		}

		// Return success response
		return json({
			success: true,
			message: result.message || 'Seconde Chance utilisée avec succès'
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_UNDO');
	}
};
