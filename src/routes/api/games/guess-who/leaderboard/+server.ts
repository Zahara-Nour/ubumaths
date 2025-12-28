/**
 * API Endpoint: Get Guess Who Leaderboard
 * Path: GET /api/games/guess-who/leaderboard
 *
 * Returns the leaderboard for a specific pack or overall.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import type { GuessWhoLeaderboardEntry } from '$lib/types/guess-who';

const querySchema = z.object({
	packId: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional().default(20),
	offset: z.coerce.number().int().min(0).optional().default(0),
	sortBy: z
		.enum(['win_rate', 'games_won', 'best_time', 'best_streak'])
		.optional()
		.default('win_rate')
});

/**
 * GET /api/games/guess-who/leaderboard
 *
 * Get leaderboard entries.
 *
 * **Query Parameters**:
 * - packId (optional): Filter by specific pack
 * - limit (optional): Number of entries (default: 20, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 * - sortBy (optional): Sort criteria (default: win_rate)
 *
 * **Response**:
 * ```json
 * {
 *   "entries": [...],
 *   "total": 150,
 *   "userRank": 42
 * }
 * ```
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const query = querySchema.safeParse(Object.fromEntries(url.searchParams));

	if (!query.success) {
		return json({ entries: [], total: 0, userRank: null });
	}

	const { packId, limit, offset, sortBy } = query.data;

	// Get current user if authenticated
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	// Determine sort column
	let orderColumn = 'win_rate';
	let ascending = false;
	switch (sortBy) {
		case 'games_won':
			orderColumn = 'games_won';
			break;
		case 'best_time':
			orderColumn = 'best_time_seconds';
			ascending = true; // Lower is better
			break;
		case 'best_streak':
			orderColumn = 'best_win_streak';
			break;
	}

	// Build query for leaderboard view
	let leaderboardQuery = locals.supabase
		.from('guess_who_leaderboard')
		.select('*', { count: 'exact' });

	if (packId) {
		leaderboardQuery = leaderboardQuery.eq('pack_id', packId);
	}

	// Add minimum games filter for fairness
	leaderboardQuery = leaderboardQuery.gte('games_played', 3);

	// Order and paginate
	leaderboardQuery = leaderboardQuery
		.order(orderColumn, { ascending, nullsFirst: false })
		.range(offset, offset + limit - 1);

	const { data: rawEntries, count, error: leaderboardError } = await leaderboardQuery;

	if (leaderboardError) {
		console.error('Error fetching leaderboard:', leaderboardError);
		return json({ entries: [], total: 0, userRank: null });
	}

	// Transform to frontend format with ranks
	const entries: GuessWhoLeaderboardEntry[] = (rawEntries || []).map((e, index) => ({
		rank: offset + index + 1,
		playerId: e.player_id,
		displayName: e.display_name || 'Joueur anonyme',
		avatarUrl: e.avatar_url,
		packId: e.pack_id,
		gamesPlayed: e.games_played,
		gamesWon: e.games_won,
		winRate: parseFloat(e.win_rate) || 0,
		bestTimeSeconds: e.best_time_seconds,
		fewestQuestionsWin: e.fewest_questions_win,
		bestWinStreak: e.best_win_streak
	}));

	// Find user's rank if authenticated
	let userRank: number | null = null;
	if (user) {
		// Check if user is in current results
		const userEntry = entries.find((e) => e.playerId === user.id);
		if (userEntry) {
			userRank = userEntry.rank;
		} else {
			// Query user's position
			let userRankQuery = locals.supabase
				.from('guess_who_leaderboard')
				.select('player_id')
				.gte('games_played', 3);

			if (packId) {
				userRankQuery = userRankQuery.eq('pack_id', packId);
			}

			if (sortBy === 'best_time') {
				// For time, count how many have better (lower) time
				const { data: userData } = await locals.supabase
					.from('guess_who_leaderboard')
					.select('best_time_seconds')
					.eq('player_id', user.id)
					.eq('pack_id', packId || '')
					.single();

				if (userData?.best_time_seconds) {
					const { count: betterCount } = await userRankQuery.lt(
						'best_time_seconds',
						userData.best_time_seconds
					);
					userRank = (betterCount || 0) + 1;
				}
			} else {
				// For other metrics, count how many have higher value
				const userMetricColumn =
					orderColumn === 'games_won'
						? 'games_won'
						: orderColumn === 'best_win_streak'
							? 'best_win_streak'
							: 'win_rate';

				const { data: userData } = await locals.supabase
					.from('guess_who_leaderboard')
					.select(userMetricColumn)
					.eq('player_id', user.id)
					.maybeSingle();

				if (userData) {
					const userValue = userData[userMetricColumn as keyof typeof userData];
					if (userValue !== null) {
						const { count: betterCount } = await userRankQuery.gt(userMetricColumn, userValue);
						userRank = (betterCount || 0) + 1;
					}
				}
			}
		}
	}

	return json({
		entries,
		total: count || 0,
		userRank
	});
};
