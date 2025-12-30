import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';

/**
 * Get current user's Campus game statistics
 * GET /api/games/campus/stats
 *
 * Returns the user's best score, games played, and rank.
 *
 * **Security**:
 * - Requires authentication
 * - Uses SECURITY DEFINER RPC function
 *
 * **Response**:
 * ```json
 * {
 *   "authenticated": true,
 *   "best_score": 542,
 *   "games_played": 15,
 *   "best_rank": 12
 * }
 * ```
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Require authentication
	await requireRole(locals, 'student');

	// Get user stats via RPC function
	const { data, error: rpcError } = await locals.supabase.rpc('get_campus_user_stats');

	if (rpcError) {
		sanitizeRPCError(rpcError, 'get_campus_user_stats');
	}

	return json(data);
};
