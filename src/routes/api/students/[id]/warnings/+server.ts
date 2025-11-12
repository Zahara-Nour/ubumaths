/**
 * API Endpoint: Get Student Warnings
 * ===================================
 *
 * Retrieve all warnings for a specific student.
 *
 * GET /api/students/{id}/warnings
 *
 * Route parameters:
 *   - id (string, UUID): Student's profile ID
 *
 * Response:
 *   - 200: { warnings: Warning[] }
 *   - 400: Validation error (invalid UUID)
 *   - 401: Not authenticated
 *   - 403: Unauthorized (not teacher/admin or student not in class)
 *   - 500: Server error
 *
 * SECURITY:
 * - Requires authentication (teacher/admin)
 * - Teacher must teach the student (class_members check)
 * - Student ID validated as UUID with Zod schema
 *
 * RESPONSE FORMAT:
 * {
 *   "warnings": [
 *     {
 *       "id": "uuid",
 *       "student_id": "uuid",
 *       "warning_type": "C" | "M" | "R" | "T",
 *       "class_id": "uuid",
 *       "academic_period_id": "uuid",
 *       "created_by": "uuid",
 *       "created_at": "timestamp",
 *       "updated_at": "timestamp"
 *     }
 *   ]
 * }
 *
 * WARNING TYPES:
 * - C: Comportement (Behavior)
 * - M: Matériel (Equipment/Materials)
 * - R: Retard (Late)
 * - T: Travail (Work/Homework)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { getStudentWarningsSchema } from '$lib/server/validation/warnings';
import type { Database } from '$lib/types/database';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

// Type for warning response
type WarningRow = Database['public']['Tables']['student_warnings']['Row'];

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication (teacher/admin only)
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	// Validate student ID from route parameter
	const validation = getStudentWarningsSchema.safeParse({
		student_id: params.id
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { student_id: studentId } = validation.data;

	// Verify teacher-student relationship (admins bypass this check)
	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'You can only view warnings for students in your classes');
	}

	// Fetch all warnings for the student, ordered by most recent first
	const { data: warnings, error: fetchError } = await supabase
		.from('student_warnings')
		.select(
			'id, student_id, warning_type, class_id, academic_period_id, created_by, created_at, updated_at'
		)
		.eq('student_id', studentId)
		.order('created_at', { ascending: false });

	if (fetchError) {
		console.error('[get-student-warnings] Error fetching warnings:', fetchError);
		throw error(500, `Failed to fetch warnings: ${fetchError.message}`);
	}

	// Return warnings (empty array if none found)
	return json({
		warnings: (warnings || []) as WarningRow[]
	});
};
