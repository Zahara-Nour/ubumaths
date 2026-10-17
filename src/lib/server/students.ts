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
 * PATTERNS:
 * - Use getTeacherClassesWithStudents() for all classes with full data (rewards page)
 * - Use getTeacherClassesWithCounts() for all classes with counts only (dashboard layout)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getTeacherTestMode } from './test-mode';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/students');

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
	is_test: boolean;
}

/**
 * Class with full student data
 */
export interface ClassWithStudents {
	id: string;
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
	name: string;
	description: string | null;
	join_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	google_classroom_course_id: string | null;
	student_count: number;
	schedules: Array<{
		id: string;
		class_id: string;
		day_of_week: number;
		start_time: string;
		end_time: string;
		period_number: number | null;
		subject: string | null;
		room: string | null;
		notes: string | null;
		created_at: string;
		updated_at: string;
	}>;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get all teacher's classes with full student data
 *
 * Uses optimized RPC function that fetches all data in a single query.
 * Best for pages that need to display all students (e.g., rewards page).
 *
 * NOTE: This function fetches ALL student fields including gidouilles and vip_cards.
 * For caching, use getTeacherStudents() from cache/students.ts which excludes
 * frequently-changing fields (gidouilles, vip_cards) for better cache efficiency.
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

	// Call optimized RPC function (mono-teacher: scoped to the sole teacher via auth.uid())
	const { data, error } = await supabase.rpc('get_teacher_classes_with_students', {
		p_is_test_mode: isTestMode
	});

	if (error) {
		logger.error('[getTeacherClassesWithStudents] Error fetching classes:', error);
		throw new Error(`Failed to fetch teacher classes: ${error.message}`);
	}

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

	// Call optimized RPC function (mono-teacher: scoped to the sole teacher via auth.uid())
	const { data, error } = await supabase.rpc('get_teacher_classes_with_data', {
		p_is_test_mode: isTestMode
	});

	if (error) {
		logger.error('[getTeacherClassesWithCounts] Error fetching classes:', error);
		throw new Error(`Failed to fetch teacher classes: ${error.message}`);
	}

	return (data || []) as ClassWithData[];
}

/**
 * Get students that belong to NO active class (the "Non assignés" bucket).
 *
 * Single-teacher model (Option B): the sole teacher follows every student,
 * including those not enrolled in any class. This returns the students that
 * would otherwise be invisible in a class-based roster, so the teacher
 * dashboard can surface them in a dedicated "Non assignés" group.
 *
 * Test-mode filtering is applied (matches the teacher's current preference).
 *
 * @param userId - Teacher's user ID (for test mode lookup)
 * @param supabase - Supabase client instance
 * @returns Promise resolving to array of unassigned students (full data)
 *
 * @example
 * const unassigned = await getUnassignedStudents(user.id, supabase);
 * console.log(unassigned.length, 'students not in any class');
 */
export async function getUnassignedStudents(
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<StudentFull[]> {
	const isTestMode = await getTeacherTestMode(userId, supabase);

	// All students matching the current test-mode preference.
	const { data: allStudents, error: studentsError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, full_name, avatar_url, gidouilles, vip_cards, role, is_test')
		.eq('role', 'student')
		.eq('is_test', isTestMode);

	if (studentsError) {
		logger.error('[getUnassignedStudents] Error fetching students:', studentsError);
		throw new Error(`Failed to fetch students: ${studentsError.message}`);
	}

	// Student ids with at least one ACTIVE class membership.
	const { data: memberships, error: membersError } = await supabase
		.from('class_members')
		.select('student_id')
		.eq('status', 'active');

	if (membersError) {
		logger.error('[getUnassignedStudents] Error fetching memberships:', membersError);
		throw new Error(`Failed to fetch memberships: ${membersError.message}`);
	}

	const enrolled = new Set((memberships || []).map((m) => m.student_id));

	return (allStudents || [])
		.filter((p) => !enrolled.has(p.id))
		.map(
			(p) =>
				({
					id: p.id,
					firstname: p.firstname || '',
					lastname: p.lastname || null,
					full_name: p.full_name || null,
					avatar_url: p.avatar_url || null,
					gidouilles: p.gidouilles || 0,
					vip_cards: p.vip_cards || {},
					role: p.role || null,
					is_test: p.is_test || false
				}) as StudentFull
		);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get classes and students for assignment purposes
 *
 * Semantic alias for getTeacherClassesWithStudents, used by assignment pages
 * to clarify intent (getting targets for assessments/exercises/SRS decks).
 *
 * @param teacherId - Teacher's user ID
 * @param supabase - Supabase client instance
 * @returns Promise resolving to array of classes with full student data
 *
 * @example
 * const targets = await getAssignmentTargets(user.id, supabase);
 * targets.forEach(cls => {
 *   console.log('Can assign to', cls.students.length, 'students in', cls.name);
 * });
 */
export async function getAssignmentTargets(
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<ClassWithStudents[]> {
	return getTeacherClassesWithStudents(teacherId, supabase);
}
