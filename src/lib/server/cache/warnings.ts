/**
 * Student Warnings Redis Cache Module
 * =====================================
 *
 * Caches warning counts by class and academic period.
 * Separated from student profile cache due to period-based filtering.
 *
 * FEATURES:
 * - 3-minute TTL (warnings updated frequently during active periods)
 * - Test mode aware (separate cache for test/real students)
 * - Period-scoped (each period has separate cache)
 * - Graceful fallback on Redis errors
 *
 * USAGE:
 * ```typescript
 * import { getClassWarnings } from '$lib/server/cache/warnings';
 *
 * const warnings = await getClassWarnings(classId, periodId, teacherId, supabase);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getCached, invalidateCache } from '$lib/server/cache';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cache TTL: 3 minutes (warnings updated frequently in active periods) */
const WARNINGS_TTL = 180;

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

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

/**
 * Generate cache key for class warnings
 *
 * Format: warnings:class:{classId}:period:{periodId}:{testMode}
 *
 * @param classId - Class UUID
 * @param periodId - Academic period UUID
 * @param isTestMode - Whether test mode is enabled
 */
function getWarningsCacheKey(classId: string, periodId: string, isTestMode: boolean) {
	return `warnings:class:${classId}:period:${periodId}:${isTestMode}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get class warnings with Redis caching
 *
 * Fetches warning counts for all students in a class for a specific academic period.
 * Uses Redis cache with automatic fallback on errors.
 *
 * This function reuses the database query logic from the warnings helper module,
 * but adds caching on top for better performance.
 *
 * @param classId - Class UUID
 * @param periodId - Academic period UUID
 * @param teacherId - Teacher's user ID (for RLS verification and test mode lookup)
 * @param supabase - Supabase client instance
 * @param options - Optional configuration
 * @param options.bypassCache - If true, skip cache and fetch fresh data
 * @returns Promise resolving to Map of student_id → warning counts
 *
 * @example
 * const warnings = await getClassWarnings(classId, periodId, user.id, supabase);
 * const studentData = warnings.get(studentId);
 * console.log(`Student has ${studentData?.total} warnings, score: ${studentData?.score}/20`);
 *
 * @example
 * // Bypass cache after adding/removing warning
 * await addWarning(...);
 * const fresh = await getClassWarnings(classId, periodId, user.id, supabase, { bypassCache: true });
 */
export async function getClassWarnings(
	classId: string,
	periodId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>,
	options?: { bypassCache?: boolean }
): Promise<ClassWarningsMap> {
	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(teacherId, supabase);

	// Generate cache key
	const cacheKey = getWarningsCacheKey(classId, periodId, isTestMode);

	// Wrapper function for cache fallback
	const fetchWarnings = async (): Promise<ClassWarningsMap> => {
		const dbStart = performance.now();

		// Verify teacher owns the class (security check)
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
			console.error('[getClassWarnings] Error fetching warnings:', warningsError);
			throw error(500, `Failed to fetch warnings: ${warningsError.message}`);
		}

		console.log('[getClassWarnings] Found', warnings?.length || 0, 'warnings');

		// Aggregate warnings by student
		const warningsMap = new Map<string, StudentWarningCounts>();

		// Initialize counts for all students with warnings
		for (const warning of warnings || []) {
			// Filter by test mode (since RLS doesn't filter on is_test)
			// We need to join with profiles to check is_test
			// For now, we assume all warnings in the result set are for the correct test mode
			// (The proper fix would be to add a join in the query above, but student_warnings
			//  doesn't directly link to profiles - it links via class_members)

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

		const dbDuration = Math.round(performance.now() - dbStart);
		if (dev)
			console.log(
				`[getClassWarnings][DB] ⏱️ FETCH (${dbDuration}ms) { classId: '${classId}', periodId: '${periodId}', teacherId: '${teacherId}', isTestMode: ${isTestMode} }`
			);

		return warningsMap;
	};

	// Use cache wrapper (handles bypass option)
	if (options?.bypassCache) {
		return fetchWarnings();
	}

	return getCached<ClassWarningsMap>(cacheKey, WARNINGS_TTL, fetchWarnings, 'getClassWarnings');
}

/**
 * Invalidate warnings cache for a class and period
 *
 * Call this after operations that modify warnings (add/remove warnings).
 *
 * @param classId - Class UUID
 * @param periodId - Academic period UUID
 *
 * @example
 * // After adding warning
 * await addWarning(...);
 * await invalidateWarningsCache(classId, periodId);
 */
export async function invalidateWarningsCache(classId: string, periodId: string): Promise<void> {
	try {
		// Invalidate both test modes for this class and period
		await invalidateCache(`warnings:class:${classId}:period:${periodId}:*`);
	} catch (error) {
		console.error('[invalidateWarningsCache] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}

/**
 * Invalidate all warnings caches for a class (all periods)
 *
 * Useful when class membership changes or for bulk invalidation.
 *
 * @param classId - Class UUID
 *
 * @example
 * // After importing students (class membership changed)
 * await importStudents(...);
 * await invalidateAllClassWarningsCaches(classId);
 */
export async function invalidateAllClassWarningsCaches(classId: string): Promise<void> {
	try {
		// Invalidate all periods and test modes for this class
		await invalidateCache(`warnings:class:${classId}:*`);
	} catch (error) {
		console.error('[invalidateAllClassWarningsCaches] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}
