/**
 * Unified Student Data Fetching Helpers
 * =======================================
 *
 * Centralized functions for fetching student data with consistent test mode filtering.
 *
 * BENEFITS:
 * - Single source of truth for student queries
 * - Test mode filtering always applied correctly
 * - Prevents code duplication
 * - Easy to add caching or optimization later
 * - Consistent error handling
 *
 * USAGE:
 * ```typescript
 * import { getClassStudents } from '$lib/server/students';
 *
 * const students = await getClassStudents({
 *   classId: 'uuid',
 *   userId: user.id,
 *   supabase,
 *   full: true
 * });
 * ```
 *
 * PATTERNS:
 * - Use getClassStudents() for single class
 * - Use getTeacherClassesWithStudents() for all classes with full data (rewards page)
 * - Use getTeacherClassesWithCounts() for all classes with counts only (dashboard layout)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getTeacherTestMode } from './test-mode';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal student data (for lists, wheels, etc.)
 */
export interface Student {
	id: string;
	firstname: string;
	lastname: string | null;
	avatar_url: string | null;
}

/**
 * Full student data (for rewards, detailed views)
 */
export interface StudentFull extends Student {
	full_name: string | null;
	gidouilles: number;
	vip_cards: Record<string, number>;
	role: string | null;
	gender: string | null;
	is_test: boolean;
}

/**
 * Class with full student data
 */
export interface ClassWithStudents {
	id: string;
	teacher_id: string;
	name: string;
	description: string | null;
	join_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	students: StudentFull[];
}

/**
 * Class with student count and schedules
 */
export interface ClassWithData {
	id: string;
	teacher_id: string;
	name: string;
	description: string | null;
	join_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	student_count: number;
	schedules: Array<{
		id: string;
		class_id: string;
		teacher_id: string;
		day_of_week: number;
		start_time: string;
		end_time: string;
		subject: string | null;
		room: string | null;
		notes: string | null;
	}>;
}

/**
 * Options for getClassStudents
 */
export interface GetClassStudentsOptions {
	classId: string;
	userId: string;
	supabase: SupabaseClient<Database>;
	full?: boolean;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get students for a specific class
 *
 * This is the recommended function for fetching students for a single class.
 * Automatically applies test mode filtering based on teacher's preference.
 *
 * @param options - Configuration object
 * @param options.classId - The class ID
 * @param options.userId - The teacher's user ID (for test mode lookup)
 * @param options.supabase - Supabase client instance
 * @param options.full - Whether to include full student data (default: false)
 * @returns Promise resolving to array of students
 *
 * @example
 * // Get minimal student data
 * const students = await getClassStudents({
 *   classId: 'class-uuid',
 *   userId: user.id,
 *   supabase
 * });
 *
 * @example
 * // Get full student data (with gidouilles, vip_cards, etc.)
 * const students = await getClassStudents({
 *   classId: 'class-uuid',
 *   userId: user.id,
 *   supabase,
 *   full: true
 * });
 */
export async function getClassStudents(
	options: GetClassStudentsOptions
): Promise<Student[] | StudentFull[]> {
	const { classId, userId, supabase, full = false } = options;

	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(userId, supabase);

	console.log('[getClassStudents] Fetching students for class:', classId, 'Test mode:', isTestMode);

	// Build select fields based on 'full' parameter
	const selectFields = full
		? `
			student_id,
			profiles!class_members_student_id_fkey (
				id,
				firstname,
				lastname,
				full_name,
				avatar_url,
				gidouilles,
				vip_cards,
				role,
				gender,
				is_test
			)
		`
		: `
			student_id,
			profiles!class_members_student_id_fkey (
				id,
				firstname,
				lastname,
				avatar_url,
				is_test
			)
		`;

	// Fetch students with test mode filtering
	const { data: members, error } = await supabase
		.from('class_members')
		.select(selectFields)
		.eq('class_id', classId)
		.eq('profiles.is_test', isTestMode); // KEY: Filter by test mode

	if (error) {
		console.error('[getClassStudents] Error fetching students:', error);
		throw new Error(`Failed to fetch students: ${error.message}`);
	}

	// Transform members to students array
	const students = (members || [])
		.map((member) => {
			const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
			if (!profile) return null;

			if (full) {
				return {
					id: profile.id,
					firstname: profile.firstname || '',
					lastname: profile.lastname || null,
					full_name: profile.full_name || null,
					avatar_url: profile.avatar_url || null,
					gidouilles: profile.gidouilles || 0,
					vip_cards: profile.vip_cards || {},
					role: profile.role || null,
					gender: profile.gender || null,
					is_test: profile.is_test || false
				} as StudentFull;
			} else {
				return {
					id: profile.id,
					firstname: profile.firstname || '',
					lastname: profile.lastname || null,
					avatar_url: profile.avatar_url || null
				} as Student;
			}
		})
		.filter((s): s is Student | StudentFull => s !== null);

	return students;
}

/**
 * Get all teacher's classes with full student data
 *
 * Uses optimized RPC function that fetches all data in a single query.
 * Best for pages that need to display all students (e.g., rewards page).
 *
 * @param userId - Teacher's user ID
 * @param supabase - Supabase client instance
 * @returns Promise resolving to array of classes with students
 *
 * @example
 * const classes = await getTeacherClassesWithStudents(user.id, supabase);
 * classes.forEach(cls => {
 *   console.log(cls.name, 'has', cls.students.length, 'students');
 * });
 */
export async function getTeacherClassesWithStudents(
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<ClassWithStudents[]> {
	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(userId, supabase);

	// Call optimized RPC function
	// Note: p_is_test_mode parameter exists in the database but types may be stale
	const { data, error } = await supabase.rpc('get_teacher_classes_with_students', {
		p_teacher_id: userId,
		p_is_test_mode: isTestMode
	} as unknown as { p_teacher_id: string });

	if (error) {
		console.error('[getTeacherClassesWithStudents] Error fetching classes:', error);
		throw new Error(`Failed to fetch teacher classes: ${error.message}`);
	}

	console.log('[getTeacherClassesWithStudents] Fetched', data?.length || 0, 'classes');

	// Cast is safe: RPC function returns the correct structure with students as StudentFull[]
	return (data || []) as unknown as ClassWithStudents[];
}

/**
 * Get all teacher's classes with student counts (optimized for lists)
 *
 * Uses optimized RPC function that returns counts instead of full student data.
 * Best for dropdown lists and dashboards that only need counts.
 *
 * @param userId - Teacher's user ID
 * @param supabase - Supabase client instance
 * @returns Promise resolving to array of classes with counts
 *
 * @example
 * const classes = await getTeacherClassesWithCounts(user.id, supabase);
 * classes.forEach(cls => {
 *   console.log(cls.name, 'has', cls.student_count, 'students');
 * });
 */
export async function getTeacherClassesWithCounts(
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<ClassWithData[]> {
	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(userId, supabase);

	// Call optimized RPC function
	// Note: p_is_test_mode parameter exists in the database but types may be stale
	const { data, error } = await supabase.rpc('get_teacher_classes_with_data', {
		p_teacher_id: userId,
		p_is_test_mode: isTestMode
	} as unknown as { p_teacher_id: string });

	if (error) {
		console.error('[getTeacherClassesWithCounts] Error fetching classes:', error);
		throw new Error(`Failed to fetch teacher classes: ${error.message}`);
	}

	return (data || []) as ClassWithData[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Count students in a class (lightweight - no data fetching)
 *
 * Use this when you only need the count, not the actual student data.
 *
 * @param classId - The class ID
 * @param userId - The teacher's user ID (for test mode lookup)
 * @param supabase - Supabase client instance
 * @returns Promise resolving to student count
 *
 * @example
 * const count = await getClassStudentCount('class-uuid', user.id, supabase);
 * console.log('Class has', count, 'students');
 */
export async function getClassStudentCount(
	classId: string,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<number> {
	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(userId, supabase);

	// Count with test mode filtering
	const { count, error } = await supabase
		.from('class_members')
		.select('student_id, profiles!inner(is_test)', { count: 'exact', head: true })
		.eq('class_id', classId)
		.eq('profiles.is_test', isTestMode);

	if (error) {
		console.error('[getClassStudentCount] Error counting students:', error);
		throw new Error(`Failed to count students: ${error.message}`);
	}

	return count || 0;
}
