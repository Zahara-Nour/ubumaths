/**
 * Cache Synchronization Utilities
 * ==================================
 *
 * Shared helper functions for updating teacher and student caches.
 *
 * PHILOSOPHY:
 * These utilities automatically detect the cache context (teacher vs student)
 * and update the appropriate cache. This avoids code duplication and ensures
 * consistent behavior across teacher and student components.
 *
 * OPTIMISTIC UPDATE PATTERN:
 * Following the established pattern in teacherDashboardCache:
 * 1. For predictive updates (e.g., gidouilles +/-1): Update BEFORE API call
 * 2. For server-confirmed updates (e.g., VIP cards): Update AFTER API call with server data
 * 3. On success: Cache is already correct (no invalidation needed)
 * 4. On error: Rollback the optimistic update
 *
 * USAGE:
 * ```typescript
 * // Student context
 * const context: CacheContext = { type: 'student' };
 * syncVipCards(context, updatedCards); // Updates studentCache
 *
 * // Teacher context
 * const context: CacheContext = {
 *   type: 'teacher',
 *   classId: 'class-uuid',
 *   studentId: 'student-uuid'
 * };
 * syncVipCards(context, updatedCards); // Updates teacherCache
 * ```
 *
 * @see teacherDashboardCache.svelte.ts - Reference implementation
 * @see StudentQuickActionsTable.svelte - Gidouilles optimistic pattern
 * @see VipCardExchangeModal.svelte - VIP cards optimistic pattern
 */

import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import type { CacheContext } from '$lib/types/cache-context';
import type { StudentVipCards } from '$lib/types/vip-card';
import type { StudentWarningCounts } from '$lib/server/warnings';
import { isTeacherContext } from '$lib/types/cache-context';

// ============================================================================
// VIP CARDS SYNC
// ============================================================================

/**
 * Synchronize VIP cards across teacher/student caches
 *
 * PATTERN: Server-confirmed optimistic update
 * - Call this AFTER receiving server response
 * - Use server-returned data (not client prediction)
 * - No invalidation needed (cache already has correct data)
 *
 * TEACHER FLOW:
 * ```typescript
 * const result = await exchangeVipCards(...);
 * const updatedCards = reconstructFromServerResponse(result);
 * syncVipCards(teacherContext, updatedCards); // ✅ Cache updated
 * ```
 *
 * STUDENT FLOW:
 * ```typescript
 * const result = await activateVipCard(...);
 * const updatedCards = reconstructFromServerResponse(result);
 * syncVipCards(studentContext, updatedCards); // ✅ Cache updated
 * ```
 *
 * @param context - Cache context (teacher or student)
 * @param vipCards - Updated VIP cards object from server
 */
export function syncVipCards(context: CacheContext, vipCards: StudentVipCards): void {
	if (isTeacherContext(context)) {
		teacherCache.updateVipCardsOptimistic(context.classId, context.studentId, vipCards);
	} else {
		studentCache.updateVipCardsOptimistic(vipCards);
	}
}

// ============================================================================
// GIDOUILLES SYNC
// ============================================================================

/**
 * Synchronize gidouilles update across teacher/student caches
 *
 * PATTERN: Predictive optimistic update
 * - Call this BEFORE API call for instant UI feedback
 * - Use positive/negative delta (+1, -1, +5, etc.)
 * - On success: Cache already correct (no action needed)
 * - On error: Call rollbackGidouilles() to reverse
 *
 * WITH DEBOUNCING (recommended for rapid clicks):
 * ```typescript
 * // 1. Instant optimistic update
 * syncGidouilles(context, +1);
 *
 * // 2. Debounce timer (500ms)
 * clearTimeout(timer);
 * timer = setTimeout(async () => {
 *   try {
 *     await apiAddGidouilles(studentId, accumulatedDelta);
 *     // Success: cache already correct ✅
 *   } catch (error) {
 *     rollbackGidouilles(context, accumulatedDelta); // Reverse
 *   }
 * }, 500);
 * ```
 *
 * WITHOUT DEBOUNCING (simple case):
 * ```typescript
 * syncGidouilles(context, +5);
 * try {
 *   await apiAddGidouilles(studentId, +5);
 *   // Success: cache already correct ✅
 * } catch (error) {
 *   rollbackGidouilles(context, +5); // Reverse
 * }
 * ```
 *
 * @param context - Cache context (teacher or student)
 * @param delta - Gidouilles change (positive = add, negative = remove)
 */
export function syncGidouilles(context: CacheContext, delta: number): void {
	if (isTeacherContext(context)) {
		teacherCache.updateGidouillesOptimistic(context.classId, context.studentId, delta);
	} else {
		studentCache.updateGidouillesOptimistic(delta);
	}
}

/**
 * Rollback gidouilles optimistic update after API error
 *
 * PATTERN: Error recovery
 * - Call this in catch block after API failure
 * - Reverses the optimistic update by inverting the delta
 *
 * EXAMPLE:
 * ```typescript
 * syncGidouilles(context, +5); // Optimistic +5
 * try {
 *   await api.addGidouilles(+5);
 * } catch (error) {
 *   rollbackGidouilles(context, +5); // Reverses with -5
 *   toaster.error('Échec de l\'ajout');
 * }
 * ```
 *
 * @param context - Cache context (teacher or student)
 * @param delta - Original delta to reverse (will be inverted internally)
 */
export function rollbackGidouilles(context: CacheContext, delta: number): void {
	// Reverse the delta by inverting sign
	syncGidouilles(context, -delta);
}

// ============================================================================
// WARNINGS SYNC
// ============================================================================

/**
 * Synchronize warnings update across teacher/student caches
 *
 * PATTERN: Server-confirmed optimistic update
 * - Call this AFTER receiving server response
 * - Use server-returned warning counts
 * - No invalidation needed
 *
 * USAGE:
 * ```typescript
 * const result = await addWarning(studentId, periodId, 'C');
 * syncWarnings(context, periodId, result.counts); // { C: 3, M: 1, R: 0, T: 2 }
 * ```
 *
 * @param context - Cache context (teacher or student)
 * @param periodId - Academic period UUID
 * @param counts - Updated warning counts from server
 */
export function syncWarnings(
	context: CacheContext,
	periodId: string,
	counts: StudentWarningCounts
): void {
	if (isTeacherContext(context)) {
		teacherCache.updateWarningsOptimistic(context.classId, periodId, context.studentId, counts);
	} else {
		studentCache.updateWarningsOptimistic(periodId, counts);
	}
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate rewards cache (gidouilles + VIP cards)
 *
 * USE CASES:
 * - External data change (not from current user action)
 * - Periodic refresh to ensure data freshness
 * - After complex multi-step operations
 *
 * NOTE: For optimistic updates, you usually DON'T need this.
 * The cache is already updated with correct data after successful API call.
 *
 * WHEN TO USE:
 * ```typescript
 * // ❌ DON'T: After optimistic update success
 * syncVipCards(context, updatedCards);
 * invalidateRewards(context); // Unnecessary!
 *
 * // ✅ DO: When data changed externally
 * // (e.g., teacher awarded gidouilles, student sees it)
 * invalidateRewards(context);
 * await refetchRewards(context);
 * ```
 *
 * @param context - Cache context (teacher or student)
 */
export function invalidateRewards(context: CacheContext): void {
	if (isTeacherContext(context)) {
		teacherCache.invalidateRewards(context.classId);
	} else {
		studentCache.invalidateRewards();
	}
}

/**
 * Invalidate warnings cache for a specific period
 *
 * @param context - Cache context (teacher or student)
 * @param periodId - Academic period UUID to invalidate
 */
export function invalidateWarnings(context: CacheContext, periodId: string): void {
	if (isTeacherContext(context)) {
		teacherCache.invalidateWarnings(context.classId, periodId);
	} else {
		studentCache.invalidateWarnings(periodId);
	}
}

/**
 * Invalidate profile cache
 *
 * USE CASES:
 * - After profile update (name, avatar, etc.)
 * - After class enrollment change
 *
 * @param context - Cache context (teacher or student)
 */
export function invalidateProfile(context: CacheContext): void {
	if (isTeacherContext(context)) {
		// Teacher cache doesn't have profile (only rewards + warnings)
		// This is a no-op for teacher context
		return;
	} else {
		studentCache.invalidateProfile();
	}
}

// ============================================================================
// REFETCH HELPERS
// ============================================================================

/**
 * Refetch rewards from API after invalidation
 *
 * PATTERN: Invalidate + Refetch
 * ```typescript
 * // When external data changed
 * await refetchRewards(context);
 *
 * // Equivalent to:
 * invalidateRewards(context);
 * await getRewards(context);
 * ```
 *
 * @param context - Cache context (teacher or student)
 * @returns Promise resolving to updated rewards
 */
export async function refetchRewards(context: CacheContext): Promise<unknown> {
	invalidateRewards(context);

	if (isTeacherContext(context)) {
		return await teacherCache.getStudentRewards(context.classId);
	} else {
		return await studentCache.getRewards();
	}
}

/**
 * Refetch warnings from API after invalidation
 *
 * @param context - Cache context (teacher or student)
 * @param periodId - Academic period UUID
 * @returns Promise resolving to updated warnings
 */
export async function refetchWarnings(context: CacheContext, periodId: string): Promise<unknown> {
	invalidateWarnings(context, periodId);

	if (isTeacherContext(context)) {
		return await teacherCache.getStudentWarnings(context.classId, periodId);
	} else {
		return await studentCache.getWarnings(periodId);
	}
}

/**
 * Refetch profile from API after invalidation
 *
 * NOTE: Only works for student context (teacher cache doesn't have profile)
 *
 * @param context - Cache context (must be student)
 * @returns Promise resolving to updated profile
 */
export async function refetchProfile(context: CacheContext): Promise<unknown> {
	if (isTeacherContext(context)) {
		// Teacher cache doesn't have profile
		return null;
	}

	invalidateProfile(context);
	return await studentCache.getProfile();
}
