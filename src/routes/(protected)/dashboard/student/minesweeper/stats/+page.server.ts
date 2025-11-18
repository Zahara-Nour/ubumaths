/**
 * Student Minesweeper Stats Page - Server Load
 * ============================================
 *
 * Loads personal Minesweeper game statistics and recent game history.
 *
 * DATA LOADED:
 * - Personal game stats by difficulty (games played, won, best time, total gidouilles)
 * - Recent 10 games history (with difficulty, time, status, date)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';

type GameRecord = Database['public']['Tables']['minesweeper_games']['Row'];
type GameStats = {
	difficulty: 'beginner' | 'intermediate' | 'expert';
	gamesPlayed: number;
	gamesWon: number;
	bestTime: number | null;
	totalGidouilles: number;
	winRate: number;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Must be logged in as student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch all minesweeper games for this student
		const { data: games, error: gamesError } = await supabase
			.from('minesweeper_games')
			.select('id, difficulty, time_seconds, status, created_at, gidouilles_awarded')
			.eq('student_id', user.id)
			.order('created_at', { ascending: false });

		if (gamesError) {
			console.error('[Stats] Error fetching games:', gamesError);
			throw gamesError;
		}

		// Calculate statistics by difficulty
		const statsMap = new Map<string, GameStats>();

		// Initialize stats for each difficulty
		const difficulties: Array<'beginner' | 'intermediate' | 'expert'> = [
			'beginner',
			'intermediate',
			'expert'
		];
		for (const difficulty of difficulties) {
			statsMap.set(difficulty, {
				difficulty,
				gamesPlayed: 0,
				gamesWon: 0,
				bestTime: null,
				totalGidouilles: 0,
				winRate: 0
			});
		}

		// Process games
		const recentGames: Array<{
			id: string;
			difficulty: string;
			time_seconds: number;
			status: string;
			created_at: string;
			gidouilles_awarded: number;
		}> = [];

		for (const game of games || []) {
			const stats = statsMap.get(game.difficulty);
			if (stats) {
				stats.gamesPlayed++;

				if (game.status === 'won') {
					stats.gamesWon++;
					stats.totalGidouilles += game.gidouilles_awarded || 0;

					// Track best time (only for won games)
					if (stats.bestTime === null || (game.time_seconds && game.time_seconds < stats.bestTime)) {
						stats.bestTime = game.time_seconds || null;
					}
				}
			}

			// Add to recent games (limit to 10)
			if (recentGames.length < 10) {
				recentGames.push({
					id: game.id,
					difficulty: game.difficulty,
					time_seconds: game.time_seconds || 0,
					status: game.status,
					created_at: game.created_at,
					gidouilles_awarded: game.gidouilles_awarded || 0
				});
			}
		}

		// Calculate win rates
		for (const stats of statsMap.values()) {
			if (stats.gamesPlayed > 0) {
				stats.winRate = Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
			}
		}

		return {
			statistics: Array.from(statsMap.values()),
			recentGames
		};
	} catch (err) {
		console.error('[Stats] Error loading stats:', err);
		throw error(500, 'Impossible de charger les statistiques');
	}
};
