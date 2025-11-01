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
import { getTeacherClassesWithCounts } from '$lib/server/students';
import { loadMonitor } from '$lib/utils/loadTracer';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '$lib/types/database';

const logger = createLogger('dashboard/+layout.server.ts');

export const load: LayoutServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { parent } = event;
	const { locals } = event;

	// Get user and profile from parent (protected) layout
	// They are already authenticated and verified
	const parentData = await parent();
	const user = parentData.user as User | null;
	const profile = parentData.profile as Profile | null;

	// TypeScript safety: user and profile are guaranteed to exist after (protected) layout auth check
	// But we add a runtime check for extra safety
	if (!user || !profile) {
		throw new Error('User or profile missing after authentication - this should never happen');
	}

	logger.trace('Dashboard accessed by:', user.email, 'Role:', profile.role);

	/**
	 * TEACHER-SPECIFIC DATA LOADING
	 * ==============================
	 *
	 * For teachers, we load all their classes with enriched data:
	 * - Basic class information (name, description, join_code, etc.)
	 * - Student count (number of enrolled students)
	 * - Class schedules (weekly recurring schedule entries)
	 *
	 * This data is used by:
	 * - TeacherDashboard: Class selector and "Find Current Class" feature
	 * - Teacher stats cards: Display total classes and students
	 * - Future teacher features requiring class context
	 *
	 * PERFORMANCE OPTIMIZATION (2025-10-18):
	 * ======================================
	 * Previously used N+1 queries (1 for classes + 2 per class for count/schedules).
	 * Now uses a single optimized query that fetches all data at once using RPC.
	 *
	 * For 3 classes: 7 queries → 1 query (85% reduction)
	 * Expected speedup: 70-80% faster dashboard load
	 */
	let teacherClasses: { id: string; name: string; level?: string; student_count?: number }[] = [];

	if (profile.role === 'teacher') {
		const { supabase } = locals;

		// Get teacher's classes with student counts and schedules
		// Uses unified helper that handles test mode filtering automatically
		try {
			teacherClasses = await getTeacherClassesWithCounts(profile.id, supabase);
		} catch (err) {
			logger.error('Error fetching teacher classes:', err);

			// Fallback to empty array on error
			teacherClasses = [];
		}
	}

	// Pass data to child routes
	// teacherClasses will be empty array for non-teachers
	return {
		teacherClasses
	};
});
