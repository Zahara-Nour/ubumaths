/**
 * Python Playground Page - Server Load
 * =====================================
 *
 * This page is publicly accessible, so authentication is optional.
 * - If user is logged in: Pass user session for cloud save/load features
 * - If user is not logged in: Pass null (localStorage-based storage only)
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	// If user is logged in, return their profile for cloud features
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
