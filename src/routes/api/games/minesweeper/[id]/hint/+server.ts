import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * Type definition for use_hint RPC function return value
 *
 * Strategy D Update:
 * - Hint cost: 1.0 gidouille (was 10)
 * - Progressive penalties: 10/22/35% (gidouilles) vs 5/11/17% (items)
 */
interface UseHintResult {
	success: boolean;
	hints_used: number;
	hints_remaining: number;
	source: 'item' | 'gidouilles';
	item_consumed: boolean;
	gidouilles_spent: number; // Now 1.0 (decimal)
	remaining_gidouilles?: number; // Decimal value
	penalty_notice: string;
}

/**
 * Use Hint in Minesweeper Game
 * POST /api/games/minesweeper/[id]/hint
 *
 * Purchases and uses a hint for the current Minesweeper game using SECURITY DEFINER RPC function.
 * The RPC function handles:
 * - Verifying game ownership and status (must be in_progress)
 * - Checking hint limit (maximum 3 hints per game)
 * - Checking gidouilles balance (cost: 10 gidouilles per hint)
 * - Deducting gidouilles from student's balance
 * - Recording transaction in gidouilles_history
 * - Incrementing hints_used counter on game
 * - Atomic transaction (all operations succeed or fail together)
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates game_id is valid UUID
 * - RPC function is SECURITY DEFINER (bypasses RLS for transaction atomicity)
 * - RPC verifies ownership and game state server-side
 *
 * **Cost & Limits** (Strategy D):
 * - Cost: 1.0 gidouille per hint (or free if using inventory items)
 * - Maximum: 3 hints per game
 * - Progressive penalty (gidouilles hints): 10% / 22% / 35% for 1/2/3 hints
 * - Progressive penalty (item hints): 5% / 11% / 17% for 1/2/3 hints (half rate)
 *
 * **Priority**: First tries to consume "Indice Demineur" item from inventory,
 * then falls back to gidouilles if no items available.
 *
 * **Request**:
 * - No request body required (game ID is in URL params)
 *
 * **Response** (item used):
 * ```json
 * {
 *   "success": true,
 *   "hints_used": 1,
 *   "hints_remaining": 2,
 *   "source": "item",
 *   "item_consumed": true,
 *   "gidouilles_spent": 0,
 *   "penalty_notice": "No penalty - hint from inventory item"
 * }
 * ```
 *
 * **Response** (gidouilles used):
 * ```json
 * {
 *   "success": true,
 *   "hints_used": 1,
 *   "hints_remaining": 2,
 *   "source": "gidouilles",
 *   "item_consumed": false,
 *   "gidouilles_spent": 1.0,
 *   "remaining_gidouilles": 4.5,
 *   "penalty_notice": "Progressive penalty: -10/22/35% based on total hints..."
 * }
 * ```
 *
 * **Error Responses**:
 * - `400 Bad Request` - Maximum hints reached or insufficient gidouilles
 * - `404 Not Found` - Game not found or not in progress
 * - `500 Internal Server Error` - Database error
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	// ✅ SECURITY: Require student authentication
	await requireRole(locals, 'student');

	// ✅ SECURITY: Validate game ID parameter with Zod
	const gameIdSchema = z.string().uuid('ID de partie invalide');
	const validation = gameIdSchema.safeParse(params.id);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const gameId = validation.data;

	try {
		// ✅ SECURITY: Call SECURITY DEFINER RPC function
		// The function verifies ownership, checks limits, deducts gidouilles, and updates atomically
		const { data, error: rpcError } = await locals.supabase
			.rpc('use_hint', {
				p_game_id: gameId
			})
			.single();

		if (rpcError) {
			sanitizeRPCError(rpcError, 'use_hint');
		}

		if (!data) {
			throw error(500, "Aucune donnée retournée par la fonction d'indice");
		}

		// Type assertion for RPC return value
		const result = data as UseHintResult;

		// Return success response with hint usage details
		// Includes source field to indicate whether item or gidouilles was used
		return json({
			success: result.success,
			hints_used: result.hints_used,
			hints_remaining: result.hints_remaining,
			source: result.source,
			item_consumed: result.item_consumed,
			gidouilles_spent: result.gidouilles_spent,
			remaining_gidouilles: result.remaining_gidouilles,
			penalty_notice: result.penalty_notice
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_HINT');
	}
};
