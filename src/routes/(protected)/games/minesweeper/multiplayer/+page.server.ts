import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Get player's current ELO and stats for each difficulty
	const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

	const { data: stats, error: statsError } = await locals.supabase
		.from('minesweeper_player_stats')
		.select('difficulty, rank, games_played, games_won, win_rate')
		.eq('student_id', user.id)
		.eq('season', currentMonth);

	if (statsError) {
		console.error('Failed to load player stats:', statsError);
		// Don't throw - stats are optional for gameplay
	}

	return {
		playerStats: stats || [],
		currentSeason: currentMonth
	};
};
