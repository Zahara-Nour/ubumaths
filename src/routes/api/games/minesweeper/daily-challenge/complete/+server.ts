import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { completeDailyChallengeSchema } from '$lib/server/validation/minesweeper-daily';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('minesweeper-daily-complete-api');

/**
 * Submit daily challenge completion
 * POST /api/games/minesweeper/daily-challenge/complete
 *
 * Records the user's completion of today's daily challenge.
 * Uses SECURITY DEFINER RPC function for server-side validation and reward calculation.
 *
 * The RPC function handles:
 * - Verifying challenge exists
 * - Server-side win validation
 * - Enforcing one-attempt-per-day rule
 * - Calculating and awarding Gidouilles based on performance
 * - Automatic ranking calculation and updates
 * - Atomic transaction (attempt record + reward + ranking)
 *
 * **Security**:
 * - Requires authentication (students only)
 * - Validates all input with Zod
 * - Server-side win validation (in RPC function)
 * - One attempt per day enforced by database
 * - Grid state validation with difficulty-specific constraints
 *
 * **Request Body**:
 * ```json
 * {
 *   "challenge_id": "uuid",
 *   "time_seconds": 145,
 *   "status": "won",
 *   "grid_state": {
 *     "rows": 9,
 *     "cols": 9,
 *     "mines": [[1,2], [3,4]],
 *     "revealed": [[0,0], [0,1]],
 *     "flagged": [[1,2]],
 *     "adjacentCounts": { "0,0": 1 }
 *   }
 * }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "attempt": {
 *     "id": "uuid",
 *     "challenge_id": "uuid",
 *     "student_id": "uuid",
 *     "time_seconds": 145,
 *     "status": "won",
 *     "gidouilles_earned": 10,
 *     "rank": 1,
 *     "completed_at": "timestamp"
 *   }
 * }
 * ```
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ SECURITY: Require student authentication
	await requireRole(locals, 'student');

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = completeDailyChallengeSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { challenge_id, time_seconds, status, grid_state } = validation.data;

	try {
		// ✅ SECURITY: Call SECURITY DEFINER RPC function
		// The function performs server-side validation and awards Gidouilles
		const { data, error: rpcError } = await locals.supabase
			.rpc('record_daily_challenge_attempt', {
				p_challenge_id: challenge_id,
				p_time_seconds: time_seconds,
				p_status: status,
				p_grid_state: grid_state
			})
			.single();

		if (rpcError) {
			logger.error('RPC error recording daily challenge attempt:', rpcError);

			// Handle specific RPC errors
			if (rpcError.message?.includes('Challenge not found')) {
				throw error(404, 'Défi quotidien non trouvé');
			}
			if (rpcError.message?.includes('already attempted')) {
				throw error(409, "Vous avez déjà tenté ce défi aujourd'hui");
			}
			if (rpcError.message?.includes('Invalid grid state')) {
				throw error(400, 'État de grille invalide');
			}
			if (rpcError.message?.includes('Invalid difficulty')) {
				throw error(400, 'Difficulté invalide');
			}
			if (rpcError.message?.includes('Grid validation failed')) {
				throw error(400, 'Validation de la grille échouée - triche détectée');
			}

			throw error(500, "Erreur lors de l'enregistrement de la tentative");
		}

		if (!data) {
			throw error(500, "Aucune donnée retournée par la fonction d'enregistrement");
		}

		return json({
			attempt: {
				id: data.id,
				challenge_id: data.challenge_id,
				student_id: data.student_id,
				time_seconds: data.time_seconds,
				status: data.status,
				gidouilles_earned: data.gidouilles_earned,
				rank: data.rank,
				completed_at: data.completed_at
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Error in daily challenge complete endpoint:', err);
		throw error(500, "Erreur serveur lors de l'enregistrement de la tentative");
	}
};
