/**
 * Admin Backup Page - Server Load
 *
 * Fetches backup statistics for the admin backup UI
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBackupStats } from '$lib/server/admin/exercise-backup';

export const load: PageServerLoad = async ({ locals }) => {
	// Authorization check
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	if (locals.profile.role !== 'admin') {
		throw error(403, 'Acces reserve aux administrateurs');
	}

	try {
		const stats = await getBackupStats(locals.supabase);

		return {
			stats,
			adminEmail: locals.profile.email ?? 'admin'
		};
	} catch (err) {
		console.error('Error loading backup stats:', err);
		throw error(500, 'Erreur lors du chargement des statistiques');
	}
};
