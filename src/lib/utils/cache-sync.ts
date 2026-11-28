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

import { teacherCache } from '#lib/stores/teacherDashboardCache.svelte.ts';
import { studentCache } from '#lib/stores/studentDashboardCache.svelte.ts';
import type { CacheContext } from '#lib/types/cache-context.ts';
import type { StudentVipCards } from '#lib/types/vip-card.ts';
import { isTeacherContext } from '#lib/types/cache-context.ts';

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
