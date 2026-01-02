import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAuth, requireRoles } from '$lib/server/middleware/auth';
import { createTournamentSchema } from '$lib/server/validation/minesweeper-tournament';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * List tournaments for the authenticated user
 * GET /api/games/minesweeper/tournaments
 *
 * Returns tournaments based on user role:
 * - Teachers: their tournaments
 * - Students: tournaments they can participate in (their classes + global)
 * - Admins: all tournaments
 *
 * **Security**:
 * - Requires authentication
 * - RLS policies filter based on user role and class membership
 *
 * **Query Parameters**:
 * - `status` (optional): Filter by status (scheduled, active, completed, cancelled)
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
 *       "participant_count": 25
 *     }
 *   ]
 * }
 * ```
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Require authentication (any role)
	const { profile } = await requireAuth(locals);

	try {
		// Auto-activate scheduled tournaments that have passed their start date
		// This ensures tournaments become active even without a cron job
		await locals.supabase.rpc('auto_activate_scheduled_tournaments');

		// Parse query parameters
		const statusParam = url.searchParams.get('status');
		const limitParam = url.searchParams.get('limit');

		const validStatuses = ['scheduled', 'active', 'completed', 'cancelled'];
		const status = statusParam && validStatuses.includes(statusParam) ? statusParam : null;
		const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);

		// Build query - RLS will automatically filter based on user role
		let query = locals.supabase
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
				podium_rewards,
				creator_id,
				created_at
			`
			)
			.order('created_at', { ascending: false })
			.limit(limit);

		// Apply status filter if provided
		if (status) {
			query = query.eq('status', status);
		}

		const { data: tournaments, error: queryError } = await query;

		if (queryError) {
			sanitizePostgresError(queryError, 'MINESWEEPER_TOURNAMENT_LIST');
		}

		// For each tournament, get participant count
		const tournamentsWithCount = await Promise.all(
			(tournaments || []).map(async (tournament) => {
				// Count unique students who have played in this tournament
				const { count } = await locals.supabase
					.from('minesweeper_tournament_games')
					.select('student_id', { count: 'exact', head: true })
					.eq('tournament_id', tournament.id);

				return {
					...tournament,
					participant_count: count || 0,
					is_creator: tournament.creator_id === profile.id
				};
			})
		);

		return json({
			tournaments: tournamentsWithCount
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_LIST');
	}
};

/**
 * Create a new tournament
 * POST /api/games/minesweeper/tournaments
 *
 * Teachers can create tournaments for their own classes.
 * Admins can create global tournaments or class-scoped tournaments for any class.
 *
 * **Security**:
 * - Requires teacher or admin role
 * - Teachers can only select their own classes
 * - Global tournaments (no classes) are admin-only
 * - Validates all input with Zod
 *
 * **Request Body**:
 * ```json
 * {
 *   "name": "Tournament Name",
 *   "description": "Optional description",
 *   "difficulty": "beginner" | "intermediate" | "expert",
 *   "start_date": "2025-01-15T00:00:00Z",
 *   "end_date": "2025-01-22T00:00:00Z",
 *   "top_x_games": 3,
 *   "podium_rewards": { "1": 10, "2": 5, "3": 3 },
 *   "podium_places": 3,
 *   "class_ids": ["uuid1", "uuid2"] // null/empty for global (admin only)
 * }
 * ```
 *
 * **Response**:
 * ```json
 * {
 *   "tournament_id": "uuid"
 * }
 * ```
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Only teachers and admins can create tournaments
	await requireRoles(locals, ['teacher', 'admin']);

	// Validate input with Zod
	const body = await request.json();
	const validation = createTournamentSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const {
		name,
		description,
		difficulty,
		start_date,
		end_date,
		top_x_games,
		podium_rewards,
		podium_places,
		class_ids
	} = validation.data;

	try {
		// Call the create_tournament RPC function
		// This function handles:
		// - Role verification (teacher owns classes, admin can create global)
		// - Scope determination (classes vs global)
		// - Tournament creation with class associations
		const { data: tournamentId, error: rpcError } = await locals.supabase
			.rpc('create_tournament', {
				p_name: name,
				p_difficulty: difficulty,
				p_start_date: start_date,
				p_end_date: end_date,
				p_class_ids: class_ids || null,
				p_description: description || null,
				p_top_x_games: top_x_games,
				p_podium_rewards: podium_rewards,
				p_podium_places: podium_places
			})
			.single();

		if (rpcError) {
			// Handle specific RPC errors
			if (rpcError.message?.includes('Only admins can create global')) {
				throw error(403, 'Seuls les administrateurs peuvent creer des tournois globaux');
			}
			if (rpcError.message?.includes('does not own class')) {
				throw error(403, 'Vous ne pouvez creer des tournois que pour vos propres classes');
			}
			if (rpcError.message?.includes('Class not found')) {
				throw error(404, 'Une ou plusieurs classes specifiees sont introuvables');
			}
			sanitizeRPCError(rpcError, 'create_tournament');
		}

		return json(
			{
				tournament_id: tournamentId
			},
			{ status: 201 }
		);
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_TOURNAMENT_CREATE');
	}
};
