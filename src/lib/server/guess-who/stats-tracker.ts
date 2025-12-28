/**
 * Server-side stats and achievement tracking for Guess Who
 *
 * @module server/guess-who/stats-tracker
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GuessWhoAchievementId } from '$lib/types/guess-who';

/**
 * Game completion data for stats tracking
 */
export interface GameCompletionData {
	gameId: string;
	packId: string;
	winnerId: string;
	player1Id: string;
	player2Id: string;
	gameTimeSeconds: number;
	moves: Array<{
		playerId: string;
		moveType: 'question' | 'answer' | 'guess';
		isCorrect?: boolean;
	}>;
}

/**
 * Update player stats after game completion
 */
export async function updatePlayerStats(
	supabase: SupabaseClient,
	data: GameCompletionData
): Promise<void> {
	const { packId, winnerId, player1Id, player2Id, gameTimeSeconds, moves } = data;

	// Calculate stats for each player
	for (const playerId of [player1Id, player2Id]) {
		const won = playerId === winnerId;

		// Count questions asked by this player
		const questionsAsked = moves.filter(
			(m) => m.playerId === playerId && m.moveType === 'question'
		).length;

		// Count answers by this player
		const answers = moves.filter((m) => m.playerId === playerId && m.moveType === 'answer');
		const correctAnswers = answers.filter((a) => a.isCorrect === true).length;
		const incorrectAnswers = answers.filter((a) => a.isCorrect === false).length;

		// Call the database function to update stats
		const { error } = await supabase.rpc('update_guess_who_stats', {
			p_player_id: playerId,
			p_pack_id: packId,
			p_won: won,
			p_questions_asked: questionsAsked,
			p_correct_answers: correctAnswers,
			p_incorrect_answers: incorrectAnswers,
			p_game_time_seconds: Math.round(gameTimeSeconds / 2) // Each player gets half
		});

		if (error) {
			console.error('Error updating stats for player', playerId, error);
		}
	}
}

/**
 * Check and unlock achievements after game completion
 * Returns the list of newly unlocked achievements
 */
export async function checkAndUnlockAchievements(
	supabase: SupabaseClient,
	playerId: string,
	gameId: string,
	packId: string,
	won: boolean,
	questionsAsked: number,
	gameTimeSeconds: number
): Promise<GuessWhoAchievementId[]> {
	const unlockedAchievements: GuessWhoAchievementId[] = [];

	// Get player's current stats
	const { data: stats } = await supabase
		.from('guess_who_player_stats')
		.select('*')
		.eq('player_id', playerId)
		.eq('pack_id', packId)
		.single();

	// Get player's existing achievements
	const { data: existingAchievements } = await supabase
		.from('guess_who_player_achievements')
		.select('achievement_id')
		.eq('player_id', playerId);

	const hasAchievement = (id: GuessWhoAchievementId) =>
		existingAchievements?.some((a) => a.achievement_id === id) ?? false;

	const achievementsToUnlock: GuessWhoAchievementId[] = [];

	// Check win-based achievements
	if (won) {
		// First win
		if (!hasAchievement('first_win') && stats?.games_won === 1) {
			achievementsToUnlock.push('first_win');
		}

		// Ten wins (check total across all packs)
		if (!hasAchievement('ten_wins')) {
			const { data: allStats } = await supabase
				.from('guess_who_player_stats')
				.select('games_won')
				.eq('player_id', playerId);
			const totalWins = allStats?.reduce((sum, s) => sum + s.games_won, 0) ?? 0;
			if (totalWins >= 10) {
				achievementsToUnlock.push('ten_wins');
			}
		}

		// Fifty wins
		if (!hasAchievement('fifty_wins')) {
			const { data: allStats } = await supabase
				.from('guess_who_player_stats')
				.select('games_won')
				.eq('player_id', playerId);
			const totalWins = allStats?.reduce((sum, s) => sum + s.games_won, 0) ?? 0;
			if (totalWins >= 50) {
				achievementsToUnlock.push('fifty_wins');
			}
		}

		// Speed achievements
		if (!hasAchievement('speed_demon') && gameTimeSeconds < 30) {
			achievementsToUnlock.push('speed_demon');
		}
		if (!hasAchievement('quick_thinker') && gameTimeSeconds < 60) {
			achievementsToUnlock.push('quick_thinker');
		}

		// Strategy achievements
		if (!hasAchievement('master_guesser') && questionsAsked <= 3) {
			achievementsToUnlock.push('master_guesser');
		}
		if (!hasAchievement('efficient') && questionsAsked <= 5) {
			achievementsToUnlock.push('efficient');
		}

		// Streak achievements
		if (!hasAchievement('hot_streak') && stats?.current_win_streak >= 3) {
			achievementsToUnlock.push('hot_streak');
		}
		if (!hasAchievement('unstoppable') && stats?.current_win_streak >= 5) {
			achievementsToUnlock.push('unstoppable');
		}
	}

	// Pack explorer (check how many different packs played)
	if (!hasAchievement('pack_explorer')) {
		const { data: allStats } = await supabase
			.from('guess_who_player_stats')
			.select('pack_id')
			.eq('player_id', playerId)
			.gte('games_played', 1);
		if (allStats && allStats.length >= 5) {
			achievementsToUnlock.push('pack_explorer');
		}
	}

	// Math master (win with each pack type)
	if (!hasAchievement('math_master')) {
		const { data: allStats } = await supabase
			.from('guess_who_player_stats')
			.select('pack_id')
			.eq('player_id', playerId)
			.gte('games_won', 1);

		const packTypes = new Set<string>();
		(allStats || []).forEach((s) => {
			if (
				s.pack_id.startsWith('naturals') ||
				s.pack_id === 'times_tables' ||
				s.pack_id === 'primes_focus'
			) {
				packTypes.add('number');
			} else if (s.pack_id.startsWith('fractions')) {
				packTypes.add('fraction');
			} else if (s.pack_id.startsWith('shapes')) {
				packTypes.add('shape');
			} else if (s.pack_id.startsWith('expressions')) {
				packTypes.add('expression');
			} else if (s.pack_id.startsWith('functions')) {
				packTypes.add('function');
			} else if (s.pack_id.startsWith('polyhedra')) {
				packTypes.add('polyhedron');
			}
		});

		// Require at least 4 different pack types for this achievement
		if (packTypes.size >= 4) {
			achievementsToUnlock.push('math_master');
		}
	}

	// Accuracy achievements (check total correct answers)
	if (!hasAchievement('truth_seeker')) {
		const { data: allStats } = await supabase
			.from('guess_who_player_stats')
			.select('total_correct_answers')
			.eq('player_id', playerId);
		const totalCorrect = allStats?.reduce((sum, s) => sum + s.total_correct_answers, 0) ?? 0;
		if (totalCorrect >= 50) {
			achievementsToUnlock.push('truth_seeker');
		}
	}

	// Insert unlocked achievements
	for (const achievementId of achievementsToUnlock) {
		const { error } = await supabase.from('guess_who_player_achievements').insert({
			player_id: playerId,
			achievement_id: achievementId,
			game_id: gameId,
			pack_id: packId
		});

		if (!error) {
			unlockedAchievements.push(achievementId);
		} else if (error.code !== '23505') {
			// Ignore duplicate key errors (achievement already unlocked)
			console.error('Error unlocking achievement', achievementId, error);
		}
	}

	return unlockedAchievements;
}
