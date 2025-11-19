import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { leaderboardQuerySchema } from '$lib/server/validation/minesweeper-daily';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('minesweeper-daily-leaderboard-api');

/**
 * Get leaderboard for daily challenge
 * GET /api/games/minesweeper/daily-challenge/leaderboard?challenge_id=xxx&limit=100
 *
 * Returns the leaderboard for a specific daily challenge (or today's challenge if not specified).
 * Uses the pre-calculated `minesweeper_daily_leaderboard` view for optimal performance.
 *
 * **Security**:
 * - Public endpoint (anyone can view leaderboard)
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
	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const queryParams = Object.fromEntries(url.searchParams);
		const validation = leaderboardQuerySchema.safeParse(queryParams);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { challenge_id, limit } = validation.data;

		// If no challenge_id provided, get today's challenge
		if (!challenge_id) {
			const { data: challengeData, error: rpcError } = await locals.supabase
				.rpc('get_or_create_daily_challenge')
				.single();

			if (rpcError || !challengeData) {
				logger.error("Error fetching today's challenge:", rpcError);
				throw error(500, 'Erreur lors de la récupération du défi quotidien');
			}

			challenge_id = challengeData.id;
		}

		// Fetch challenge details
		const { data: challenge, error: challengeError } = await locals.supabase
			.from('minesweeper_daily_challenges')
			.select('id, challenge_date, difficulty')
			.eq('id', challenge_id)
			.single();

		if (challengeError || !challenge) {
			logger.error('Error fetching challenge details:', challengeError);
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
			logger.error('Error fetching leaderboard:', leaderboardError);
			throw error(500, 'Erreur lors de la récupération du classement');
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

		// Check if user is authenticated and find their position
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		let userPosition: number | null = null;

		if (user) {
			const userEntry = leaderboard.find((entry) => entry.student_id === user.id);
			if (userEntry) {
				userPosition = userEntry.position;
			}
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
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Error in daily challenge leaderboard endpoint:', err);
		throw error(500, 'Erreur serveur lors de la récupération du classement');
	}
};
