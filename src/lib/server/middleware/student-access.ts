/**
 * Student Access Middleware
 *
 * SECURITY: Centralized teacher-student relationship verification
 *
 * FEATURES:
 * - Eliminates 300+ lines of duplicated access check code across 10+ API endpoints
 * - Single source of truth for teacher-student authorization logic
 * - Type-safe verification with TypeScript
 * - Efficient single-query verification (no N+1 queries)
 * - Admin bypass support (admins can access all students)
 *
 * USAGE:
 * ```typescript
 * // Verify teacher teaches student (admin bypass)
 * const hasAccess = await verifyTeacherStudent(teacherId, studentId, supabase);
 * if (!hasAccess) {
 *   throw error(403, 'You can only access students you teach');
 * }
 *
 * // With profile object (checks admin role)
 * const hasAccess = await verifyTeacherStudentWithRole(teacherId, studentId, profile, supabase);
 * if (!hasAccess) {
 *   throw error(403, 'Not authorized');
 * }
 * ```
 *
 * MIGRATION FROM DUPLICATED CODE:
 * - Before: 30 lines of class_members JOIN logic per endpoint
 * - After: 2 lines of middleware call (reuses single query)
 * - Security: Consistent verification across all student endpoints
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Profile } from './auth';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supabase client type with proper database schema
 */
type TypedSupabaseClient = SupabaseClient<Database>;

// ============================================================================
// CORE VERIFICATION LOGIC
// ============================================================================

/**
 * Verify that a teacher teaches a specific student
 *
 * Checks if the teacher has access to the student through the class_members
 * relationship. This is done by verifying that:
 * 1. The student is enrolled in at least one class (class_members table)
 * 2. At least one of those classes is taught by the specified teacher
 *
 * This function performs a single efficient query with JOIN to check the
 * relationship, avoiding N+1 query problems.
 *
 * **When to Use**:
 * - Before allowing teachers to view student data (progress, results, profiles)
 * - Before allowing teachers to modify student data (awards, warnings, grades)
 * - Before allowing teachers to perform actions on behalf of students
 *
 * **Admin Access**: This function DOES NOT handle admin role checking. Admins
 * should bypass this check. Use `verifyTeacherStudentWithRole()` if you need
 * automatic admin bypass, or check `profile.role === 'admin'` before calling.
 *
 * **Error Handling**: Returns `false` on database errors (fails closed for security).
 * The calling code should throw appropriate error responses.
 *
 * @param teacherId - UUID of the teacher
 * @param studentId - UUID of the student
 * @param supabase - Authenticated Supabase client
 * @returns Promise resolving to `true` if teacher teaches student, `false` otherwise
 *
 * @example Basic usage in API endpoint
 * ```typescript
 * export const GET: RequestHandler = async ({ params, locals }) => {
 *   const { user, profile } = await requireRole(locals, 'teacher');
 *   const studentId = params.id;
 *
 *   // Verify teacher teaches this student
 *   const hasAccess = await verifyTeacherStudent(user.id, studentId, locals.supabase);
 *   if (!hasAccess) {
 *     throw error(403, 'You can only access students you teach');
 *   }
 *
 *   // Proceed with logic...
 * };
 * ```
 *
 * @example With admin bypass (manual)
 * ```typescript
 * const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 *
 * // Admins skip the check
 * if (profile.role !== 'admin') {
 *   const hasAccess = await verifyTeacherStudent(user.id, studentId, locals.supabase);
 *   if (!hasAccess) {
 *     throw error(403, 'You can only access students you teach');
 *   }
 * }
 * ```
 *
 * @example Migration from old pattern
 * ```typescript
 * // Before (30 lines):
 * const { data: classMemberships, error: membershipError } = await supabase
 *   .from('class_members')
 *   .select(`
 *     class_id,
 *     classes!inner (
 *       teacher_id
 *     )
 *   `)
 *   .eq('student_id', studentId);
 *
 * if (membershipError) {
 *   throw error(500, 'Failed to verify class membership');
 * }
 *
 * const isTeacherOfStudent = classMemberships?.some((membership) => {
 *   const classData = Array.isArray(membership.classes)
 *     ? membership.classes[0]
 *     : membership.classes;
 *   return classData?.teacher_id === teacherId;
 * });
 *
 * if (!isTeacherOfStudent) {
 *   throw error(403, 'You can only access your own students');
 * }
 *
 * // After (3 lines):
 * const hasAccess = await verifyTeacherStudent(teacherId, studentId, supabase);
 * if (!hasAccess) {
 *   throw error(403, 'You can only access students you teach');
 * }
 * ```
 */
export async function verifyTeacherStudent(
	teacherId: string,
	studentId: string,
	supabase: TypedSupabaseClient
): Promise<boolean> {
	// Query class_members with JOIN to classes to check teacher relationship
	// This is a single efficient query that checks:
	// 1. Student is enrolled in classes (class_members.student_id = studentId)
	// 2. At least one class is taught by this teacher (classes.teacher_id = teacherId)
	const { data: classMemberships, error: membershipError } = await supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner (
				teacher_id
			)
		`
		)
		.eq('student_id', studentId);

	// Fail closed: if query errors, deny access
	if (membershipError) {
		console.error('[verifyTeacherStudent] Database error:', membershipError);
		return false;
	}

	// No class memberships found = student not in any classes
	if (!classMemberships || classMemberships.length === 0) {
		return false;
	}

	// Check if any of the student's classes are taught by this teacher
	// Handle both array and object responses from Supabase JOIN
	const isTeacherOfStudent = classMemberships.some((membership) => {
		// Supabase may return classes as array or object depending on relationship type
		const classData = Array.isArray(membership.classes)
			? membership.classes[0]
			: membership.classes;

		// Type-safe access to teacher_id
		if (classData && typeof classData === 'object' && 'teacher_id' in classData) {
			return (classData as { teacher_id: string }).teacher_id === teacherId;
		}

		return false;
	});

	return isTeacherOfStudent;
}

/**
 * Verify teacher-student relationship with automatic admin bypass
 *
 * This is a convenience wrapper around `verifyTeacherStudent()` that automatically
 * handles admin role checking. Admins are granted access to all students without
 * checking the class_members relationship.
 *
 * **When to Use**:
 * - When you need admin bypass (most common case)
 * - When you already have the profile object available
 * - When you want simplified authorization logic
 *
 * **When NOT to Use**:
 * - If you need custom admin logic (use `verifyTeacherStudent()` directly)
 * - If you don't have the profile object (fetch it or use `verifyTeacherStudent()`)
 *
 * @param teacherId - UUID of the teacher
 * @param studentId - UUID of the student
 * @param profile - User profile object (must include role field)
 * @param supabase - Authenticated Supabase client
 * @returns Promise resolving to `true` if access granted, `false` otherwise
 *
 * @example Simplified usage with admin bypass
 * ```typescript
 * export const GET: RequestHandler = async ({ params, locals }) => {
 *   const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 *   const studentId = params.id;
 *
 *   // Automatically handles admin bypass
 *   const hasAccess = await verifyTeacherStudentWithRole(
 *     user.id,
 *     studentId,
 *     profile,
 *     locals.supabase
 *   );
 *
 *   if (!hasAccess) {
 *     throw error(403, 'You can only access students you teach');
 *   }
 *
 *   // Proceed with logic...
 * };
 * ```
 *
 * @example Migration from old pattern with admin check
 * ```typescript
 * // Before (35 lines):
 * const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 *
 * if (profile.role === 'teacher') {
 *   const { data: classCheck } = await supabase
 *     .from('class_members')
 *     .select(`
 *       class_id,
 *       classes!inner(teacher_id)
 *     `)
 *     .eq('student_id', studentId);
 *
 *   const teachesStudent = classCheck?.some((cm) => {
 *     const classes = cm.classes as unknown;
 *     if (classes && typeof classes === 'object' && 'teacher_id' in classes) {
 *       return (classes as { teacher_id: string }).teacher_id === user.id;
 *     }
 *     return false;
 *   });
 *
 *   if (!teachesStudent) {
 *     throw error(403, 'Not authorized');
 *   }
 * }
 * // Admins skip the check
 *
 * // After (3 lines):
 * const hasAccess = await verifyTeacherStudentWithRole(
 *   user.id, studentId, profile, locals.supabase
 * );
 * if (!hasAccess) {
 *   throw error(403, 'You can only access students you teach');
 * }
 * ```
 */
export async function verifyTeacherStudentWithRole(
	teacherId: string,
	studentId: string,
	profile: Profile,
	supabase: TypedSupabaseClient
): Promise<boolean> {
	// Admins have access to all students
	if (profile.role === 'admin') {
		return true;
	}

	// For non-admins, verify teacher-student relationship
	return verifyTeacherStudent(teacherId, studentId, supabase);
}
