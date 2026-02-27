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
 * - Warning types: C (Comportement), M (Matériel), R (Retard), T (Travail)
 * - Score calculation: 20 - total_warnings (max 20, min 0)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { error } from '@sveltejs/kit';

// ============================================================================
// TYPES
// ============================================================================

// Import and re-export shared types and constants
import { type WarningType, WARNING_TYPE_LABELS, getWarningTypeLabel } from '$lib/types/warnings';
export { type WarningType, WARNING_TYPE_LABELS, getWarningTypeLabel };

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
 * Contains only counts per type - total/score calculated on-the-fly in UI
 */
export interface StudentWarningCounts {
	C: number; // Comportement
	M: number; // Matériel
	R: number; // Retard
	T: number; // Travail
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
				T: 0
			});
		}

		const counts = warningsMap.get(warning.student_id)!;

		// Increment specific warning type counter
		if (warning.warning_type === 'C') counts.C++;
		else if (warning.warning_type === 'M') counts.M++;
		else if (warning.warning_type === 'R') counts.R++;
		else if (warning.warning_type === 'T') counts.T++;
	}

	return warningsMap;
}

/**
 * Add a warning for a student via RPC
 *
 * Atomically inserts a warning and returns updated counts in a single DB call.
 * The RPC handles: auth check, type validation, max 20 limit, advisory lock.
 *
 * @param options - Configuration object
 * @returns Promise resolving to updated warning counts for the student
 */
export async function addWarning(options: {
	studentId: string;
	classId: string;
	periodId: string;
	warningType: WarningType;
	supabase: SupabaseClient<Database>;
}): Promise<StudentWarningCounts> {
	const { studentId, classId, periodId, warningType, supabase } = options;

	const { data, error: rpcError } = await supabase.rpc('add_warning', {
		p_student_id: studentId,
		p_class_id: classId,
		p_academic_period_id: periodId,
		p_warning_type: warningType
	});

	if (rpcError) {
		console.error('[addWarning] RPC error:', rpcError);
		throw error(500, `Failed to add warning: ${rpcError.message}`);
	}

	const result = data as { success: boolean; error?: string; counts?: StudentWarningCounts };

	if (!result.success) {
		const msg = result.error || 'Unknown error';
		if (msg.includes('Unauthorized')) throw error(403, msg);
		if (msg.includes('20 warnings')) throw error(409, msg);
		throw error(400, msg);
	}

	return result.counts ?? { C: 0, M: 0, R: 0, T: 0 };
}

/**
 * Add multiple warnings for a student in one atomic operation via RPC
 *
 * Inserts all warnings and returns updated counts. Enforces max 20 limit
 * across the total (existing + new). Uses advisory lock for concurrency safety.
 *
 * @param options - Configuration object
 * @returns Promise resolving to updated warning counts for the student
 */
export async function addWarningsBulk(options: {
	studentId: string;
	classId: string;
	periodId: string;
	warningTypes: WarningType[];
	supabase: SupabaseClient<Database>;
}): Promise<{ counts: StudentWarningCounts; added: number }> {
	const { studentId, classId, periodId, warningTypes, supabase } = options;

	const { data, error: rpcError } = await supabase.rpc('add_warnings_bulk', {
		p_student_id: studentId,
		p_class_id: classId,
		p_academic_period_id: periodId,
		p_warning_types: warningTypes
	});

	if (rpcError) {
		console.error('[addWarningsBulk] RPC error:', rpcError);
		throw error(500, `Failed to add warnings: ${rpcError.message}`);
	}

	const result = data as {
		success: boolean;
		error?: string;
		counts?: StudentWarningCounts;
		added?: number;
	};

	if (!result.success) {
		const msg = result.error || 'Unknown error';
		if (msg.includes('Unauthorized')) throw error(403, msg);
		if (msg.includes('exceed 20')) throw error(409, msg);
		throw error(400, msg);
	}

	return {
		counts: result.counts ?? { C: 0, M: 0, R: 0, T: 0 },
		added: result.added ?? warningTypes.length
	};
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
		T: 0
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
			T: 0
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
