/**
 * Grapheur - Server Load
 *
 * Protected route for the graphing calculator (Grapheur).
 * Access restricted to students, teachers, and admins.
 *
 * This route inherits authentication from (protected)/+layout.server.ts,
 * so we only need to verify role permissions.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	// Only students, teachers, and admins can access
	// (Admins included for testing and support purposes)
	if (profile.role !== 'student' && profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux élèves, enseignants et administrateurs');
	}

	return {
		// Profile is available from parent, no additional data needed
	};
};
