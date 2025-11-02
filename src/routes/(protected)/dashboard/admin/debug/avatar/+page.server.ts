/**
 * Avatar Debug Page - Server Load Function
 *
 * PURPOSE:
 * Provides comprehensive debugging information for troubleshooting avatar display issues
 * with Google OAuth authentication.
 *
 * RETURNS:
 * - user: User object with metadata (including 'picture' and 'avatar_url' fields)
 * - profile: User profile from database (including saved avatar_url)
 * - userMetadata: Explicit copy of user metadata for easier inspection
 *
 * ACCESS CONTROL:
 * - Admin only
 *
 * USAGE:
 * Navigate to /dashboard/admin/debug/avatar while authenticated as admin
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			user_metadata: user.user_metadata
		},
		profile,
		userMetadata: user.user_metadata
	};
};
