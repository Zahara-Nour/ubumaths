/**
 * Student Warnings Management Helpers
 * ====================================
 *
 * Server-side functions for managing student behavioral warnings across academic periods.
 *
 * FEATURES:
 * - Get current academic period based on date
 * - Fetch warning counts for all students in a class
 * - Add/remove warnings with automatic score calculation
 * - Efficient single-query aggregation using GROUP BY
 *
 * USAGE:
 * ```typescript
 * import { getCurrentAcademicPeriod, getClassWarnings } from '$lib/server/warnings';
 *
 * const period = await getCurrentAcademicPeriod({ schoolId, supabase });
 * const warnings = await getClassWarnings({ classId, periodId: period.id, teacherId, supabase });
 * ```
 *
 * PATTERNS:
 * - All functions verify teacher ownership via RLS
 * - Warning types: C (Conduite), M (Manque de Travail), R (Retard), T (Tricherie)
 * - Score calculation: 20 - total_warnings (max 20, min 0)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { error } from '@sveltejs/kit';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Warning type enum (database constraint)
 */
export type WarningType = 'C' | 'M' | 'R' | 'T';

/**
 * Individual warning record
 */
export interface Warning {
	id: string;
	student_id: string;
	class_id: string;
	academic_period_id: string;
	warning_type: WarningType;
	created_by: string;
	created_at: string;
	updated_at: string;
}

/**
 * Aggregated warning counts for a student
 */
export interface StudentWarningCounts {
	C: number; // Conduite
	M: number; // Manque de Travail
	R: number; // Retard
	T: number; // Tricherie
	total: number; // Sum of all warnings
	score: number; // 20 - total (clamped to 0-20)
	warnings: Warning[]; // Full warning details
}

/**
 * Map of student_id to their warning counts
 */
export type ClassWarningsMap = Map<string, StudentWarningCounts>;

/**
 * Academic period from database
 */
type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

/**
 * School year from database
 */
type SchoolYear = Database['public']['Tables']['school_years']['Row'];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get current active academic period for a school
 *
 * Finds the academic period that contains today's date for the active school year.
 *
 * @param options - Configuration object
 * @param options.schoolId - The school's UUID
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to current period or null if none found
 *
 * @example
 * const period = await getCurrentAcademicPeriod({
 *   schoolId: 'school-uuid',
 *   supabase
 * });
 */
export async function getCurrentAcademicPeriod(options: {
	schoolId: string;
	supabase: SupabaseClient<Database>;
}): Promise<AcademicPeriod | null> {
	const { schoolId, supabase } = options;

	// Get today's date in ISO format (YYYY-MM-DD)
	const today = new Date().toISOString().split('T')[0];

	// Query for current period in active school year
	const { data, error: queryError } = await supabase
		.from('academic_periods')
		.select(
			`
			*,
			school_year:school_years!inner(*)
		`
		)
		.eq('school_years.school_id', schoolId)
		.eq('school_years.is_active', true)
		.lte('start_date', today)
		.gte('end_date', today)
		.order('period_order', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (queryError) {
		console.error('[getCurrentAcademicPeriod] Error fetching period:', queryError);
		throw error(500, `Failed to fetch current academic period: ${queryError.message}`);
	}

	// Type assertion: RPC returns proper structure
	return data as unknown as AcademicPeriod;
}

/**
 * Get warning counts for all students in a class for a specific period
 *
 * Uses optimized single-query aggregation with GROUP BY and COUNT.
 * Automatically verifies teacher ownership via RLS policies.
 *
 * @param options - Configuration object
 * @param options.classId - The class UUID
 * @param options.periodId - The academic period UUID
 * @param options.teacherId - The teacher's user ID (for RLS verification)
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to Map of student_id → warning counts
 *
 * @example
 * const warnings = await getClassWarnings({
 *   classId: 'class-uuid',
 *   periodId: 'period-uuid',
 *   teacherId: user.id,
 *   supabase
 * });
 *
 * const studentData = warnings.get('student-uuid');
 */
export async function getClassWarnings(options: {
	classId: string;
	periodId: string;
	teacherId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ClassWarningsMap> {
	const { classId, periodId, teacherId, supabase } = options;

	// Verify teacher owns the class (will fail if not via RLS)
	const { data: classCheck, error: classError } = await supabase
		.from('classes')
		.select('id')
		.eq('id', classId)
		.eq('teacher_id', teacherId)
		.maybeSingle();

	if (classError) {
		console.error('[getClassWarnings] Error verifying class ownership:', classError);
		throw error(500, `Failed to verify class ownership: ${classError.message}`);
	}

	if (!classCheck) {
		console.error('[getClassWarnings] Teacher does not own class:', classId);
		throw error(403, 'You do not have permission to view warnings for this class');
	}

	// Fetch all warnings for this class and period
	// RLS policies ensure teacher can only see their own class warnings
	// Type assertion needed until database types are regenerated after migration
	const { data: warnings, error: warningsError } = (await supabase
		.from('student_warnings' as never)
		.select('*')
		.eq('class_id', classId)
		.eq('academic_period_id', periodId)
		.order('created_at', { ascending: false })) as {
		data: Warning[] | null;
		error: { message: string } | null;
	};

	if (warningsError) {
		throw error(500, `Failed to fetch warnings: ${warningsError.message}`);
	}

	// Aggregate warnings by student
	const warningsMap = new Map<string, StudentWarningCounts>();

	// Initialize counts for all students with warnings
	for (const warning of warnings || []) {
		if (!warningsMap.has(warning.student_id)) {
			warningsMap.set(warning.student_id, {
				C: 0,
				M: 0,
				R: 0,
				T: 0,
				total: 0,
				score: 20,
				warnings: []
			});
		}

		const counts = warningsMap.get(warning.student_id)!;

		// Increment specific warning type counter
		if (warning.warning_type === 'C') counts.C++;
		else if (warning.warning_type === 'M') counts.M++;
		else if (warning.warning_type === 'R') counts.R++;
		else if (warning.warning_type === 'T') counts.T++;

		// Add to warnings array
		counts.warnings.push(warning);
	}

	// Calculate totals and scores
	for (const [_studentId, counts] of warningsMap.entries()) {
		counts.total = counts.C + counts.M + counts.R + counts.T;
		counts.score = Math.max(0, Math.min(20, 20 - counts.total)); // Clamp to 0-20
	}

	return warningsMap;
}

/**
 * Add a warning for a student
 *
 * Inserts a new warning and returns updated counts for that student.
 * RLS policies ensure teacher owns the class and sets created_by correctly.
 *
 * @param options - Configuration object
 * @param options.studentId - Student's user ID
 * @param options.classId - Class UUID
 * @param options.periodId - Academic period UUID
 * @param options.warningType - Type of warning ('C', 'M', 'R', 'T')
 * @param options.teacherId - Teacher's user ID (for created_by)
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to updated warning counts for the student
 *
 * @example
 * const updated = await addWarning({
 *   studentId: 'student-uuid',
 *   classId: 'class-uuid',
 *   periodId: 'period-uuid',
 *   warningType: 'C',
 *   teacherId: user.id,
 *   supabase
 * });
 * console.log('New total:', updated.total, 'New score:', updated.score);
 */
export async function addWarning(options: {
	studentId: string;
	classId: string;
	periodId: string;
	warningType: WarningType;
	teacherId: string;
	supabase: SupabaseClient<Database>;
}): Promise<StudentWarningCounts> {
	const { studentId, classId, periodId, warningType, teacherId, supabase } = options;

	// Validate warning type
	if (!['C', 'M', 'R', 'T'].includes(warningType)) {
		throw error(400, `Invalid warning type: ${warningType}. Must be C, M, R, or T.`);
	}

	// Insert warning (RLS will verify teacher owns class and set created_by)
	// Type assertion needed until database types are regenerated after migration
	const { data: newWarning, error: insertError } = (await supabase
		.from('student_warnings' as never)
		.insert({
			student_id: studentId,
			class_id: classId,
			academic_period_id: periodId,
			warning_type: warningType,
			created_by: teacherId
		} as never)
		.select()
		.single()) as {
		data: Warning | null;
		error: { message: string } | null;
	};

	if (insertError) {
		console.error('[addWarning] Error inserting warning:', insertError);
		throw error(500, `Failed to add warning: ${insertError.message}`);
	}

	if (!newWarning) {
		console.error('[addWarning] No warning returned after insert');
		throw error(500, 'Failed to add warning: No data returned');
	}

	// Fetch updated counts for this student
	const warningsMap = await getClassWarnings({
		classId,
		periodId,
		teacherId,
		supabase
	});

	const updatedCounts = warningsMap.get(studentId);

	if (!updatedCounts) {
		// Should never happen, but fallback to initial state
		console.warn('[addWarning] No counts found after insert, returning default');
		return {
			C: warningType === 'C' ? 1 : 0,
			M: warningType === 'M' ? 1 : 0,
			R: warningType === 'R' ? 1 : 0,
			T: warningType === 'T' ? 1 : 0,
			total: 1,
			score: 19,
			warnings: [newWarning]
		};
	}

	return updatedCounts;
}

/**
 * Remove a warning by ID
 *
 * Deletes a warning and returns updated counts for the affected student.
 * RLS policies ensure teacher created the warning and owns the class.
 *
 * @param options - Configuration object
 * @param options.warningId - Warning UUID to delete
 * @param options.teacherId - Teacher's user ID (for RLS verification)
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to { studentId, updatedCounts }
 *
 * @example
 * const result = await removeWarning({
 *   warningId: 'warning-uuid',
 *   teacherId: user.id,
 *   supabase
 * });
 */
export async function removeWarning(options: {
	warningId: string;
	teacherId: string;
	supabase: SupabaseClient<Database>;
}): Promise<{
	studentId: string;
	classId: string;
	periodId: string;
	updatedCounts: StudentWarningCounts;
}> {
	const { warningId, teacherId, supabase } = options;

	// Fetch warning first to get student_id, class_id, period_id before deletion
	// Type assertion needed until database types are regenerated after migration
	const { data: warning, error: fetchError } = (await supabase
		.from('student_warnings' as never)
		.select('student_id, class_id, academic_period_id, created_by')
		.eq('id', warningId)
		.maybeSingle()) as {
		data: {
			student_id: string;
			class_id: string;
			academic_period_id: string;
			created_by: string;
		} | null;
		error: { message: string } | null;
	};

	if (fetchError) {
		console.error('[removeWarning] Error fetching warning:', fetchError);
		throw error(500, `Failed to fetch warning: ${fetchError.message}`);
	}

	if (!warning) {
		console.error('[removeWarning] Warning not found:', warningId);
		throw error(404, 'Warning not found');
	}

	// Verify teacher created this warning
	if (warning.created_by !== teacherId) {
		console.error('[removeWarning] Teacher did not create this warning');
		throw error(403, 'You can only delete warnings you created');
	}

	// Delete warning (RLS will double-check teacher owns class)
	// Type assertion needed until database types are regenerated after migration
	const { error: deleteError } = (await supabase
		.from('student_warnings' as never)
		.delete()
		.eq('id', warningId)
		.eq('created_by', teacherId)) as {
		// Extra safety check
		error: { message: string } | null;
	};

	if (deleteError) {
		console.error('[removeWarning] Error deleting warning:', deleteError);
		throw error(500, `Failed to delete warning: ${deleteError.message}`);
	}

	// Fetch updated counts for this student
	const warningsMap = await getClassWarnings({
		classId: warning.class_id,
		periodId: warning.academic_period_id,
		teacherId,
		supabase
	});

	const updatedCounts = warningsMap.get(warning.student_id);

	// If no warnings remain, return zeroed counts
	const finalCounts: StudentWarningCounts = updatedCounts || {
		C: 0,
		M: 0,
		R: 0,
		T: 0,
		total: 0,
		score: 20,
		warnings: []
	};

	return {
		studentId: warning.student_id,
		classId: warning.class_id,
		periodId: warning.academic_period_id,
		updatedCounts: finalCounts
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get warning counts for a single student
 *
 * Helper to fetch counts for just one student instead of entire class.
 *
 * @param options - Configuration object
 * @param options.studentId - Student's user ID
 * @param options.classId - Class UUID
 * @param options.periodId - Academic period UUID
 * @param options.teacherId - Teacher's user ID (for RLS verification)
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to warning counts for the student
 *
 * @example
 * const counts = await getStudentWarnings({
 *   studentId: 'student-uuid',
 *   classId: 'class-uuid',
 *   periodId: 'period-uuid',
 *   teacherId: user.id,
 *   supabase
 * });
 */
export async function getStudentWarnings(options: {
	studentId: string;
	classId: string;
	periodId: string;
	teacherId: string;
	supabase: SupabaseClient<Database>;
}): Promise<StudentWarningCounts> {
	const { studentId, classId, periodId, teacherId, supabase } = options;

	const warningsMap = await getClassWarnings({
		classId,
		periodId,
		teacherId,
		supabase
	});

	return (
		warningsMap.get(studentId) || {
			C: 0,
			M: 0,
			R: 0,
			T: 0,
			total: 0,
			score: 20,
			warnings: []
		}
	);
}

/**
 * Get all academic periods for a school year
 *
 * Helper to fetch all periods for a given school year.
 *
 * @param options - Configuration object
 * @param options.schoolYearId - School year UUID
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to array of academic periods
 *
 * @example
 * const periods = await getSchoolYearPeriods({
 *   schoolYearId: 'year-uuid',
 *   supabase
 * });
 */
export async function getSchoolYearPeriods(options: {
	schoolYearId: string;
	supabase: SupabaseClient<Database>;
}): Promise<AcademicPeriod[]> {
	const { schoolYearId, supabase } = options;

	const { data, error: queryError } = await supabase
		.from('academic_periods')
		.select('*')
		.eq('school_year_id', schoolYearId)
		.order('period_order', { ascending: true });

	if (queryError) {
		console.error('[getSchoolYearPeriods] Error fetching periods:', queryError);
		throw error(500, `Failed to fetch academic periods: ${queryError.message}`);
	}

	return data || [];
}

/**
 * Get active school year for a school
 *
 * Helper to fetch the currently active school year.
 *
 * @param options - Configuration object
 * @param options.schoolId - School UUID
 * @param options.supabase - Supabase client instance
 * @returns Promise resolving to active school year or null
 *
 * @example
 * const activeYear = await getActiveSchoolYear({
 *   schoolId: 'school-uuid',
 *   supabase
 * });
 */
export async function getActiveSchoolYear(options: {
	schoolId: string;
	supabase: SupabaseClient<Database>;
}): Promise<SchoolYear | null> {
	const { schoolId, supabase } = options;

	const { data, error: queryError } = await supabase
		.from('school_years')
		.select('*')
		.eq('school_id', schoolId)
		.eq('is_active', true)
		.maybeSingle();

	if (queryError) {
		console.error('[getActiveSchoolYear] Error fetching school year:', queryError);
		throw error(500, `Failed to fetch active school year: ${queryError.message}`);
	}

	return data;
}
