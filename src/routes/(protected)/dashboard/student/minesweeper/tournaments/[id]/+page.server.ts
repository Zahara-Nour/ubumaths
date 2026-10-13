/**
 * Minesweeper Tournament Play Page - Server Load
 * ===============================================
 *
 * Loads tournament details, standings, and player's current game (if any).
 *
 * Data loaded:
 * - Tournament details (name, difficulty, dates, rewards)
 * - Standings (leaderboard)
 * - Player's current in-progress game (if any)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/student/minesweeper/tournaments/[id]/+page.server'
);

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const { user, profile } = locals;

	// Must be authenticated student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	const tournamentId = params.id;

	try {
		// Fetch tournament details and standings in parallel
		const [tournamentRes, standingsRes] = await Promise.all([
			fetch(`/api/games/minesweeper/tournaments/${tournamentId}`),
			fetch(`/api/games/minesweeper/tournaments/${tournamentId}/standings?limit=100`)
		]);

		if (!tournamentRes.ok) {
			const status = tournamentRes.status;
			if (status === 404) {
				throw error(404, 'Tournoi introuvable');
			}
			throw error(500, 'Impossible de charger le tournoi');
		}

		if (!standingsRes.ok) {
			logger.error('[Tournament] Error loading standings');
		}

		const { tournament } = await tournamentRes.json();
		const standingsData = standingsRes.ok
			? await standingsRes.json()
			: { standings: [], user_standing: null };

		// Check for in-progress game (include grid_state for resuming)
		// Note: tournament_games table has: id, seed, game_number, started_at, grid_state, time_seconds, status
		const { data: inProgressGame, error: gameError } = await locals.supabase
			.from('minesweeper_tournament_games')
			.select('id, seed, game_number, started_at, grid_state, time_seconds')
			.eq('tournament_id', tournamentId)
			.eq('student_id', user.id)
			.eq('status', 'in_progress')
			.order('started_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (gameError) {
			logger.error('[Tournament] Error checking in-progress game:', gameError);
		}

		return {
			tournament,
			standings: standingsData.standings || [],
			userStanding: standingsData.user_standing,
			totalParticipants: standingsData.total_participants || 0,
			inProgressGame: inProgressGame || null,
			currentUserId: user.id
		};
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('[Tournament] Error loading page data:', err);
		throw error(500, 'Erreur lors du chargement de la page');
	}
};
