import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { supabase } = await requireRole(locals, 'teacher');

	// Get pending message reports count for badge
	const { data: pendingCount, error } = await supabase.rpc('get_pending_reports_count');

	if (error) {
		console.error('Failed to fetch pending reports count:', error);
	}

	return {
		pendingReportsCount: pendingCount ?? 0
	};
};
