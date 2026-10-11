import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

/**
 * Classement des énigmes de l'école de l'élève.
 *
 * Lu par `riddle_school_leaderboard` (SECURITY DEFINER, bornée à l'école, comptes de
 * test exclus) : prénom et score seulement — décision de David (2026-10-11). L'ancienne
 * lecture de la vue `riddle_progress` avec les droits de l'élève mettait tous ses
 * camarades à 0 (la RLS ne lui montre que ses propres tentatives).
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	const { data, error: leaderboardError } = await supabase.rpc('riddle_school_leaderboard', {
		p_limit: 50
	});

	if (leaderboardError) {
		console.error('Lecture impossible :', leaderboardError);
		throw error(500, 'Impossible de charger le classement');
	}

	const leaderboard = data ?? [];
	const currentUserRank = leaderboard.find((entry) => entry.is_me)?.rank ?? null;

	return { leaderboard, currentUserRank };
};
