/**
 * Minesweeper Leaderboard Page - Server Load
 * ==========================================
 *
 * Loads global leaderboard data from the minesweeper_leaderboard view.
 * The leaderboard shows top players by difficulty level.
 *
 * The minesweeper_leaderboard view includes:
 * - Player rank
 * - Player name
 * - Best time for that difficulty
 * - Total gidouilles earned
 * - Completion date
 * - Difficulty level
 *
 * Loads top 100 players for the initial difficulty (beginner).
 * Client can filter by difficulty using the view data.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Must be logged in as student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch leaderboard from the minesweeper_leaderboard view
		// The view provides pre-calculated stats and ranking
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

		// Find current user's position in each difficulty
		const userPositions = new Map<string, number | null>();
		for (const [difficulty, entries] of byDifficulty.entries()) {
			const userEntry = entries.find((e) => e.student_id === user.id);
			userPositions.set(difficulty, userEntry?.rank || null);
		}

		return {
			leaderboard: leaderboardData || [],
			leaderboardByDifficulty: Object.fromEntries(byDifficulty),
			userPositions: Object.fromEntries(userPositions),
			currentUserId: user.id
		};
	} catch (err) {
		console.error('[Leaderboard] Error loading leaderboard:', err);
		throw error(500, 'Impossible de charger le classement');
	}
};
