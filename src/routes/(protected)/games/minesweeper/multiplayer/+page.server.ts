import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const authUser = locals.user;

	if (!authUser) {
		throw error(401, 'Non authentifié');
	}

	// Get full user profile from profiles table
	const { data: userProfile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', authUser.id)
		.single();

	if (profileError || !userProfile) {
		console.error('Failed to load user profile:', profileError);
		throw error(500, 'Impossible de charger le profil utilisateur');
	}

	// Get player's current ELO and stats for each difficulty
	const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

	const { data: stats, error: statsError } = await locals.supabase
		.from('minesweeper_player_stats')
		.select('difficulty, rank, games_played, games_won, win_rate')
		.eq('student_id', authUser.id)
		.eq('season', currentMonth);

	if (statsError) {
		console.error('Failed to load player stats:', statsError);
		// Don't throw - stats are optional for gameplay
	}

	return {
		user: userProfile,
		playerStats: stats || [],
		currentSeason: currentMonth
	};
};
