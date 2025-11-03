/**
 * Teacher Warnings Page - Server-Side Logic
 * ===========================================
 *
 * Handles data loading for the teacher warnings management system.
 *
 * FEATURES:
 * - Inherits academic periods from parent dashboard layout (no redundant queries)
 * - Classes loaded via cache-first in teacher/+layout.svelte
 * - Student warnings loaded on-demand via cache in page component
 * - Security: Verified by parent layouts
 *
 * PERFORMANCE OPTIMIZATION (2025-11-03):
 * ======================================
 * Removed all database queries from this page load function.
 * Academic periods now loaded once in parent dashboard layout, eliminating
 * 3 database calls on every page navigation.
 *
 * ROUTES:
 * - Load: GET /dashboard/teacher/warnings
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Load function - Inherits all data from parent layouts
 * - Academic periods come from /dashboard/+layout.server.ts
 * - Classes loaded client-side via cache-first in teacher/+layout.svelte
 * - Warnings loaded on-demand in page component via cache
 */
export const load: PageServerLoad = async ({ parent, locals }) => {
	const { user, profile } = locals;

	if (!user || !profile || profile.role !== 'teacher') {
		throw error(403, 'Unauthorized');
	}

	// Get periods from parent dashboard layout (already loaded)
	const { currentPeriod, allPeriods } = await parent();

	return {
		currentPeriod,
		allPeriods
	};
};
