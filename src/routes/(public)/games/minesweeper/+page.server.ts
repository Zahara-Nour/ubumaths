/**
 * Public Minesweeper Game Page - Server Load
 * ==========================================
 *
 * This page is publicly accessible, so authentication is optional.
 * - If user is logged in: Pass user session for scoring and stats
 * - If user is not logged in: Pass null (localStorage-based gameplay)
 *
 * No database queries are needed here - the game logic handles both
 * authenticated and non-authenticated users gracefully.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	// If user is logged in, return their profile for integration with minesweeperStore
	// This is optional - the client can handle null user gracefully
	if (user && profile) {
		return {
			user,
			profile,
			isAuthenticated: true
		};
	}

	// Public user - return minimal data
	return {
		user: null,
		profile: null,
		isAuthenticated: false
	};
};
