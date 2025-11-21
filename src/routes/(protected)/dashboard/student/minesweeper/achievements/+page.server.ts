import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

/**
 * Load achievement progress for the authenticated student
 *
 * This page server function fetches all achievements with their unlock status
 * from the `/api/games/minesweeper/achievements/progress` endpoint.
 *
 * **Security**:
 * - Relies on layout's authentication check (student role required)
 * - API endpoint handles student-specific filtering via RLS
 *
 * **Data Returned**:
 * - `achievements`: Array of all achievements with unlock status
 * - `stats`: Unlock statistics (total unlocked, total possible, percentage)
 */
export const load: PageServerLoad = async ({ locals, fetch }) => {
	const { user, profile } = locals;

	// Verify authentication and role (should be guaranteed by layout)
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch achievement progress from API
		const response = await fetch('/api/games/minesweeper/achievements/progress');

		if (!response.ok) {
			throw error(response.status, 'Impossible de charger les succès');
		}

		const { achievements } = await response.json();

		// Calculate stats
		const unlocked = achievements.filter((a: { is_unlocked: boolean }) => a.is_unlocked);
		const stats = {
			total_unlocked: unlocked.length,
			total_possible: achievements.length,
			progress_percentage: Math.round((unlocked.length / achievements.length) * 100)
		};

		return {
			achievements,
			stats
		};
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error loading achievements:', err);
		throw error(500, 'Erreur lors du chargement des succès');
	}
};
