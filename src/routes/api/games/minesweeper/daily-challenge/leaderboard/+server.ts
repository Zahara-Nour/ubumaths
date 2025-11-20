import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { leaderboardQuerySchema } from '$lib/server/validation/minesweeper-daily';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * Get leaderboard for daily challenge
 * GET /api/games/minesweeper/daily-challenge/leaderboard?challenge_id=xxx&limit=100
 *
 * Returns the leaderboard for a specific daily challenge (or today's challenge if not specified).
 * Uses the pre-calculated `minesweeper_daily_leaderboard` view for optimal performance.
 *
 * **Security**:
 * - Requires authentication (students only)
 * - No sensitive data exposed (only public profile info)
 * - RLS policies ensure data integrity
 *
 * **Query Parameters**:
 * - `challenge_id` (optional): UUID of specific challenge (defaults to today's challenge)
 * - `limit` (optional): Number of results to return (default: 100, max: 1000)
 *
 * **Response**:
 * ```json
 * {
 *   "challenge": {
 *     "id": "uuid",
 *     "challenge_date": "2025-11-19",
 *     "difficulty": "beginner"
 *   },
 *   "leaderboard": [
 *     {
 *       "position": 1,
 *       "student_id": "uuid",
 *       "firstname": "John",
 *       "lastname": "Doe",
 *       "time_seconds": 45,
 *       "gidouilles_earned": 10,
 *       "rank": 1
 *     }
 *   ],
 *   "userPosition": 5 | null
 * }
 * ```
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// ✅ SECURITY: Only students can access minesweeper leaderboard
	const { user } = await requireRole(locals, 'student');

	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const queryParams = Object.fromEntries(url.searchParams);
		const validation = leaderboardQuerySchema.safeParse(queryParams);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		let { challenge_id } = validation.data;
		const { limit } = validation.data;

		// If no challenge_id provided, get today's challenge
		if (!challenge_id) {
			const { data: challengeData, error: rpcError } = await locals.supabase
				.rpc('get_or_create_daily_challenge')
				.single();

			if (rpcError) {
				sanitizeRPCError(rpcError, 'get_or_create_daily_challenge');
			}

			if (!challengeData) {
				throw error(500, 'Erreur lors de la récupération du défi quotidien');
			}

			// Type assertion for RPC return value
			const typedChallenge = challengeData as { id: string };
			challenge_id = typedChallenge.id;
		}

		// Fetch challenge details
		const { data: challenge, error: challengeError } = await locals.supabase
			.from('minesweeper_daily_challenges')
			.select('id, challenge_date, difficulty')
			.eq('id', challenge_id)
			.single();

		if (challengeError) {
			sanitizePostgresError(challengeError, 'MINESWEEPER_DAILY_LEADERBOARD_CHALLENGE');
		}

		if (!challenge) {
			throw error(404, 'Défi quotidien non trouvé');
		}

		// ✅ Query pre-calculated leaderboard view
		const { data: leaderboardData, error: leaderboardError } = await locals.supabase
			.from('minesweeper_daily_leaderboard')
			.select('*')
			.eq('challenge_id', challenge_id)
			.order('position', { ascending: true })
			.limit(limit);

		if (leaderboardError) {
			sanitizePostgresError(leaderboardError, 'MINESWEEPER_DAILY_LEADERBOARD');
		}

		// Format leaderboard data
		const leaderboard = (leaderboardData || []).map((entry) => ({
			position: entry.position,
			student_id: entry.student_id,
			firstname: entry.firstname,
			lastname: entry.lastname,
			time_seconds: entry.time_seconds,
			gidouilles_earned: entry.gidouilles_earned,
			rank: entry.rank
		}));

		// Find authenticated student's position
		let userPosition: number | null = null;
		const userEntry = leaderboard.find((entry) => entry.student_id === user.id);
		if (userEntry) {
			userPosition = userEntry.position;
		}

		return json({
			challenge: {
				id: challenge.id,
				challenge_date: challenge.challenge_date,
				difficulty: challenge.difficulty
			},
			leaderboard,
			userPosition
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_DAILY_LEADERBOARD');
	}
};
