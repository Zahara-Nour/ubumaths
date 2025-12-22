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
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Acces reserve aux administrateurs');
	}

	try {
		const stats = await getBackupStats(locals.supabase);
		return json(stats);
	} catch (err) {
		console.error('Error fetching backup stats:', err);
		throw error(500, 'Erreur lors de la recuperation des statistiques');
	}
};
