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

export const load: LayoutServerLoad = async ({ parent, locals }) => {
	// Get user and profile from parent (protected) layout
	// They are already authenticated and verified
	const { user, profile } = await parent();

	// TypeScript safety: user and profile are guaranteed to exist after (protected) layout auth check
	// But we add a runtime check for extra safety
	if (!user || !profile) {
		throw new Error('User or profile missing after authentication - this should never happen');
	}

	logger.info('Dashboard accessed by:', user.email, 'Role:', profile.role);

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
	 * PERFORMANCE NOTE:
	 * This uses Promise.all() to fetch student counts and schedules in parallel
	 * for all classes, which is efficient for teachers with multiple classes.
	 */
	let teacherClasses: any[] = [];

	if (profile.role === 'teacher') {
		const { supabase } = locals;

		// Fetch all active classes taught by this teacher
		const { data: classes, error: classesError } = await supabase
			.from('classes')
			.select('*')
			.eq('teacher_id', profile.id)
			.eq('is_active', true)
			.order('name'); // Sort alphabetically for dropdown

		if (classesError) {
			logger.error('Error fetching teacher classes:', classesError);
		} else if (classes) {
			// Enrich each class with student count and schedules
			// Uses Promise.all for parallel fetching (faster than sequential)
			teacherClasses = await Promise.all(
				classes.map(async (cls) => {
					// Fetch student count for this class
					// Uses count='exact' with head=true for performance (no data returned, just count)
					const { count, error: countError } = await supabase
						.from('class_members')
						.select('*', { count: 'exact', head: true })
						.eq('class_id', cls.id);

					if (countError) {
						logger.error(`Error counting students for class ${cls.id}:`, countError);
					}

					// Fetch class schedules (weekly recurring entries)
					// Ordered by day (Sunday-Thursday) and start time for logical display
					const { data: schedules, error: schedulesError } = await supabase
						.from('class_schedules')
						.select('*')
						.eq('class_id', cls.id)
						.order('day_of_week') // 0=Sunday, 1=Monday, ..., 4=Thursday
						.order('start_time'); // HH:MM:SS format

					if (schedulesError) {
						logger.error(`Error fetching schedules for class ${cls.id}:`, schedulesError);
					}

					// Return enriched class object
					return {
						...cls, // Original class fields
						student_count: count || 0, // Number of enrolled students
						schedules: schedules || [] // Array of schedule entries (may be empty)
					};
				})
			);
		}
	}

	// Pass data to child routes
	// teacherClasses will be empty array for non-teachers
	return {
		teacherClasses
	};
};
