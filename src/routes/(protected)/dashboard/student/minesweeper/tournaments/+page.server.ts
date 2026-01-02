/**
 * Minesweeper Tournaments List Page - Server Load
 * ================================================
 *
 * Loads active and upcoming tournaments for the current student.
 * Tournaments are filtered by:
 * - Student's class membership (for class-scoped tournaments)
 * - Global tournaments (open to all)
 *
 * Data loaded:
 * - Active tournaments with student's game stats
 * - Upcoming tournaments (scheduled but not started)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const { user, profile } = locals;

	// Must be authenticated student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Acces refuse');
	}

	try {
		// Fetch active and upcoming tournaments
		const tournamentsRes = await fetch(
			'/api/games/minesweeper/tournaments/active?include_upcoming=true&limit=50'
		);

		if (!tournamentsRes.ok) {
			const errorData = await tournamentsRes.json().catch(() => ({}));
			console.error('[Tournaments] Error loading tournaments:', errorData);
			throw error(500, 'Impossible de charger les tournois');
		}

		const { tournaments } = await tournamentsRes.json();

		return {
			tournaments: tournaments || [],
			currentUserId: user.id
		};
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Tournaments] Error loading page data:', err);
		throw error(500, 'Erreur lors du chargement de la page');
	}
};
