/**
 * Teacher Minesweeper Tournaments List - Server-Side Logic
 * ==========================================================
 *
 * Loads the list of tournaments created by the teacher.
 *
 * FEATURES:
 * - Fetch tournaments from API with status filter
 * - Include participant counts
 * - Verify teacher role
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Tournament, TournamentStatus } from '$lib/types/minesweeper';

interface TournamentWithCount extends Tournament {
	participant_count: number;
	is_creator: boolean;
}

export interface TournamentsPageData {
	tournaments: TournamentWithCount[];
}

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
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

	// Get optional status filter from URL
	const statusParam = url.searchParams.get('status');
	const validStatuses: TournamentStatus[] = ['scheduled', 'active', 'completed', 'cancelled'];
	const status =
		statusParam && validStatuses.includes(statusParam as TournamentStatus) ? statusParam : null;

	// Fetch tournaments from API
	const apiUrl = new URL('/api/games/minesweeper/tournaments', url.origin);
	if (status) {
		apiUrl.searchParams.set('status', status);
	}
	apiUrl.searchParams.set('limit', '100');

	const response = await fetch(apiUrl.toString());

	if (!response.ok) {
		console.error('Failed to fetch tournaments:', await response.text());
		return { tournaments: [] };
	}

	const { tournaments } = await response.json();

	// Filter to only show tournaments created by this teacher
	const teacherTournaments = (tournaments || []).filter((t: TournamentWithCount) => t.is_creator);

	return {
		tournaments: teacherTournaments
	};
};
