/**
 * Admin Exercise Backup Stats API
 * ================================
 *
 * Endpoints:
 * - GET: Get record counts for all exercise tables
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { getBackupStats } from '$lib/server/admin/exercise-backup';

/**
 * GET /api/admin/exercises/backup-stats
 *
 * Get statistics for exercise tables (for backup UI)
 *
 * Response: {
 *   exercises: number,
 *   exercise_templates: number,
 *   exercise_favorites: number,
 *   exercise_share_tokens: number,
 *   total: number
 * }
 */
export const GET: RequestHandler = async ({ locals }) => {
	// ✅ SECURITY: admin elevation OR real admin login. Privileged reads run via the
	// returned admin-context client so RLS attributes them to the admin.
	const { supabase } = await requireAdmin(locals);

	try {
		const stats = await getBackupStats(supabase);
		return json(stats);
	} catch (err) {
		console.error('Error fetching backup stats:', err);
		throw error(500, 'Erreur lors de la recuperation des statistiques');
	}
};
