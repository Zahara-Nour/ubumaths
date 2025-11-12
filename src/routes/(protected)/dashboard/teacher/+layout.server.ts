/**
 * Teacher Dashboard Layout (Server)
 * ==================================
 *
 * Pre-loads teacher data server-side and returns it for cache hydration.
 *
 * HYDRATION STRATEGY:
 * This layout fetches data on the server (optimized database queries) and passes
 * it to the client. The client layout (+layout.svelte) then hydrates the
 * teacherCache with this data, avoiding redundant API calls.
 *
 * WORKFLOW:
 * 1. Server: Fetch teacher's classes with counts from database
 * 2. Server: Fetch current academic period and all periods for active school year
 * 3. Server: Return both as layout data
 * 4. Client: Hydrate teacherCache with server data
 * 5. Child pages: Access cached data instantly (no API calls)
 *
 * DATA LOADED:
 * - Classes with student counts and schedules (via RPC function)
 * - Current academic period (based on today's date)
 * - All periods for active school year (for period selector)
 *
 * PERFORMANCE:
 * - 2 database queries on server (classes + periods)
 * - 0 API calls on client (data already available)
 * - Instant page loads for teacher dashboard
 *
 * ERROR HANDLING:
 * - Non-critical failures (periods) don't crash the page
 * - Returns minimal data to ensure dashboard remains functional
 */

import type { LayoutServerLoad } from './$types';
import type { ClassWithData } from '$lib/server/students';
import type { Database } from '$lib/types/database';
import { error } from '@sveltejs/kit';
import { getTeacherClassesWithCounts } from '$lib/server/students';
import {
	getCurrentAcademicPeriod,
	getActiveSchoolYear,
	getSchoolYearPeriods
} from '$lib/server/warnings';

type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	const { user, profile, supabase } = locals;

	// Must be logged in as teacher
	if (!user || !profile || profile.role !== 'teacher') {
		throw error(403, 'Access denied');
	}

	// Mark this data as dependent on 'teacher:classes' for reactive invalidation
	depends('teacher:classes');

	try {
		// Fetch classes with counts using optimized RPC function
		let classes: ClassWithData[] = [];
		try {
			classes = await getTeacherClassesWithCounts(user.id, supabase);
			console.log(`[Teacher Layout Server] ✅ Loaded ${classes.length} classes`);
		} catch (err) {
			console.error('[Teacher Layout Server] Error fetching classes:', err);
			// Non-critical - continue with empty classes
		}

		// Fetch academic periods (if school_id exists)
		let currentPeriod: AcademicPeriod | null = null;
		let allPeriods: AcademicPeriod[] = [];

		if (profile.school_id) {
			try {
				// Fetch current period and active year in parallel
				const [period, activeYear] = await Promise.all([
					getCurrentAcademicPeriod({ schoolId: profile.school_id, supabase }).catch(() => null),
					getActiveSchoolYear({ schoolId: profile.school_id, supabase }).catch(() => null)
				]);

				currentPeriod = period;

				// Fetch all periods for active year (if exists)
				if (activeYear) {
					allPeriods = await getSchoolYearPeriods({
						schoolYearId: activeYear.id,
						supabase
					}).catch(() => []);
				}

				console.log(
					`[Teacher Layout Server] ✅ Loaded periods (current: ${currentPeriod?.name || 'none'}, total: ${allPeriods.length})`
				);
			} catch (err) {
				console.error('[Teacher Layout Server] Error fetching periods:', err);
				// Non-critical - continue with null/empty
			}
		}

		// Return data for cache hydration on client
		// The +layout.svelte will call teacherCache.hydrateAllClasses() and setPeriods()
		return {
			classes,
			currentPeriod,
			allPeriods
		};
	} catch (err) {
		console.error('[Teacher Layout Server] Unexpected error loading teacher dashboard:', err);
		// Return minimal data to prevent crashes
		return {
			classes: [],
			currentPeriod: null,
			allPeriods: []
		};
	}
};
