/**
 * Minesweeper Leaderboard Page - Server Load
 * ==========================================
 *
 * Global leaderboard ranked by total points.
 * Public - accessible to everyone.
 * If user is authenticated, their position is highlighted.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	try {
		// Fetch global leaderboard ranked by average of top 10 games
		const { data: leaderboardData, error: leaderboardError } = await supabase
			.from('minesweeper_leaderboard')
			.select(
				'student_id, firstname, lastname, avg_top_10, top_games_count, games_won, games_played, total_points, win_rate, rank'
			)
			.order('rank', { ascending: true })
			.limit(100);

		if (leaderboardError) {
			console.error('[Leaderboard] Error fetching leaderboard:', leaderboardError);
			throw leaderboardError;
		}

		// Find current user's position (if authenticated)
		let userRank: number | null = null;
		if (user && leaderboardData) {
			const userEntry = leaderboardData.find((e) => e.student_id === user.id);
			userRank = userEntry?.rank || null;

			// If user not in top 100, query their specific rank
			if (!userRank) {
				const { data: userRankData } = await supabase
					.from('minesweeper_leaderboard')
					.select('rank')
					.eq('student_id', user.id)
					.single();

				userRank = userRankData?.rank || null;
			}
		}

		return {
			leaderboard: leaderboardData || [],
			userRank,
			currentUserId: user?.id || null
		};
	} catch (err) {
		console.error('[Leaderboard] Error loading leaderboard:', err);
		throw error(500, 'Impossible de charger le classement');
	}
};
