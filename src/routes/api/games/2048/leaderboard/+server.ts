/**
 * GET /api/games/2048/leaderboard
 * =================================
 *
 * Returns the 2048 game leaderboard with top players and current user's rank.
 *
 * AUTH: Authenticated users only (students, teachers, admins)
 *
 * QUERY PARAMETERS:
 * - limit: number (optional, default: 10, min: 1, max: 100)
 *   Number of top players to return in the leaderboard
 *
 * RESPONSE:
 * {
 *   leaderboard: Array<{
 *     rank: number,              // Position in leaderboard (1-based)
 *     user_id: string,           // User UUID
 *     name: string,              // User's display name
 *     avatar_url: string | null, // User's avatar URL
 *     best_score: number,        // User's best score
 *     games_played: number,      // Total games played
 *     tiles_2048_reached: number,// Times reached 2048 tile
 *     tiles_4096_reached: number // Times reached 4096 tile
 *   }>,
 *   user_rank: number | null     // Current user's rank (null if not on leaderboard)
 * }
 *
 * NOTES:
 * - Leaderboard is ordered by best_score DESC
 * - Only users with at least one game played are included
 * - Current user's rank is calculated from the full leaderboard
 * - RLS policies ensure data access security
 *
 * ERRORS:
 * - 400: Invalid query parameters
 * - 401: Not authenticated
 * - 500: Database or server error
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	leaderboard2048QuerySchema,
	leaderboard2048ResponseSchema
} from '$lib/server/validation/games';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { user, supabase } = locals;

	// Auth check: Must be logged in
	if (!user) {
		throw error(401, 'Authentication required');
	}

	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const queryParams = {
			limit: url.searchParams.get('limit') || '10',
			mode: url.searchParams.get('mode') || 'classic'
		};

		const validation = leaderboard2048QuerySchema.safeParse(queryParams);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { limit, mode } = validation.data;

		// ============================================================================
		// STEP 1: Fetch top N players for leaderboard
		// ============================================================================

		// Query: Get top players with user info for the specified mode
		// Uses index: idx_game_2048_scores_mode_score (mode, best_score DESC)
		const { data: topPlayers, error: leaderboardError } = await supabase
			.from('game_2048_scores')
			.select(
				`
				user_id,
				best_score,
				games_played,
				tiles_2048_reached,
				tiles_4096_reached,
				profiles:user_id (
					name,
					avatar_url
				)
			`
			)
			.eq('mode', mode)
			.order('best_score', { ascending: false })
			.limit(limit);

		if (leaderboardError) {
			console.error('[API] Error fetching leaderboard:', leaderboardError);
			throw error(500, 'Failed to fetch leaderboard');
		}

		// Transform data to include rank and flatten profile data
		const leaderboard = topPlayers.map((entry, index) => {
			// Type assertion: profiles is a single object (not array) due to foreign key
			const profile = entry.profiles as unknown as { name: string; avatar_url: string | null };

			return {
				rank: index + 1, // 1-based ranking
				user_id: entry.user_id,
				name: profile?.name || 'Unknown User',
				avatar_url: profile?.avatar_url || null,
				best_score: entry.best_score,
				games_played: entry.games_played,
				tiles_2048_reached: entry.tiles_2048_reached,
				tiles_4096_reached: entry.tiles_4096_reached
			};
		});

		// ============================================================================
		// STEP 2: Calculate current user's overall rank
		// ============================================================================

		let user_rank: number | null = null;

		// First, check if user has a score record for this mode
		const { data: userScore, error: userScoreError } = await supabase
			.from('game_2048_scores')
			.select('best_score')
			.eq('user_id', user.id)
			.eq('mode', mode)
			.maybeSingle();

		if (userScoreError) {
			console.error('[API] Error fetching user score:', userScoreError);
			// Don't throw - user_rank can remain null
		}

		if (userScore) {
			// Calculate rank by counting how many users have a better score in this mode
			// ROW_NUMBER() would be more efficient but requires a custom SQL query
			// This approach is simpler and works well for reasonable leaderboard sizes

			const { count, error: rankError } = await supabase
				.from('game_2048_scores')
				.select('*', { count: 'exact', head: true })
				.eq('mode', mode)
				.gt('best_score', userScore.best_score);

			if (rankError) {
				console.error('[API] Error calculating user rank:', rankError);
				// Don't throw - user_rank can remain null
			} else if (count !== null) {
				user_rank = count + 1; // Rank is count of better scores + 1
			}
		}

		// ============================================================================
		// STEP 3: Validate and return response
		// ============================================================================

		const response = {
			leaderboard,
			user_rank
		};

		const validated = validateJsonResponse(
			leaderboard2048ResponseSchema,
			response,
			'GET /api/games/2048/leaderboard'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/games/2048/leaderboard:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
