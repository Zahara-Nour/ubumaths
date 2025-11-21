/**
 * Teacher Student Journal Page - Server Load
 * ==========================================
 *
 * Pre-loads student basic info and verifies teacher authorization.
 *
 * SECURITY:
 * - Requires teacher or admin role
 * - Verifies teacher teaches the student via verifyTeacherStudentWithRole
 * - Admins can access any student
 *
 * DATA LOADED:
 * - Student profile (id, firstname, lastname, avatar_url)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

// Validate studentId path parameter
const studentIdSchema = z.object({
	studentId: z.string().uuid('ID étudiant invalide')
});

export const load: PageServerLoad = async ({ params, locals }) => {
	// Require teacher or admin authentication
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	// Validate studentId
	const paramValidation = studentIdSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const { studentId } = paramValidation.data;

	// Verify teacher-student relationship (admins bypass this check)
	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);

	if (!hasAccess) {
		throw error(403, 'Vous ne pouvez consulter que le journal de vos propres élèves');
	}

	// Fetch student profile
	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, avatar_url')
		.eq('id', studentId)
		.single();

	if (studentError || !student) {
		console.error('[Teacher Journal] Error fetching student:', studentError);
		throw error(404, 'Élève non trouvé');
	}

	return {
		student: {
			id: student.id,
			firstname: student.firstname,
			lastname: student.lastname,
			avatar_url: student.avatar_url
		}
	};
};
