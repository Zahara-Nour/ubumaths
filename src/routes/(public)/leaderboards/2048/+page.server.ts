/**
 * 2048 Leaderboard Page - Server Load
 * ====================================
 *
 * Global leaderboard ranked by best score.
 * Public - accessible to everyone.
 * If user is authenticated, their position is highlighted.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export type LeaderboardEntry = {
	rank: number;
	user_id: string;
	name: string;
	avatar_url: string | null;
	best_score: number;
	games_played: number;
	tiles_2048_reached: number;
	tiles_4096_reached: number;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	try {
		// Fetch global leaderboard ranked by best score (classic mode)
		const { data: topPlayers, error: leaderboardError } = await supabase
			.from('game_2048_scores')
			.select('user_id, best_score, games_played, tiles_2048_reached, tiles_4096_reached')
			.eq('mode', 'classic')
			.order('best_score', { ascending: false })
			.limit(100);

		if (leaderboardError) {
			console.error('[Leaderboard 2048] Error fetching leaderboard:', leaderboardError);
			throw leaderboardError;
		}

		// Fetch profiles for the top players
		const userIds = (topPlayers || []).map((p) => p.user_id);
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, firstname, lastname, avatar_url')
			.in('id', userIds);

		// Create a map for quick profile lookup
		const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

		// Transform data to include rank and profile data
		const leaderboard: LeaderboardEntry[] = (topPlayers || []).map((entry, index) => {
			const profile = profileMap.get(entry.user_id);

			// Build display name from firstname and lastname
			const displayName =
				profile?.firstname || profile?.lastname
					? `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim()
					: 'Joueur anonyme';

			return {
				rank: index + 1,
				user_id: entry.user_id,
				name: displayName,
				avatar_url: profile?.avatar_url || null,
				best_score: entry.best_score,
				games_played: entry.games_played,
				tiles_2048_reached: entry.tiles_2048_reached,
				tiles_4096_reached: entry.tiles_4096_reached
			};
		});

		// Find current user's position (if authenticated)
		let userRank: number | null = null;
		if (user && leaderboard.length > 0) {
			const userEntry = leaderboard.find((e) => e.user_id === user.id);
			userRank = userEntry?.rank || null;

			// If user not in top 100, calculate their rank
			if (!userRank) {
				const { data: userScore } = await supabase
					.from('game_2048_scores')
					.select('best_score')
					.eq('user_id', user.id)
					.eq('mode', 'classic')
					.single();

				if (userScore) {
					// Count how many players have a better score
					const { count } = await supabase
						.from('game_2048_scores')
						.select('*', { count: 'exact', head: true })
						.eq('mode', 'classic')
						.gt('best_score', userScore.best_score);

					userRank = (count || 0) + 1;
				}
			}
		}

		return {
			leaderboard,
			userRank,
			currentUserId: user?.id || null
		};
	} catch (err) {
		console.error('[Leaderboard 2048] Error loading leaderboard:', err);
		throw error(500, 'Impossible de charger le classement');
	}
};
