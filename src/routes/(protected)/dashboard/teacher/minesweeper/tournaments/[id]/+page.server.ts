/**
 * Tournament Details Page - Server-Side Logic
 * =============================================
 *
 * Loads tournament details and standings for management.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { TournamentWithDetails, TournamentStanding } from '$lib/types/minesweeper';

export interface TournamentDetailsPageData {
	tournament: TournamentWithDetails;
	standings: TournamentStanding[];
	totalParticipants: number;
}

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const { data: profileData, error: profileError } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouve');
	}

	if (profileData.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	const tournamentId = params.id;

	// Fetch tournament details
	const tournamentResponse = await fetch(`/api/games/minesweeper/tournaments/${tournamentId}`);

	if (!tournamentResponse.ok) {
		if (tournamentResponse.status === 404) {
			throw error(404, 'Tournoi introuvable');
		}
		throw error(500, 'Erreur lors du chargement du tournoi');
	}

	const { tournament } = await tournamentResponse.json();

	// Verify teacher is the creator
	if (tournament.creator_id !== user.id) {
		throw error(403, 'Vous ne pouvez gerer que vos propres tournois');
	}

	// Auto-finalize if tournament ended but not yet finalized
	const isEnded = new Date(tournament.end_date) < new Date();
	const needsFinalization = isEnded && tournament.status !== 'completed';

	if (needsFinalization) {
		try {
			const finalizeResponse = await fetch(
				`/api/games/minesweeper/tournaments/${tournamentId}/finalize`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			if (finalizeResponse.ok) {
				// Refresh tournament data after finalization
				const refreshResponse = await fetch(`/api/games/minesweeper/tournaments/${tournamentId}`);
				if (refreshResponse.ok) {
					const refreshed = await refreshResponse.json();
					tournament.status = refreshed.tournament.status;
				}
			}
		} catch (err) {
			// Silent fail - finalization will happen next time
			console.error('[Tournament] Auto-finalization failed:', err);
		}
	}

	// Fetch standings
	const standingsResponse = await fetch(
		`/api/games/minesweeper/tournaments/${tournamentId}/standings?limit=100`
	);

	let standings: TournamentStanding[] = [];
	let totalParticipants = 0;

	if (standingsResponse.ok) {
		const standingsData = await standingsResponse.json();
		standings = standingsData.standings || [];
		totalParticipants = standingsData.total_participants || 0;
	}

	return {
		tournament,
		standings,
		totalParticipants
	};
};
