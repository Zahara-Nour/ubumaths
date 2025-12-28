/**
 * Student Guess Who Stats Page - Server Load
 * ===========================================
 *
 * Loads personal Guess Who game statistics, achievements, and recent game history.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type {
	GuessWhoPlayerStats,
	GuessWhoAggregatedStats,
	GuessWhoAchievementDisplay,
	AchievementCategory,
	AchievementRarity
} from '$lib/types/guess-who';
import { GAME_PACKS } from '$lib/types/guess-who';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Must be logged in
	if (!user || !profile) {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch player stats from API or directly
		const { data: rawStats, error: statsError } = await supabase
			.from('guess_who_player_stats')
			.select('*')
			.eq('player_id', user.id)
			.order('games_played', { ascending: false });

		if (statsError) {
			console.error('[GuessWho Stats] Error fetching stats:', statsError);
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

		// Fetch achievements
		const { data: allAchievements } = await supabase
			.from('guess_who_achievements')
			.select('*')
			.order('sort_order');

		const { data: playerAchievements } = await supabase
			.from('guess_who_player_achievements')
			.select('achievement_id, unlocked_at')
			.eq('player_id', user.id);

		const unlockedMap = new Map<string, string>();
		(playerAchievements || []).forEach((pa) => {
			unlockedMap.set(pa.achievement_id, pa.unlocked_at);
		});

		const achievements: GuessWhoAchievementDisplay[] = (allAchievements || []).map((a) => ({
			id: a.id,
			nameFr: a.name_fr,
			nameEn: a.name_en,
			descriptionFr: a.description_fr,
			descriptionEn: a.description_en,
			icon: a.icon,
			category: a.category as AchievementCategory,
			points: a.points,
			rarity: a.rarity as AchievementRarity,
			sortOrder: a.sort_order,
			unlocked: unlockedMap.has(a.id),
			unlockedAt: unlockedMap.get(a.id) || null
		}));

		// Fetch recent games
		const { data: recentGames } = await supabase
			.from('guess_who_games')
			.select('id, pack_id, status, winner_id, created_at, player1_id, player2_id')
			.or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
			.eq('status', 'completed')
			.order('created_at', { ascending: false })
			.limit(10);

		const formattedGames = (recentGames || []).map((g) => ({
			id: g.id,
			packId: g.pack_id,
			packName: GAME_PACKS[g.pack_id as keyof typeof GAME_PACKS]?.nameFr || g.pack_id,
			won: g.winner_id === user.id,
			createdAt: g.created_at
		}));

		return {
			stats,
			aggregated,
			achievements,
			recentGames: formattedGames,
			unlockedCount: achievements.filter((a) => a.unlocked).length,
			totalAchievements: achievements.length
		};
	} catch (err) {
		console.error('[GuessWho Stats] Error loading:', err);
		throw error(500, 'Impossible de charger les statistiques');
	}
};
