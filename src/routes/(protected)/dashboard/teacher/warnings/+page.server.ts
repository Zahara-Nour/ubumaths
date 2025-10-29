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
// Use cached version for better performance (10min TTL)
import { getTeacherStudents } from '$lib/server/cache/students';
import {
	getCurrentAcademicPeriod,
	getSchoolYearPeriods,
	getActiveSchoolYear
} from '$lib/server/warnings';

/**
 * Load function - Fetches teacher's classes, students, and academic periods
 *
 * PROCESS:
 * 1. Verify user is authenticated and has teacher role
 * 2. Fetch all active classes owned by this teacher with students
 * 3. Fetch current academic period (for today's date)
 * 4. Fetch all periods for the active school year (for history viewing)
 * 5. Return enriched data for the page
 *
 * RETURNS:
 * {
 *   classes: ClassWithStudents[] - Array of classes with full student data
 *   currentPeriod: AcademicPeriod | null - Current active period
 *   allPeriods: AcademicPeriod[] - All periods for current school year
 * }
 */
export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	// Get user and profile from parent (protected) layout
	const { user, profile } = await parent();

	if (!user || !profile) {
		throw error(401, 'Unauthorized');
	}

	// Verify user is a teacher (not student or admin accessing this route)
	if (profile.role !== 'teacher') {
		throw error(403, 'Only teachers can access this page');
	}

	// Verify teacher has a school_id (required for academic periods)
	if (!profile.school_id) {
		console.warn('[Warnings Page] Teacher has no school_id, cannot load periods');
		// Load classes but return empty periods (classId=undefined loads all classes)
		const classesWithStudents = await getTeacherStudents(user.id, undefined, supabase);
		return {
			classes: classesWithStudents,
			currentPeriod: null,
			allPeriods: []
		};
	}

	try {
		// Fetch all data in parallel for performance
		// classId=undefined loads all classes with their students (cached, 10min TTL)
		const [classesWithStudents, currentPeriod, activeYear] = await Promise.all([
			getTeacherStudents(user.id, undefined, supabase),
			getCurrentAcademicPeriod({ schoolId: profile.school_id, supabase }),
			getActiveSchoolYear({ schoolId: profile.school_id, supabase })
		]);

		// Fetch all periods for the active school year (for history dropdown)
		const allPeriods = activeYear
			? await getSchoolYearPeriods({
					schoolYearId: activeYear.id,
					supabase
				})
			: [];

		return {
			classes: classesWithStudents,
			currentPeriod,
			allPeriods
		};
	} catch (err) {
		console.error('[Warnings Page] Error loading data:', err);

		// If error is from helper functions, re-throw
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error fallback
		throw error(500, 'Failed to load warnings data');
	}
};
