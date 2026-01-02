import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { listActiveTournamentsSchema } from '$lib/server/validation/minesweeper-tournament';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * List active tournaments for the current student
 * GET /api/games/minesweeper/tournaments/active
 *
 * Returns active tournaments that the student can participate in:
 * - Tournaments for their classes
 * - Global tournaments
 *
 * **Security**:
 * - Requires student authentication
 * - Filters by student's class membership + global tournaments
 *
 * **Query Parameters**:
 * - `include_upcoming` (optional): Include scheduled tournaments (default: false)
 * - `limit` (optional): Number of results (default: 50, max: 100)
 *
 * **Response**:
 * ```json
 * {
 *   "tournaments": [
 *     {
 *       "id": "uuid",
 *       "name": "Tournament Name",
 *       "difficulty": "beginner",
 *       "status": "active",
 *       "start_date": "timestamp",
 *       "end_date": "timestamp",
 *       "top_x_games": 3,
 *       "podium_places": 3,
 *       "podium_rewards": { "1": 10, "2": 5, "3": 3 },
 *       "my_games_count": 5,
 *       "my_wins_count": 3,
 *       "my_average_score": 125,
 *       "has_in_progress_game": false,
 *       "time_remaining_seconds": 86400
 *     }
 *   ]
 * }
 * ```
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Only students can access this endpoint
	const { user } = await requireRole(locals, 'student');

	try {
		// Auto-activate scheduled tournaments that have passed their start date
		// This ensures tournaments become active even without a cron job
		await locals.supabase.rpc('auto_activate_scheduled_tournaments');

		// Validate query parameters with Zod
		const queryParams = Object.fromEntries(url.searchParams);
		const validation = listActiveTournamentsSchema.safeParse(queryParams);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { include_upcoming, include_completed, limit } = validation.data;

		// Get student's class IDs
		const { data: classMemberships, error: membershipError } = await locals.supabase
			.from('class_members')
			.select('class_id')
			.eq('student_id', user.id);

		if (membershipError) {
			sanitizePostgresError(membershipError, 'MINESWEEPER_TOURNAMENT_ACTIVE_MEMBERSHIP');
		}

		const studentClassIds = (classMemberships || []).map((m) => m.class_id);

		// Build the status filter
		const statuses: string[] = ['active'];
		if (include_upcoming) statuses.push('scheduled');
		if (include_completed) statuses.push('completed');

		// Query tournaments that are:
		// 1. Global (scope = 'global') OR
		// 2. Have participating classes that include student's classes
		// RLS should handle most of this, but we add explicit filters for clarity

		const { data: tournaments, error: queryError } = await locals.supabase
			.from('minesweeper_tournaments')
			.select(
				`
				id,
				name,
				description,
				difficulty,
				status,
				scope,
				start_date,
				end_date,
				top_x_games,
				podium_places,
				podium_rewards
			`
			)
			.in('status', statuses)
			.order('start_date', { ascending: true })
			.limit(limit);

		if (queryError) {
			sanitizePostgresError(queryError, 'MINESWEEPER_TOURNAMENT_ACTIVE');
		}

		// Filter tournaments where student can participate
		// (RLS should already handle this, but we verify)
		const now = new Date();

		const eligibleTournaments = await Promise.all(
			(tournaments || []).map(async (tournament) => {
				// Check if student can participate
				// Global tournaments are open to all
				// Class-scoped tournaments need class membership check
				let canParticipate = false;

				if (tournament.scope === 'global') {
					canParticipate = true;
				} else {
					// Check if any of student's classes are in this tournament
					const { data: tournamentClasses } = await locals.supabase
						.from('minesweeper_tournament_classes')
						.select('class_id')
						.eq('tournament_id', tournament.id);

					const tournamentClassIds = (tournamentClasses || []).map((tc) => tc.class_id);
					canParticipate = studentClassIds.some((cid) => tournamentClassIds.includes(cid));
				}

				if (!canParticipate) {
					return null;
				}

				// Get student's game stats for this tournament
				const { data: games, error: gamesError } = await locals.supabase
					.from('minesweeper_tournament_games')
					.select('id, status, time_seconds')
					.eq('tournament_id', tournament.id)
					.eq('student_id', user.id);

				if (gamesError) {
					console.error('[MINESWEEPER_TOURNAMENT_ACTIVE_GAMES]', gamesError);
				}

				const myGames = games || [];
				const wonGames = myGames.filter((g) => g.status === 'won' && g.time_seconds);

				// Get average score from standings view (already calculated)
				const { data: standing } = await locals.supabase
					.from('minesweeper_tournament_standings')
					.select('average_score')
					.eq('tournament_id', tournament.id)
					.eq('student_id', user.id)
					.single();

				const myAverageScore = standing?.average_score ? Math.round(standing.average_score) : null;

				// Calculate time remaining
				const endDate = new Date(tournament.end_date);
				const timeRemainingSeconds = Math.max(
					0,
					Math.floor((endDate.getTime() - now.getTime()) / 1000)
				);

				// Check if student has an in-progress game
				const hasInProgressGame = myGames.some((g) => g.status === 'in_progress');

				return {
					id: tournament.id,
					name: tournament.name,
					description: tournament.description,
					difficulty: tournament.difficulty,
					status: tournament.status,
					scope: tournament.scope,
					start_date: tournament.start_date,
					end_date: tournament.end_date,
					top_x_games: tournament.top_x_games,
					podium_places: tournament.podium_places,
					podium_rewards: tournament.podium_rewards,
					my_games_count: myGames.length,
					my_wins_count: wonGames.length,
					my_average_score: myAverageScore,
					has_in_progress_game: hasInProgressGame,
					time_remaining_seconds: timeRemainingSeconds
				};
			})
		);

		// Filter out null values (tournaments student can't participate in)
		const filteredTournaments = eligibleTournaments.filter((t) => t !== null);

		return json({
			tournaments: filteredTournaments
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_ACTIVE');
	}
};
