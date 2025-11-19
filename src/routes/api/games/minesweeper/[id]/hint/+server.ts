import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Type definition for use_hint RPC function return value
 */
interface UseHintResult {
	success: boolean;
	hints_used: number;
	hints_remaining: number;
	gidouilles_spent: number;
	remaining_gidouilles: number;
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
 * **Cost & Limits**:
 * - Cost: 10 gidouilles per hint
 * - Maximum: 3 hints per game
 * - Penalty: Using hints applies 30% penalty to final reward
 *
 * **Request**:
 * - No request body required (game ID is in URL params)
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "hints_used": 1,
 *   "hints_remaining": 2,
 *   "gidouilles_spent": 10,
 *   "remaining_gidouilles": 90,
 *   "penalty_notice": "Using hints applies 30% penalty to final reward"
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
			console.error('RPC error using hint:', rpcError);

			// Handle specific RPC errors with appropriate HTTP status codes
			const errorMessage = rpcError.message?.toLowerCase() || '';

			// Game not found or not in correct state
			if (
				errorMessage.includes('not found') ||
				errorMessage.includes('not in progress') ||
				errorMessage.includes('game not found')
			) {
				throw error(404, 'Partie non trouvée ou déjà terminée');
			}

			// Maximum hints reached
			if (errorMessage.includes('maximum hints') || errorMessage.includes('hints reached')) {
				throw error(400, "Limite d'indices atteinte (3 maximum par partie)");
			}

			// Insufficient gidouilles
			if (errorMessage.includes('insufficient') || errorMessage.includes('gidouilles')) {
				throw error(400, 'Gidouilles insuffisantes (coût : 10 gidouilles par indice)');
			}

			// Generic RPC error
			throw error(500, "Erreur lors de l'utilisation de l'indice");
		}

		if (!data) {
			throw error(500, "Aucune donnée retournée par la fonction d'indice");
		}

		// Type assertion for RPC return value
		const result = data as UseHintResult;

		// Return success response with hint usage details
		return json({
			success: result.success,
			hints_used: result.hints_used,
			hints_remaining: result.hints_remaining,
			gidouilles_spent: result.gidouilles_spent,
			remaining_gidouilles: result.remaining_gidouilles,
			penalty_notice: result.penalty_notice
		});
	} catch (err) {
		// Re-throw SvelteKit errors (already formatted with proper status codes)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log unexpected errors
		console.error('Unexpected error in hint endpoint:', err);
		throw error(500, "Erreur serveur lors de l'utilisation de l'indice");
	}
};
