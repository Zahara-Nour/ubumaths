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
	justFinalized?: boolean;
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
	let justFinalized = false;

	console.log('[Tournament] Status check:', {
		tournamentId,
		dbStatus: tournament.status,
		isEnded,
		needsFinalization
	});

	if (needsFinalization) {
		try {
			console.log('[Tournament] Attempting auto-finalization...');
			const finalizeResponse = await fetch(
				`/api/games/minesweeper/tournaments/${tournamentId}/finalize`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			const finalizeResult = await finalizeResponse.json().catch(() => null);
			console.log('[Tournament] Finalization response:', {
				ok: finalizeResponse.ok,
				status: finalizeResponse.status,
				result: finalizeResult
			});

			if (finalizeResponse.ok) {
				justFinalized = true;
				// Refresh tournament data after finalization
				const refreshResponse = await fetch(`/api/games/minesweeper/tournaments/${tournamentId}`);
				if (refreshResponse.ok) {
					const refreshed = await refreshResponse.json();
					tournament.status = refreshed.tournament.status;
				}
			}
		} catch (err) {
			console.error('[Tournament] Auto-finalization failed:', err);
		}
	}

	// Debug: Check games state directly
	const { data: gamesDebug } = await locals.supabase
		.from('minesweeper_tournament_games')
		.select('id, status, score, grid_3bv, time_seconds')
		.eq('tournament_id', tournamentId)
		.eq('status', 'won');

	const gamesWithNullScore = gamesDebug?.filter((g) => g.score === null) || [];

	console.log('[Tournament] Games state:', {
		tournamentId,
		wonGames: gamesDebug?.length || 0,
		gamesWithScore: gamesDebug?.filter((g) => g.score !== null).length || 0,
		gamesWithNullScore: gamesWithNullScore.length,
		games: gamesDebug
	});

	// Auto-backfill scores for games that have NULL score (pre-3BV migration games)
	if (gamesWithNullScore.length > 0) {
		console.log('[Tournament] Backfilling scores for', gamesWithNullScore.length, 'games...');
		const { error: backfillError } = await locals.supabase.rpc('backfill_tournament_scores', {
			p_tournament_id: tournamentId
		});
		if (backfillError) {
			console.error('[Tournament] Backfill failed:', backfillError);
		} else {
			console.log('[Tournament] Backfill successful');
		}
	}

	// If tournament is already completed, check if rewards need to be redistributed
	// (this handles the case where finalization ran with empty standings due to NULL scores)
	if (tournament.status === 'completed' && !justFinalized) {
		console.log('[Tournament] Checking if rewards need redistribution...');
		const { data: redistributeResult, error: redistributeError } = await locals.supabase.rpc(
			'redistribute_tournament_rewards',
			{ p_tournament_id: tournamentId }
		);

		if (redistributeError) {
			// Expected error if rewards were already distributed
			if (!redistributeError.message?.includes('already been distributed')) {
				console.error('[Tournament] Redistribution failed:', redistributeError.message);
			} else {
				console.log('[Tournament] Rewards were already distributed');
			}
		} else if (redistributeResult?.[0]?.rewards_distributed > 0) {
			console.log(
				'[Tournament] Redistributed',
				redistributeResult[0].rewards_distributed,
				'rewards'
			);
			justFinalized = true; // Show toast to user
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
		console.log('[Tournament] Standings:', { count: standings.length, totalParticipants });
	}

	return {
		tournament,
		standings,
		totalParticipants,
		justFinalized
	};
};
