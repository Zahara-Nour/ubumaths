/**
 * Minesweeper Daily Challenge Page - Server Load
 * ==============================================
 *
 * Loads today's daily challenge and leaderboard data.
 * Students can play one attempt per day with the same grid (generated from a seed).
 * Top 3 players receive bonus Gidouilles.
 *
 * Data loaded:
 * - Today's challenge (difficulty, seed, date)
 * - User's attempt status (if already attempted)
 * - Leaderboard (top 100 players)
 * - User's position in leaderboard
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const { user, profile } = locals;

	// Must be authenticated student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch today's challenge and user's attempt
		const challengeRes = await fetch('/api/games/minesweeper/daily-challenge');
		if (!challengeRes.ok) {
			throw error(500, 'Impossible de charger le défi quotidien');
		}
		const { challenge, userAttempt } = await challengeRes.json();

		// Fetch leaderboard (top 100)
		const leaderboardRes = await fetch(
			'/api/games/minesweeper/daily-challenge/leaderboard?limit=100'
		);
		if (!leaderboardRes.ok) {
			throw error(500, 'Impossible de charger le classement');
		}
		const { leaderboard, userPosition } = await leaderboardRes.json();

		return {
			challenge,
			userAttempt,
			leaderboard,
			userPosition,
			currentUserId: user.id
		};
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Daily Challenge] Error loading page data:', err);
		throw error(500, 'Erreur lors du chargement de la page');
	}
};
