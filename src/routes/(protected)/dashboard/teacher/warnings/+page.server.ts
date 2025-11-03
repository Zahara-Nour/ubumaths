/**
 * Teacher Warnings Page - Server-Side Logic
 * ===========================================
 *
 * Handles data loading for the teacher warnings management system.
 *
 * FEATURES:
 * - Load teacher's classes with students
 * - Load current academic period
 * - Load all periods for history viewing
 * - Security: Verify teacher authentication and ownership
 *
 * ROUTES:
 * - Load: GET /dashboard/teacher/warnings
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getCurrentAcademicPeriod,
	getSchoolYearPeriods,
	getActiveSchoolYear
} from '$lib/server/warnings';

/**
 * Load function - Loads period data only
 * Classes come from parent layout (cache-first)
 * Student warnings come from cache (hydrated by layout)
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	if (!user || !profile || profile.role !== 'teacher') {
		throw error(403, 'Unauthorized');
	}

	// Classes come from parent layout (cache-first)
	// Only load period-specific data here
	const [currentPeriod, activeYear] = await Promise.all([
		profile.school_id
			? getCurrentAcademicPeriod({ schoolId: profile.school_id, supabase }).catch(() => null)
			: Promise.resolve(null),
		profile.school_id
			? getActiveSchoolYear({ schoolId: profile.school_id, supabase }).catch(() => null)
			: Promise.resolve(null)
	]);

	const allPeriods = activeYear
		? await getSchoolYearPeriods({ schoolYearId: activeYear.id, supabase }).catch(() => [])
		: [];

	return {
		currentPeriod,
		allPeriods
	};
};
