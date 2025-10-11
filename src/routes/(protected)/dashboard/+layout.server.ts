/**
 * Dashboard Layout Server Load Function
 * ======================================
 *
 * This layout handles dashboard-specific configuration.
 *
 * AUTHENTICATION:
 * --------------
 * Authentication is now handled by the parent (protected) layout.
 * All routes under (protected)/ are automatically authenticated.
 * No need to call requireAuth() here - it's already done!
 *
 * ROLE-BASED DASHBOARD:
 * --------------------
 * The profile (with role) is inherited from parent layouts:
 * - Root layout (+layout.server.ts) fetches profile from database
 * - (protected) layout verifies authentication and profile exists
 * - This layout just passes data through
 *
 * The profile.role field is used by:
 * - +page.svelte to render the correct dashboard view (Student/Teacher/Admin)
 * - +layout.svelte to display user info in the header
 * - Child routes for role-based access control (e.g., admin-only pages)
 *
 * INHERITED BY:
 * ------------
 * - /dashboard/+page.svelte (main dashboard with role-based views)
 * - /dashboard/classes/* (class management)
 * - /dashboard/admin/* (admin panel)
 * - Any future dashboard sub-routes
 */

import type { LayoutServerLoad } from './$types';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('dashboard/+layout.server.ts');

export const load: LayoutServerLoad = async ({ parent }) => {
	// Get user and profile from parent (protected) layout
	// They are already authenticated and verified
	const { user, profile } = await parent();

	// TypeScript safety: user and profile are guaranteed to exist after (protected) layout auth check
	// But we add a runtime check for extra safety
	if (!user || !profile) {
		throw new Error('User or profile missing after authentication - this should never happen');
	}

	logger.info('Dashboard accessed by:', user.email, 'Role:', profile.role);

	// Pass through to child routes
	// (user and profile are already in parent data, but we can add dashboard-specific data here)
	return {
		// Add any dashboard-specific data here in the future
		// e.g., dashboardSettings, notifications, etc.
	};
};
