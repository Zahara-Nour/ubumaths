/**
 * Public Guess Who Game Page - Server Load
 * =========================================
 *
 * This page is publicly accessible, so authentication is optional.
 * - If user is logged in: Pass user session for game creation
 * - If user is not logged in: Show login prompt when trying to create game
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	// If user is logged in, return their data
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
