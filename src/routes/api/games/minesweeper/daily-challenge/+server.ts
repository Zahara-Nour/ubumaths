import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('minesweeper-daily-challenge-api');

/**
 * Get today's daily challenge and user's attempt status
 * GET /api/games/minesweeper/daily-challenge
 *
 * Returns today's challenge information and the user's attempt if authenticated.
 * Public endpoint - works for both authenticated and unauthenticated users.
 *
 * **Security**:
 * - Public endpoint (no authentication required)
 * - If authenticated, returns user's attempt for today
 * - If not authenticated, returns only challenge (userAttempt = null)
 * - RLS policies ensure users only see their own attempts
 *
 * **Response**:
 * ```json
 * {
 *   "challenge": {
 *     "id": "uuid",
 *     "challenge_date": "2025-11-19",
 *     "difficulty": "beginner",
 *     "seed": "daily-2025-11-19",
 *     "created_at": "timestamp"
 *   },
 *   "userAttempt": {
 *     "id": "uuid",
 *     "time_seconds": 145,
 *     "status": "won",
 *     "gidouilles_earned": 10,
 *     "rank": 1,
 *     "completed_at": "timestamp"
 *   } | null
 * }
 * ```
 */
export const GET: RequestHandler = async ({ locals }) => {
	try {
		// ✅ Get or create today's challenge using RPC function
		const { data: challengeData, error: rpcError } = await locals.supabase
			.rpc('get_or_create_daily_challenge')
			.single();

		if (rpcError || !challengeData) {
			logger.error('Error fetching daily challenge:', rpcError);
			return json(
				{
					error: 'Erreur lors de la récupération du défi quotidien'
				},
				{ status: 500 }
			);
		}

		// Parse the JSONB response from the RPC function
		const challenge = {
			id: challengeData.id,
			challenge_date: challengeData.challenge_date,
			difficulty: challengeData.difficulty,
			seed: challengeData.seed,
			created_at: challengeData.created_at
		};

		// Check if user is authenticated
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		let userAttempt = null;

		// If authenticated, fetch user's attempt for today's challenge
		if (user) {
			const { data: attemptData, error: attemptError } = await locals.supabase
				.from('minesweeper_daily_attempts')
				.select('*')
				.eq('challenge_id', challenge.id)
				.eq('student_id', user.id)
				.maybeSingle();

			if (attemptError) {
				logger.error('Error fetching user attempt:', attemptError);
				// Continue without user attempt (don't fail the entire request)
			} else if (attemptData) {
				userAttempt = {
					id: attemptData.id,
					time_seconds: attemptData.time_seconds,
					status: attemptData.status,
					gidouilles_earned: attemptData.gidouilles_earned,
					rank: attemptData.rank,
					completed_at: attemptData.completed_at
				};
			}
		}

		return json({
			challenge,
			userAttempt
		});
	} catch (err) {
		logger.error('Error in daily challenge endpoint:', err);
		return json(
			{
				error: 'Erreur serveur lors de la récupération du défi quotidien'
			},
			{ status: 500 }
		);
	}
};
