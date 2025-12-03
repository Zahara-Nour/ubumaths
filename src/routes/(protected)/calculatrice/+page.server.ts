/**
 * Calculatrice NumWorks - Server Load
 *
 * Access restricted to students and teachers only.
 * Admins are excluded as per requirements.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	// Only students and teachers can access
	if (profile.role !== 'student' && profile.role !== 'teacher') {
		throw error(403, 'Accès réservé aux élèves et enseignants');
	}

	return {
		// Profile is available from parent, no additional data needed
	};
};
