import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';
import { getTournamentSchema } from '$lib/server/validation/minesweeper-tournament';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';
import type { TournamentWithDetails } from '$lib/types/minesweeper';

/**
 * Get tournament details
 * GET /api/games/minesweeper/tournaments/[id]
 *
 * Returns full tournament details including:
 * - Tournament configuration
 * - Participating classes
 * - Current user's stats (if student)
 * - Top 10 players
 *
 * Uses the `get_tournament_details()` RPC function for efficient data retrieval.
 *
 * **Security**:
 * - Requires authentication
 * - RLS policies ensure user can only see tournaments they have access to
 *
 * **Response**:
 * ```json
 * {
 *   "tournament": {
 *     "id": "uuid",
 *     "name": "Tournament Name",
 *     "difficulty": "beginner",
 *     "status": "active",
 *     "start_date": "timestamp",
 *     "end_date": "timestamp",
 *     "classes": [{ "id": "uuid", "name": "Class Name", "teacher_name": "John Doe" }],
 *     "my_stats": { "position": 5, "games_won": 3, "average_time": 120.5 },
 *     "top_players": [{ "position": 1, "firstname": "Jane", "lastname": "Doe", ... }]
 *   }
 * }
 * ```
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	await requireAuth(locals);

	// Validate tournament ID
	const validation = getTournamentSchema.safeParse({ id: params.id });

	if (!validation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const tournamentId = validation.data.id;

	try {
		// First, auto-activate scheduled tournaments if start date has passed
		await locals.supabase.rpc('auto_activate_scheduled_tournaments');

		// Check if this specific tournament needs auto-finalization
		// (end date passed but still active)
		const { data: tournamentCheck } = await locals.supabase
			.from('minesweeper_tournaments')
			.select('status, end_date')
			.eq('id', tournamentId)
			.single();

		if (
			tournamentCheck &&
			tournamentCheck.status === 'active' &&
			new Date(tournamentCheck.end_date) < new Date()
		) {
			// Tournament has ended but not finalized - trigger auto-finalization
			// force_early = false because it has actually ended
			await locals.supabase.rpc('finalize_tournament', {
				p_tournament_id: tournamentId,
				p_force_early: false
			});
		}

		// Call the get_tournament_details RPC function
		const { data, error: rpcError } = await locals.supabase
			.rpc('get_tournament_details', {
				p_tournament_id: tournamentId
			})
			.single();

		if (rpcError) {
			sanitizeRPCError(rpcError, 'get_tournament_details');
		}

		if (!data) {
			throw error(404, 'Tournoi introuvable');
		}

		// Type the response
		const tournament = data as TournamentWithDetails;

		return json({
			tournament
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_DETAILS');
	}
};

/**
 * Cancel a tournament
 * DELETE /api/games/minesweeper/tournaments/[id]
 *
 * Cancels a tournament. Only the creator or an admin can cancel.
 * Cannot cancel completed tournaments.
 *
 * **Security**:
 * - Requires authentication
 * - Only creator or admin can cancel
 * - Cannot cancel completed tournaments
 *
 * **Response**:
 * ```json
 * {
 *   "success": true,
 *   "message": "Tournoi annule"
 * }
 * ```
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	const { profile } = await requireAuth(locals);

	// Validate tournament ID
	const validation = getTournamentSchema.safeParse({ id: params.id });

	if (!validation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const tournamentId = validation.data.id;

	try {
		// Get tournament to verify ownership and status
		const { data: tournament, error: fetchError } = await locals.supabase
			.from('minesweeper_tournaments')
			.select('id, creator_id, status')
			.eq('id', tournamentId)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				throw error(404, 'Tournoi introuvable');
			}
			sanitizePostgresError(fetchError, 'MINESWEEPER_TOURNAMENT_DELETE_FETCH');
		}

		if (!tournament) {
			throw error(404, 'Tournoi introuvable');
		}

		// Check authorization: only creator or admin can cancel
		if (tournament.creator_id !== profile.id && profile.role !== 'admin') {
			throw error(403, 'Seul le createur ou un administrateur peut annuler ce tournoi');
		}

		// Check status: cannot cancel completed tournaments
		if (tournament.status === 'completed') {
			throw error(400, "Impossible d'annuler un tournoi termine");
		}

		// Already cancelled
		if (tournament.status === 'cancelled') {
			throw error(400, 'Ce tournoi est deja annule');
		}

		// Update status to cancelled
		const { error: updateError } = await locals.supabase
			.from('minesweeper_tournaments')
			.update({ status: 'cancelled' })
			.eq('id', tournamentId);

		if (updateError) {
			sanitizePostgresError(updateError, 'MINESWEEPER_TOURNAMENT_DELETE_UPDATE');
		}

		return json({
			success: true,
			message: 'Tournoi annule'
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_DELETE');
	}
};
