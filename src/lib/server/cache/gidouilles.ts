/**
 * Gidouilles (Rewards) Redis Cache Module
 * =========================================
 *
 * Caches ONLY gidouilles and vip_cards data by class.
 * Separated from student profile cache due to higher update frequency.
 *
 * FEATURES:
 * - 5-minute TTL (gidouilles updated more frequently than profiles)
 * - Test mode aware (separate cache for test/real students)
 * - Graceful fallback on Redis errors
 * - Invalidation on gidouille transactions
 *
 * USAGE:
 * ```typescript
 * import { getClassGidouilles } from '$lib/server/cache/gidouilles';
 *
 * const gidouilles = await getClassGidouilles(classId, teacherId, supabase);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getCached, invalidateCache } from '$lib/server/cache';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { dev } from '$app/environment';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cache TTL: 5 minutes (gidouilles updated frequently) */
const GIDOUILLES_TTL = 300;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Gidouilles data for a student
 */
export interface GidouillesData {
	student_id: string;
	gidouilles: number;
	vip_cards: Record<string, number>;
}

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

/**
 * Generate cache key for class gidouilles
 *
 * Format: gidouilles:class:{classId}:{testMode}
 *
 * @param classId - Class UUID
 * @param isTestMode - Whether test mode is enabled
 */
function getGidouillesCacheKey(classId: string, isTestMode: boolean) {
	return `gidouilles:class:${classId}:${isTestMode ? 'test' : 'real'}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get class gidouilles with Redis caching
 *
 * Fetches ONLY gidouilles and vip_cards for students in a class.
 * Uses Redis cache with automatic fallback on errors.
 *
 * @param classId - Class UUID
 * @param teacherId - Teacher's user ID (for test mode lookup)
 * @param supabase - Supabase client instance
 * @param options - Optional configuration
 * @param options.bypassCache - If true, skip cache and fetch fresh data
 * @returns Promise resolving to array of gidouilles data
 *
 * @example
 * const gidouilles = await getClassGidouilles(classId, user.id, supabase);
 * gidouilles.forEach(g => {
 *   console.log(`Student ${g.student_id} has ${g.gidouilles} gidouilles`);
 * });
 *
 * @example
 * // Bypass cache after transaction
 * await updateGidouilles(...);
 * const fresh = await getClassGidouilles(classId, user.id, supabase, { bypassCache: true });
 */
export async function getClassGidouilles(
	classId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>,
	options?: { bypassCache?: boolean }
): Promise<GidouillesData[]> {
	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(teacherId, supabase);

	// Generate cache key
	const cacheKey = getGidouillesCacheKey(classId, isTestMode);

	// Wrapper function for cache fallback
	const fetchGidouilles = async (): Promise<GidouillesData[]> => {
		const dbStart = performance.now();

		// Verify teacher owns the class (security check)
		const { data: classCheck, error: classError } = await supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', teacherId)
			.maybeSingle();

		if (classError) {
			console.error('[getClassGidouilles] Error verifying class ownership:', classError);
			throw new Error(`Failed to verify class ownership: ${classError.message}`);
		}

		if (!classCheck) {
			console.error('[getClassGidouilles] Teacher does not own class:', classId);
			throw new Error('You do not have permission to view this class');
		}

		// Fetch gidouilles data via class_members join
		const { data: members, error } = await supabase
			.from('class_members')
			.select(
				`
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					gidouilles,
					vip_cards,
					is_test
				)
			`
			)
			.eq('class_id', classId)
			.eq('profiles.is_test', isTestMode);

		if (error) {
			console.error('[getClassGidouilles] Error fetching gidouilles:', error);
			throw new Error(`Failed to fetch gidouilles: ${error.message}`);
		}

		// Transform to GidouillesData array
		const gidouilles = (members || [])
			.map((member) => {
				const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
				if (!profile) return null;

				return {
					student_id: profile.id,
					gidouilles: profile.gidouilles || 0,
					vip_cards: profile.vip_cards || {}
				} as GidouillesData;
			})
			.filter((g): g is GidouillesData => g !== null);

		const dbDuration = Math.round(performance.now() - dbStart);
		if (dev)
			console.log(
				`[getClassGidouilles][DB] ⏱️ FETCH (${dbDuration}ms) { classId: '${classId}', teacherId: '${teacherId}', isTestMode: ${isTestMode} }`
			);

		return gidouilles;
	};

	// Use cache wrapper (handles bypass option)
	if (options?.bypassCache) {
		return fetchGidouilles();
	}

	return getCached<GidouillesData[]>(
		cacheKey,
		GIDOUILLES_TTL,
		fetchGidouilles,
		'getClassGidouilles'
	);
}

/**
 * Invalidate gidouilles cache for a class
 *
 * Call this after operations that modify gidouilles (rewards, penalties, VIP cards).
 *
 * @param classId - Class UUID
 *
 * @example
 * // After updating gidouilles
 * await updateStudentGidouilles(...);
 * await invalidateGidouillesCache(classId);
 */
export async function invalidateGidouillesCache(classId: string): Promise<void> {
	try {
		// Invalidate both test modes for this class
		await invalidateCache(`gidouilles:class:${classId}:*`);
	} catch (error) {
		console.error('[invalidateGidouillesCache] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}

/**
 * Invalidate gidouilles cache for multiple classes
 *
 * Useful when teacher updates affect multiple classes (e.g., bulk rewards).
 *
 * @param classIds - Array of class UUIDs
 *
 * @example
 * await bulkUpdateGidouilles(...);
 * await invalidateMultipleGidouillesCaches([classId1, classId2, classId3]);
 */
export async function invalidateMultipleGidouillesCaches(classIds: string[]): Promise<void> {
	try {
		await Promise.all(classIds.map((classId) => invalidateGidouillesCache(classId)));
	} catch (error) {
		console.error('[invalidateMultipleGidouillesCaches] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}
