import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';
import {
	getTournamentSchema,
	getTournamentStandingsSchema
} from '$lib/server/validation/minesweeper-tournament';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';
import type { TournamentStanding } from '$lib/types/minesweeper';

/**
 * Get tournament leaderboard
 * GET /api/games/minesweeper/tournaments/[id]/standings
 *
 * Returns the tournament leaderboard from the `minesweeper_tournament_standings` view.
 * The view calculates average time of top X games for each student.
 *
 * **Security**:
 * - Requires authentication
 * - RLS policies ensure user can only see standings for tournaments they have access to
 *
 * **Query Parameters**:
 * - `limit` (optional): Number of results (default: 100, max: 1000)
 *
 * **Response**:
 * ```json
 * {
 *   "standings": [
 *     {
 *       "tournament_id": "uuid",
 *       "student_id": "uuid",
 *       "firstname": "Jane",
 *       "lastname": "Doe",
 *       "games_won": 5,
 *       "average_time": 120.50,
 *       "position": 1
 *     }
 *   ],
 *   "user_standing": {
 *     "position": 5,
 *     "games_won": 3,
 *     "average_time": 145.25
 *   } | null,
 *   "total_participants": 25
 * }
 * ```
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Require authentication
	const { user } = await requireAuth(locals);

	// Validate tournament ID
	const idValidation = getTournamentSchema.safeParse({ id: params.id });

	if (!idValidation.success) {
		throw error(400, 'ID de tournoi invalide');
	}

	const tournamentId = idValidation.data.id;

	// Validate query parameters
	const queryParams = Object.fromEntries(url.searchParams);
	const queryValidation = getTournamentStandingsSchema.safeParse(queryParams);

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { limit } = queryValidation.data;

	try {
		// Verify tournament exists and user has access (RLS will handle this)
		const { data: tournament, error: tournamentError } = await locals.supabase
			.from('minesweeper_tournaments')
			.select('id, name, status')
			.eq('id', tournamentId)
			.single();

		if (tournamentError) {
			if (tournamentError.code === 'PGRST116') {
				throw error(404, 'Tournoi introuvable');
			}
			sanitizePostgresError(tournamentError, 'MINESWEEPER_TOURNAMENT_STANDINGS_VERIFY');
		}

		if (!tournament) {
			throw error(404, 'Tournoi introuvable');
		}

		// Query the standings view
		const { data: standingsData, error: standingsError } = await locals.supabase
			.from('minesweeper_tournament_standings')
			.select('*')
			.eq('tournament_id', tournamentId)
			.order('position', { ascending: true })
			.limit(limit);

		if (standingsError) {
			sanitizePostgresError(standingsError, 'MINESWEEPER_TOURNAMENT_STANDINGS');
		}

		const standings: TournamentStanding[] = (standingsData || []).map((entry) => ({
			tournament_id: entry.tournament_id,
			student_id: entry.student_id,
			firstname: entry.firstname,
			lastname: entry.lastname,
			games_won: entry.games_won,
			average_time: entry.average_time,
			position: entry.position
		}));

		// Find current user's standing
		const userStanding = standings.find((s) => s.student_id === user.id);

		// Get total participant count (may be more than the limited standings)
		const { count: totalParticipants } = await locals.supabase
			.from('minesweeper_tournament_standings')
			.select('*', { count: 'exact', head: true })
			.eq('tournament_id', tournamentId);

		return json({
			tournament: {
				id: tournament.id,
				name: tournament.name,
				status: tournament.status
			},
			standings,
			user_standing: userStanding
				? {
						position: userStanding.position,
						games_won: userStanding.games_won,
						average_time: userStanding.average_time
					}
				: null,
			total_participants: totalParticipants || 0
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_STANDINGS');
	}
};
