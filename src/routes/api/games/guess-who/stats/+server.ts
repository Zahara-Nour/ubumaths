/**
 * API Endpoint: Get Guess Who Player Statistics
 * Path: GET /api/games/guess-who/stats
 *
 * Returns player statistics for all packs or a specific pack.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { z } from 'zod';
import type { GuessWhoPlayerStats, GuessWhoAggregatedStats } from '$lib/types/guess-who';

const querySchema = z.object({
	packId: z.string().optional()
});

/**
 * GET /api/games/guess-who/stats
 *
 * Get player statistics.
 *
 * **Query Parameters**:
 * - packId (optional): Filter by specific pack
 *
 * **Response**:
 * ```json
 * {
 *   "stats": [...],       // Per-pack stats
 *   "aggregated": {...}   // Overall stats
 * }
 * ```
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);

	const query = querySchema.safeParse(Object.fromEntries(url.searchParams));
	const packId = query.success ? query.data.packId : undefined;

	// Build query
	let statsQuery = locals.supabase
		.from('guess_who_player_stats')
		.select('*')
		.eq('player_id', user.id)
		.order('games_played', { ascending: false });

	if (packId) {
		statsQuery = statsQuery.eq('pack_id', packId);
	}

	const { data: rawStats, error: statsError } = await statsQuery;

	if (statsError) {
		console.error('Error fetching stats:', statsError);
		return json({ stats: [], aggregated: null });
	}

	// Transform to frontend format
	const stats: GuessWhoPlayerStats[] = (rawStats || []).map((s) => ({
		id: s.id,
		playerId: s.player_id,
		packId: s.pack_id,
		gamesPlayed: s.games_played,
		gamesWon: s.games_won,
		gamesLost: s.games_lost,
		totalQuestionsAsked: s.total_questions_asked,
		totalCorrectAnswers: s.total_correct_answers,
		totalIncorrectAnswers: s.total_incorrect_answers,
		totalGameTimeSeconds: s.total_game_time_seconds,
		bestTimeSeconds: s.best_time_seconds,
		fewestQuestionsWin: s.fewest_questions_win,
		currentWinStreak: s.current_win_streak,
		bestWinStreak: s.best_win_streak,
		winRate: s.games_played > 0 ? (s.games_won / s.games_played) * 100 : 0,
		accuracy:
			s.total_correct_answers + s.total_incorrect_answers > 0
				? (s.total_correct_answers / (s.total_correct_answers + s.total_incorrect_answers)) * 100
				: 0,
		updatedAt: s.updated_at
	}));

	// Calculate aggregated stats
	const aggregated: GuessWhoAggregatedStats = {
		totalGamesPlayed: stats.reduce((sum, s) => sum + s.gamesPlayed, 0),
		totalGamesWon: stats.reduce((sum, s) => sum + s.gamesWon, 0),
		overallWinRate: 0,
		overallAccuracy: 0,
		bestWinStreak: Math.max(0, ...stats.map((s) => s.bestWinStreak)),
		packsPlayed: stats.length,
		favoritePackId: stats.length > 0 ? stats[0].packId : null,
		totalPlayTimeSeconds: stats.reduce((sum, s) => sum + s.totalGameTimeSeconds, 0)
	};

	if (aggregated.totalGamesPlayed > 0) {
		aggregated.overallWinRate = (aggregated.totalGamesWon / aggregated.totalGamesPlayed) * 100;
	}

	const totalCorrect = stats.reduce((sum, s) => sum + s.totalCorrectAnswers, 0);
	const totalIncorrect = stats.reduce((sum, s) => sum + s.totalIncorrectAnswers, 0);
	if (totalCorrect + totalIncorrect > 0) {
		aggregated.overallAccuracy = (totalCorrect / (totalCorrect + totalIncorrect)) * 100;
	}

	return json({ stats, aggregated });
};
