/**
 * Schools Redis Cache Module
 * ==========================
 *
 * Caches school data (profile, timetable, metadata) for performance.
 *
 * WHY REDIS FOR SCHOOLS?
 * ----------------------
 * School data is read frequently but changes rarely (once per year or less).
 * Multiple teachers at the same school query the same data repeatedly.
 * Redis cache eliminates repeated database queries across all users.
 *
 * Example scenario:
 * - 50 teachers at a school load dashboard
 * - Without cache: 50 identical DB queries to fetch school timetable
 * - With cache: 1 DB query, 49 cache hits
 * - Result: 95% fewer database operations
 *
 * FEATURES:
 * - 1-hour TTL (schools change rarely)
 * - Automatic fallback on Redis errors
 * - Clean invalidation interface
 *
 * USAGE:
 * ```typescript
 * import { getCachedSchool, invalidateSchoolCache } from '$lib/server/cache/schools';
 *
 * const school = await getCachedSchool(schoolId, supabase);
 * if (school.timetable_updated) {
 *   await invalidateSchoolCache(schoolId);
 * }
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getCached, invalidateCache, CACHE_KEYS, TTL } from '$lib/server/cache';
import { dev } from '$app/environment';

// ============================================================================
// TYPES
// ============================================================================

type School = Database['public']['Tables']['schools']['Row'];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get school data with Redis caching
 *
 * Fetches school profile including timetable, logo, and metadata.
 * Uses Redis cache with automatic fallback on errors.
 *
 * @param schoolId - School UUID
 * @param supabase - Supabase client instance
 * @returns Promise resolving to School object or null if not found
 *
 * @example
 * const school = await getCachedSchool(schoolId, supabase);
 * if (school) {
 *   console.log(`School: ${school.name} in ${school.city}`);
 *   console.log(`Timetable:`, school.timetable);
 * }
 *
 * @example
 * // After updating school timetable
 * await updateSchoolTimetable(schoolId, newTimetable, supabase);
 * await invalidateSchoolCache(schoolId);
 */
export async function getCachedSchool(
	schoolId: string,
	supabase: SupabaseClient<Database>
): Promise<School | null> {
	const cacheKey = CACHE_KEYS.SCHOOL_DATA(schoolId);

	const fetchSchool = async (): Promise<School | null> => {
		const dbStart = performance.now();

		const { data, error } = await supabase.from('schools').select('*').eq('id', schoolId).single();

		if (error) {
			if (error.code === 'PGRST116') {
				// Not found
				console.log('[getCachedSchool] School not found:', schoolId);
				return null;
			}
			console.error('[getCachedSchool] Error fetching school:', error);
			throw new Error(`Failed to fetch school: ${error.message}`);
		}

		const dbDuration = Math.round(performance.now() - dbStart);
		if (dev)
			console.log(`[getCachedSchool][DB] ⏱️ FETCH (${dbDuration}ms) { schoolId: '${schoolId}' }`);

		return data;
	};

	return getCached<School | null>(cacheKey, TTL.SCHOOL_DATA, fetchSchool, 'getCachedSchool');
}

/**
 * Invalidate school cache
 *
 * Call this after operations that modify school data (timetable updates, etc).
 *
 * @param schoolId - School UUID
 *
 * @example
 * // After updating school timetable
 * await updateSchoolTimetable(...);
 * await invalidateSchoolCache(schoolId);
 */
export async function invalidateSchoolCache(schoolId: string): Promise<void> {
	try {
		await invalidateCache(CACHE_KEYS.SCHOOL_DATA(schoolId));
	} catch (error) {
		console.error('[invalidateSchoolCache] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}
