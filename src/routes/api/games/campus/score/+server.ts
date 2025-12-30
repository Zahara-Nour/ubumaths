import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';

/**
 * Zod schema for score submission
 */
const submitScoreSchema = z.object({
	rollCount: z.number().int().min(1).max(1000),
	totalPointsUsed: z.number().int().min(0).max(10000)
});

/**
 * Submit a completed Campus game score
 * POST /api/games/campus/score
 *
 * Records the player's score to the leaderboard.
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates inputs with Zod
 * - Uses SECURITY DEFINER RPC function
 *
 * **Request Body**:
 * ```json
 * {
 *   "rollCount": 5,
 *   "totalPointsUsed": 42
 * }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "game_id": "uuid",
 *   "score": 542,
 *   "rank": 12
 * }
 * ```
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require student authentication
	await requireRole(locals, 'student');

	// Validate input with Zod
	const body = await request.json();
	const validation = submitScoreSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { rollCount, totalPointsUsed } = validation.data;

	// Submit score via RPC function
	const { data, error: rpcError } = await locals.supabase.rpc('submit_campus_score', {
		p_roll_count: rollCount,
		p_total_points_used: totalPointsUsed
	});

	if (rpcError) {
		sanitizeRPCError(rpcError, 'submit_campus_score');
	}

	return json(data);
};
