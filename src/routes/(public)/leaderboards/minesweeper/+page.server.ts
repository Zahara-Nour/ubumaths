/**
 * Minesweeper Leaderboard Page - Server Load
 * ==========================================
 *
 * Public leaderboard - accessible to everyone.
 * If user is authenticated, their position is highlighted.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	try {
		// Fetch leaderboard from the minesweeper_leaderboard view
		const { data: leaderboardData, error: leaderboardError } = await supabase
			.from('minesweeper_leaderboard')
			.select(
				'student_id, firstname, lastname, difficulty, games_won, games_played, best_time, total_gidouilles, win_rate, rank'
			)
			.order('difficulty', { ascending: true })
			.order('rank', { ascending: true });

		if (leaderboardError) {
			console.error('[Leaderboard] Error fetching leaderboard:', leaderboardError);
			throw leaderboardError;
		}

		// Group by difficulty for easier client-side filtering
		const byDifficulty = new Map<string, typeof leaderboardData>();

		for (const entry of leaderboardData || []) {
			const difficulty = entry.difficulty || 'unknown';
			if (!byDifficulty.has(difficulty)) {
				byDifficulty.set(difficulty, []);
			}
			byDifficulty.get(difficulty)!.push(entry);
		}

		// Find current user's position in each difficulty (if authenticated)
		const userPositions = new Map<string, number | null>();
		if (user) {
			for (const [difficulty, entries] of byDifficulty.entries()) {
				const userEntry = entries.find((e) => e.student_id === user.id);
				userPositions.set(difficulty, userEntry?.rank || null);
			}
		}

		return {
			leaderboard: leaderboardData || [],
			leaderboardByDifficulty: Object.fromEntries(byDifficulty),
			userPositions: Object.fromEntries(userPositions),
			currentUserId: user?.id || null
		};
	} catch (err) {
		console.error('[Leaderboard] Error loading leaderboard:', err);
		throw error(500, 'Impossible de charger le classement');
	}
};
