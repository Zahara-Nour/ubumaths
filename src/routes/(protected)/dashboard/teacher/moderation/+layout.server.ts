import type { LayoutServerLoad } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('(protected)/dashboard/teacher/moderation/+layout.server');

export const load: LayoutServerLoad = async ({ locals }) => {
	await requireRole(locals, 'teacher');

	// Get pending message reports count for badge
	const { data: pendingCount, error } = await locals.supabase.rpc('get_pending_reports_count');

	if (error) {
		logger.error('Failed to fetch pending reports count:', error);
	}

	// Compteur illisible : `null` (inconnu), jamais 0 (écart T20).
	return {
		pendingReportsCount: error ? null : (pendingCount ?? 0)
	};
};
