import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Get pending VIP activation requests count for badge
	const { count } = await locals.supabase
		.from('vip_activation_requests')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'pending')
		.eq('teacher_id', user.id);

	return {
		pendingVipRequestsCount: count || 0
	};
};
