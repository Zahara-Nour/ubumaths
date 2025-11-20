import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';
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

		if (rpcError) {
			try {
				sanitizeRPCError(rpcError, 'get_or_create_daily_challenge');
			} catch (err) {
				return json(
					{
						error: 'Erreur lors de la récupération du défi quotidien'
					},
					{ status: 500 }
				);
			}
		}

		if (!challengeData) {
			return json(
				{
					error: 'Erreur lors de la récupération du défi quotidien'
				},
				{ status: 500 }
			);
		}

		// Parse the JSONB response from the RPC function
		// Type assertion needed because RPC returns JSONB
		const typedChallenge = challengeData as {
			id: string;
			challenge_date: string;
			difficulty: string;
			seed: number;
			created_at: string;
		};

		const challenge = {
			id: typedChallenge.id,
			challenge_date: typedChallenge.challenge_date,
			difficulty: typedChallenge.difficulty,
			seed: typedChallenge.seed,
			created_at: typedChallenge.created_at
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
				// Log error but continue without user attempt (don't fail the entire request)
				console.error('[MINESWEEPER_DAILY_ATTEMPT]', {
					error: attemptError,
					timestamp: new Date().toISOString()
				});
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
		console.error('[MINESWEEPER_DAILY_CHALLENGE]', {
			error: err,
			timestamp: new Date().toISOString()
		});
		return json(
			{
				error: 'Erreur serveur lors de la récupération du défi quotidien'
			},
			{ status: 500 }
		);
	}
};
