/**
 * Admin Backup Page - Server Load
 *
 * Fetches backup statistics for the admin backup UI
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBackupStats } from '$lib/server/admin/exercise-backup';
import { requireAdmin } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/backup/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	// Authorization check (admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	try {
		const stats = await getBackupStats(supabase);

		return {
			stats,
			adminEmail: locals.profile?.email ?? 'admin'
		};
	} catch (err) {
		logger.error('Error loading backup stats:', err);
		throw error(500, 'Erreur lors du chargement des statistiques');
	}
};
