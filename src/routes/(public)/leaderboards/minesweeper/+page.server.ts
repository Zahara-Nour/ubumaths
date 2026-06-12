/**
 * Minesweeper Leaderboard Page - Server Load
 * ==========================================
 *
 * Global leaderboard ranked by average of top 10 games.
 * Public - accessible to everyone.
 * If user is authenticated, their position is highlighted.
 *
 * Teachers appear on the leaderboard but are excluded from ranking.
 * Only classified students (top_games_count >= 10) get a rank.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	try {
		// Fetch global leaderboard (includes role for teacher filtering)
		const { data: leaderboardData, error: leaderboardError } = await supabase
			.from('minesweeper_leaderboard')
			.select(
				'student_id, firstname, lastname, role, avg_top_10, top_games_count, games_won, games_played, total_points, win_rate, rank'
			)
			.order('rank', { ascending: true })
			.limit(100);

		if (leaderboardError) {
			console.error('[Leaderboard] Error fetching leaderboard:', leaderboardError);
			throw leaderboardError;
		}

		// Find current user's rank among classified students (excluding teachers)
		let userRank: number | null = null;
		if (user && leaderboardData) {
			const userEntry = leaderboardData.find((e) => e.student_id === user.id);

			if (userEntry && userEntry.top_games_count >= 10 && userEntry.role === 'student') {
				const { count } = await supabase
					.from('minesweeper_leaderboard')
					.select('*', { count: 'exact', head: true })
					.gte('top_games_count', 10)
					.eq('role', 'student')
					.gt('avg_top_10', userEntry.avg_top_10);
				userRank = (count ?? 0) + 1;
			} else if (user) {
				// User not in top 100, check if they're a classified student
				const { data: userData } = await supabase
					.from('minesweeper_leaderboard')
					.select('avg_top_10, top_games_count, role')
					.eq('student_id', user.id)
					.single();

				if ((userData?.top_games_count ?? 0) >= 10 && userData?.role === 'student') {
					const { count } = await supabase
						.from('minesweeper_leaderboard')
						.select('*', { count: 'exact', head: true })
						.gte('top_games_count', 10)
						.eq('role', 'student')
						.gt('avg_top_10', userData?.avg_top_10);
					userRank = (count ?? 0) + 1;
				}
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
