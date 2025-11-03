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
import {
	getCurrentAcademicPeriod,
	getSchoolYearPeriods,
	getActiveSchoolYear
} from '$lib/server/warnings';

const logger = createLogger('dashboard/+layout.server.ts');

export const load: LayoutServerLoad = async ({ locals }) => {
	// Get user and profile from locals (loaded in hooks.server.ts)
	// They are already authenticated and verified by (protected) layout
	const { user, profile } = locals;

	// TypeScript safety: user and profile are guaranteed to exist after (protected) layout auth check
	// But we add a runtime check for extra safety
	if (!user || !profile) {
		throw new Error('User or profile missing after authentication - this should never happen');
	}
	console.log('🎨 [DASHBOARD LAYOUT SERVER] Exécution');

	logger.trace('Dashboard accessed by:', user.email, 'Role:', profile.role);

	/**
	 * TEACHER-SPECIFIC DATA LOADING
	 * ==============================
	 *
	 * For teachers, we load all their classes with enriched data:
	 * - Basic class information (name, description, join_code, etc.)
	 * - Student count (number of enrolled students)
	 * - Class schedules (weekly recurring schedule entries)
	 * - Academic periods (current period + all periods for history)
	 *
	 * This data is used by:
	 * - TeacherDashboard: Class selector and "Find Current Class" feature
	 * - Teacher stats cards: Display total classes and students
	 * - Warnings page: Period selection and historical data
	 * - Future teacher features requiring class/period context
	 *
	 * PERFORMANCE OPTIMIZATION (2025-10-18):
	 * ======================================
	 * Previously used N+1 queries (1 for classes + 2 per class for count/schedules).
	 * Now uses a single optimized query that fetches all data at once using RPC.
	 *
	 * For 3 classes: 7 queries → 1 query (85% reduction)
	 * Expected speedup: 70-80% faster dashboard load
	 *
	 * PERFORMANCE OPTIMIZATION (2025-11-03):
	 * ======================================
	 * Moved academic periods loading to parent layout to prevent redundant
	 * database calls on every page navigation. Periods loaded once per dashboard
	 * session instead of on every warnings/rewards page visit.
	 */
	let teacherClasses: { id: string; name: string; level?: string; student_count?: number }[] = [];
	let currentPeriod = null;
	let allPeriods: unknown[] = [];

	if (profile.role === 'teacher') {
		const supabase = locals.supabase;

		try {
			// Load classes and periods in parallel
			const [classes, period, activeYear] = await Promise.all([
				getTeacherClassesWithCounts(profile.id, supabase),
				profile.school_id
					? getCurrentAcademicPeriod({ schoolId: profile.school_id, supabase }).catch(() => null)
					: Promise.resolve(null),
				profile.school_id
					? getActiveSchoolYear({ schoolId: profile.school_id, supabase }).catch(() => null)
					: Promise.resolve(null)
			]);

			teacherClasses = classes;
			currentPeriod = period;

			// Load all periods for the active year
			if (activeYear) {
				allPeriods = await getSchoolYearPeriods({
					schoolYearId: activeYear.id,
					supabase
				}).catch(() => []);
			}
		} catch (err) {
			logger.error('Error fetching teacher data:', err);

			// Fallback to empty arrays on error
			teacherClasses = [];
			currentPeriod = null;
			allPeriods = [];
		}
	}

	// Pass data to child routes
	// All values will be empty/null for non-teachers
	return {
		teacherClasses,
		currentPeriod,
		allPeriods
	};
};
