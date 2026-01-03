import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';
import type { TournamentFinalizationResult } from '$lib/types/minesweeper';

/**
 * UUID schema for path parameters
 */
const uuidSchema = z.string().uuid();

/**
 * Finalize a tournament and distribute rewards
 * POST /api/games/minesweeper/tournaments/[id]/finalize
 *
 * Ends the tournament and distributes gidouilles to podium winners.
 * Uses the `finalize_tournament()` RPC function which:
 * - Validates caller is creator or admin
 * - Calculates final standings from top X games
 * - Awards gidouilles based on podium_rewards configuration
 * - Logs rewards to gidouilles_activity for audit
 * - Marks tournament as completed
 *
 * **Security**:
 * - Requires authentication
 * - Only tournament creator or admin can finalize
 * - Cannot finalize already completed or cancelled tournaments
 *
 * **Request Body** (optional):
 * ```json
 * {
 *   "force_early": false // Allow finalization before end_date
 * }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "podium": [
 *     {
 *       "place": 1,
 *       "student_id": "uuid",
 *       "firstname": "Jane",
 *       "lastname": "Doe",
 *       "average_time": 120.50,
 *       "gidouilles_awarded": 10
 *     }
 *   ]
 * }
 * ```
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	// Require authentication (role check is done by RPC function)
	await requireAuth(locals);

	// Validate tournament ID
	const idValidation = uuidSchema.safeParse(params.id);

	if (!idValidation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const tournamentId = idValidation.data;

	try {
		// Call the finalize_tournament RPC function
		const { data, error: rpcError } = await locals.supabase.rpc('finalize_tournament', {
			p_tournament_id: tournamentId
		});

		if (rpcError) {
			// Handle specific RPC errors with French messages
			if (rpcError.message?.includes('not found') || rpcError.message?.includes('introuvable')) {
				throw error(404, 'Tournoi introuvable');
			}
			if (rpcError.message?.includes('Only the tournament creator or an admin')) {
				throw error(
					403,
					'Seul le createur du tournoi ou un administrateur peut finaliser ce tournoi'
				);
			}
			if (rpcError.message?.includes('already been finalized')) {
				throw error(400, 'Ce tournoi a deja ete finalise');
			}
			if (rpcError.message?.includes('cancelled')) {
				throw error(400, 'Impossible de finaliser un tournoi annule');
			}

			sanitizeRPCError(rpcError, 'finalize_tournament');
		}

		// Type the response - it's an array of podium winners
		const podium: TournamentFinalizationResult[] = (data || []).map(
			(winner: {
				place: number;
				student_id: string;
				firstname: string;
				lastname: string;
				average_time: number;
				gidouilles_awarded: number;
			}) => ({
				place: winner.place,
				student_id: winner.student_id,
				firstname: winner.firstname,
				lastname: winner.lastname,
				average_time: winner.average_time,
				gidouilles_awarded: winner.gidouilles_awarded
			})
		);

		return json({
			success: true,
			podium
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_FINALIZE');
	}
};
