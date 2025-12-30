import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';

/**
 * Zod schema for pagination parameters
 */
const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(10),
	offset: z.coerce.number().int().min(0).default(0)
});

/**
 * Get Campus leaderboard
 * GET /api/games/campus/leaderboard
 *
 * Returns the global leaderboard of Campus game scores.
 *
 * **Security**:
 * - Requires authentication
 * - Uses SECURITY DEFINER RPC function
 *
 * **Query Parameters**:
 * - `limit`: Number of entries to return (default: 10, max: 100)
 * - `offset`: Number of entries to skip (default: 0)
 *
 * **Response**:
 * ```json
 * {
 *   "entries": [
 *     {
 *       "id": "uuid",
 *       "student_id": "uuid",
 *       "username": "Player Name",
 *       "roll_count": 5,
 *       "total_points_used": 42,
 *       "score": 542,
 *       "completed_at": "timestamp",
 *       "rank": 1
 *     }
 *   ],
 *   "total": 100,
 *   "limit": 10,
 *   "offset": 0
 * }
 * ```
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Require authentication
	await requireRole(locals, 'student');

	// Parse and validate query parameters
	const params = {
		limit: url.searchParams.get('limit'),
		offset: url.searchParams.get('offset')
	};

	const validation = paginationSchema.safeParse(params);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { limit, offset } = validation.data;

	// Get leaderboard via RPC function
	const { data, error: rpcError } = await locals.supabase.rpc('get_campus_leaderboard', {
		p_limit: limit,
		p_offset: offset
	});

	if (rpcError) {
		sanitizeRPCError(rpcError, 'get_campus_leaderboard');
	}

	return json(data);
};
