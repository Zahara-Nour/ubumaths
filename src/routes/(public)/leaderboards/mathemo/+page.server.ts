/**
 * Mathemo Leaderboard Page - Server Load
 * =======================================
 *
 * Global leaderboard ranked by total cumulative score.
 * Public - accessible to everyone.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export type LeaderboardEntry = {
	rank: number;
	user_id: string;
	name: string;
	avatar_url: string | null;
	total_score: number;
	games_played: number;
	games_won: number;
	best_word_length: number;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	try {
		// Fetch global leaderboard ranked by total_score
		const { data: topPlayers, error: leaderboardError } = await supabase
			.from('mathemo_scores')
			.select('user_id, total_score, games_played, games_won, best_word_length')
			.gt('total_score', 0)
			.order('total_score', { ascending: false })
			.limit(100);

		if (leaderboardError) {
			console.error('[Leaderboard Mathemo] Error fetching leaderboard:', leaderboardError);
			throw leaderboardError;
		}

		// Fetch profiles for the top players
		const userIds = (topPlayers || []).map((p) => p.user_id);
		const { data: profiles } =
			userIds.length > 0
				? await supabase
						.from('profiles')
						.select('id, firstname, lastname, avatar_url')
						.in('id', userIds)
				: { data: [] };

		const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

		const leaderboard: LeaderboardEntry[] = (topPlayers || []).map((entry, index) => {
			const profile = profileMap.get(entry.user_id);
			const displayName =
				profile?.firstname || profile?.lastname
					? `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim()
					: 'Joueur anonyme';

			return {
				rank: index + 1,
				user_id: entry.user_id,
				name: displayName,
				avatar_url: profile?.avatar_url || null,
				total_score: Number(entry.total_score),
				games_played: entry.games_played,
				games_won: entry.games_won,
				best_word_length: entry.best_word_length
			};
		});

		// Find current user's position
		let userRank: number | null = null;
		if (user && leaderboard.length > 0) {
			const userEntry = leaderboard.find((e) => e.user_id === user.id);
			userRank = userEntry?.rank || null;

			if (!userRank) {
				const { data: rankData } = await supabase
					.rpc('get_mathemo_user_rank', { p_user_id: user.id })
					.maybeSingle();

				if (rankData) {
					userRank = Number((rankData as { user_rank: number }).user_rank);
				}
			}
		}

		return {
			leaderboard,
			userRank,
			currentUserId: user?.id || null
		};
	} catch (err) {
		console.error('[Leaderboard Mathemo] Error loading leaderboard:', err);
		throw error(500, 'Impossible de charger le classement');
	}
};
