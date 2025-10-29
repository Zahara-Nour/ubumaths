/**
 * Student Data Redis Cache Module
 * =================================
 *
 * Caches student profile data (names, avatars, roles) for teacher classes.
 * EXCLUDES gidouilles and vip_cards (those are cached separately).
 *
 * FEATURES:
 * - 10-minute TTL (student data changes infrequently)
 * - Test mode aware (separate cache keys for test/real students)
 * - Graceful fallback on Redis errors
 * - Cache invalidation helpers
 *
 * USAGE:
 * ```typescript
 * import { getTeacherStudents } from '$lib/server/cache/students';
 *
 * const students = await getTeacherStudents(teacherId, classId, supabase);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getCached, invalidateCache } from '$lib/server/cache';
import { getTeacherTestMode } from '$lib/server/test-mode';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cache TTL: 10 minutes (student profile data changes infrequently) */
const STUDENTS_TTL = 600;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Student profile data (excludes gidouilles and vip_cards)
 */
export interface StudentData {
	id: string;
	firstname: string;
	lastname: string | null;
	full_name: string | null;
	avatar_url: string | null;
	role: string | null;
	gender: string | null;
	is_test: boolean;
}

/**
 * Class with students data
 */
export interface ClassWithStudentsData {
	id: string;
	teacher_id: string;
	name: string;
	description: string | null;
	join_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	students: StudentData[];
}

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

/**
 * Generate cache key for teacher students
 *
 * Format: students:teacher:{teacherId}:class:{classId}:{testMode}
 *
 * @param teacherId - Teacher's user ID
 * @param classId - Optional class ID (all classes if omitted)
 * @param isTestMode - Whether test mode is enabled
 */
function getStudentsCacheKey(teacherId: string, classId: string | undefined, isTestMode: boolean) {
	const classSegment = classId ? `class:${classId}` : 'all';
	return `students:teacher:${teacherId}:${classSegment}:${isTestMode}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get teacher's students with Redis caching
 *
 * Fetches student profile data (excludes gidouilles/vip_cards) with automatic
 * Redis caching and graceful fallback on errors.
 *
 * @param teacherId - Teacher's user ID
 * @param classId - Optional class ID to filter by specific class
 * @param supabase - Supabase client instance
 * @param options - Optional configuration
 * @param options.bypassCache - If true, skip cache and fetch fresh data
 * @returns Promise resolving to array of students (or classes with students if no classId)
 *
 * @example
 * // Get all students across all classes
 * const allClasses = await getTeacherStudents(user.id, undefined, supabase);
 *
 * @example
 * // Get students for specific class
 * const students = await getTeacherStudents(user.id, classId, supabase);
 *
 * @example
 * // Bypass cache (e.g., after import)
 * const fresh = await getTeacherStudents(user.id, classId, supabase, { bypassCache: true });
 */
export async function getTeacherStudents(
	teacherId: string,
	classId: string | undefined,
	supabase: SupabaseClient<Database>,
	options?: { bypassCache?: boolean }
): Promise<ClassWithStudentsData[] | StudentData[]> {
	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(teacherId, supabase);

	// Generate cache key
	const cacheKey = getStudentsCacheKey(teacherId, classId, isTestMode);

	// Wrapper function for cache fallback
	const fetchStudents = async () => {
		console.log('[getTeacherStudents] Fetching from DB:', {
			teacherId,
			classId,
			isTestMode
		});

		if (classId) {
			// Fetch specific class students
			const { data: members, error } = await supabase
				.from('class_members')
				.select(
					`
					student_id,
					profiles!class_members_student_id_fkey (
						id,
						firstname,
						lastname,
						full_name,
						avatar_url,
						role,
						gender,
						is_test
					)
				`
				)
				.eq('class_id', classId)
				.eq('profiles.is_test', isTestMode);

			if (error) {
				console.error('[getTeacherStudents] Error fetching class students:', error);
				throw new Error(`Failed to fetch students: ${error.message}`);
			}

			// Transform to StudentData array
			const students = (members || [])
				.map((member) => {
					const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
					if (!profile) return null;

					return {
						id: profile.id,
						firstname: profile.firstname || '',
						lastname: profile.lastname || null,
						full_name: profile.full_name || null,
						avatar_url: profile.avatar_url || null,
						role: profile.role || null,
						gender: profile.gender || null,
						is_test: profile.is_test || false
					} as StudentData;
				})
				.filter((s): s is StudentData => s !== null);

			return students;
		} else {
			// Fetch all classes with students (use optimized RPC)
			// Note: We need to manually exclude gidouilles/vip_cards from RPC result
			const { data, error } = await supabase.rpc('get_teacher_classes_with_students', {
				p_teacher_id: teacherId,
				p_is_test_mode: isTestMode
			} as unknown as { p_teacher_id: string });

			if (error) {
				console.error('[getTeacherStudents] Error fetching teacher classes:', error);
				throw new Error(`Failed to fetch teacher classes: ${error.message}`);
			}

			// Transform RPC result to exclude gidouilles and vip_cards
			// Type assertion needed: RPC returns unknown JSON structure
			type RPCStudent = {
				id: string;
				firstname: string;
				lastname: string | null;
				full_name: string | null;
				avatar_url: string | null;
				role: string | null;
				gender: string | null;
				is_test: boolean;
				gidouilles?: number;
				vip_cards?: Record<string, number>;
			};

			type RPCClass = {
				id: string;
				teacher_id: string;
				name: string;
				description: string | null;
				join_code: string;
				is_active: boolean;
				created_at: string;
				updated_at: string;
				students: RPCStudent[];
			};

			const rawClasses = (data || []) as unknown as RPCClass[];

			const classes: ClassWithStudentsData[] = rawClasses.map((cls) => ({
				id: cls.id,
				teacher_id: cls.teacher_id,
				name: cls.name,
				description: cls.description,
				join_code: cls.join_code,
				is_active: cls.is_active,
				created_at: cls.created_at,
				updated_at: cls.updated_at,
				students: (cls.students || []).map((student) => ({
					id: student.id,
					firstname: student.firstname,
					lastname: student.lastname,
					full_name: student.full_name,
					avatar_url: student.avatar_url,
					role: student.role,
					gender: student.gender,
					is_test: student.is_test
					// Deliberately exclude gidouilles and vip_cards
				}))
			}));

			return classes;
		}
	};

	// Use cache wrapper (handles bypass option)
	if (options?.bypassCache) {
		return fetchStudents();
	}

	return getCached<ClassWithStudentsData[] | StudentData[]>(cacheKey, STUDENTS_TTL, fetchStudents);
}

/**
 * Invalidate teacher students cache
 *
 * Call this after operations that modify student data (import, profile updates).
 *
 * @param teacherId - Teacher's user ID
 * @param classId - Optional class ID (invalidates only that class if provided)
 *
 * @example
 * // Invalidate all classes for teacher
 * await invalidateTeacherStudentsCache(user.id);
 *
 * @example
 * // Invalidate specific class only
 * await invalidateTeacherStudentsCache(user.id, classId);
 */
export async function invalidateTeacherStudentsCache(
	teacherId: string,
	classId?: string
): Promise<void> {
	try {
		if (classId) {
			// Invalidate both test modes for specific class
			await invalidateCache(`students:teacher:${teacherId}:class:${classId}:*`);
		} else {
			// Invalidate all classes for teacher
			await invalidateCache(`students:teacher:${teacherId}:*`);
		}
	} catch (error) {
		console.error('[invalidateTeacherStudentsCache] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}
