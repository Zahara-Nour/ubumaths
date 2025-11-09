/**
 * Cache Context Types
 * ====================
 *
 * Defines context types for cache synchronization utilities.
 *
 * Used by cache-sync helper functions to determine which cache to update
 * (teacherDashboardCache vs studentDashboardCache) based on the current context.
 *
 * USAGE:
 * ```typescript
 * // Teacher context (rewards page)
 * const context: TeacherCacheContext = {
 *   type: 'teacher',
 *   classId: '123e4567-e89b-12d3-a456-426614174000',
 *   studentId: '987fcdeb-51a2-43f5-b456-426614174000'
 * };
 *
 * // Student context (student dashboard)
 * const context: StudentCacheContext = {
 *   type: 'student'
 * };
 *
 * // Generic usage
 * syncVipCards(context, vipCards); // Automatically updates correct cache
 * ```
 */

/**
 * Teacher cache context
 *
 * Used when a teacher is viewing/editing a student's data.
 * Requires classId and studentId to identify which cache entry to update.
 */
export interface TeacherCacheContext {
	/**
	 * Cache type identifier
	 */
	type: 'teacher';

	/**
	 * Class UUID for teacherCache key
	 */
	classId: string;

	/**
	 * Student UUID for teacherCache nested key
	 */
	studentId: string;
}

/**
 * Student cache context
 *
 * Used when a student is viewing/editing their own data.
 * No additional IDs needed since studentCache is singleton.
 */
export interface StudentCacheContext {
	/**
	 * Cache type identifier
	 */
	type: 'student';
}

/**
 * Union type for all cache contexts
 *
 * Use this in function signatures that accept any cache context.
 */
export type CacheContext = TeacherCacheContext | StudentCacheContext;

/**
 * Type guard to check if context is teacher context
 *
 * @param context - Cache context to check
 * @returns True if context is TeacherCacheContext
 *
 * @example
 * ```typescript
 * if (isTeacherContext(context)) {
 *   // TypeScript knows context.classId and context.studentId exist
 *   teacherCache.updateVipCardsOptimistic(context.classId, context.studentId, vipCards);
 * }
 * ```
 */
export function isTeacherContext(context: CacheContext): context is TeacherCacheContext {
	return context.type === 'teacher';
}

/**
 * Type guard to check if context is student context
 *
 * @param context - Cache context to check
 * @returns True if context is StudentCacheContext
 *
 * @example
 * ```typescript
 * if (isStudentContext(context)) {
 *   // TypeScript knows context only has 'type' field
 *   studentCache.updateVipCardsOptimistic(vipCards);
 * }
 * ```
 */
export function isStudentContext(context: CacheContext): context is StudentCacheContext {
	return context.type === 'student';
}
