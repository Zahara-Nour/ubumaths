/**
 * Dashboard Layout Server Load
 * =============================
 *
 * Loads additional dashboard-specific data for all dashboard routes.
 * This runs on every dashboard page load.
 *
 * For teachers:
 * - Loads count of pending VIP card activation requests (for sidebar badge)
 *
 * For students:
 * - Checks if marketplace is enabled for their class
 *
 * For admins:
 * - Returns default values (not applicable)
 */

import type { LayoutServerLoad } from './$types';
import { countPendingActivationRequests } from '$lib/server/vip-card-queries';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { supabase, profile } = locals;

	// Only count pending requests for teachers
	let pendingVipRequestsCount = 0;
	// Check if marketplace is enabled for students
	let marketplaceEnabled = false;

	if (profile?.role === 'teacher' && profile?.id) {
		try {
			pendingVipRequestsCount = await countPendingActivationRequests(supabase, profile.id);
		} catch (error) {
			console.error('❌ [dashboard/+layout.server.ts] Error loading pending VIP requests:', error);
			// Don't throw - just return 0 count on error
			pendingVipRequestsCount = 0;
		}
	}

	if (profile?.role === 'student' && profile?.id) {
		try {
			marketplaceEnabled = await isMarketplaceEnabled(supabase, profile.id);
		} catch (error) {
			console.error('❌ [dashboard/+layout.server.ts] Error checking marketplace status:', error);
			// Don't throw - just return false on error
			marketplaceEnabled = false;
		}
	}

	return {
		pendingVipRequestsCount,
		marketplaceEnabled
	};
};
