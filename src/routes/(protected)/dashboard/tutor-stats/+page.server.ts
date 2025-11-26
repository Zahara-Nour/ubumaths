import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';

/**
 * Tutor Statistics Dashboard - Server Load
 *
 * Loads initial data for teacher dashboard showing tutor conversation statistics
 *
 * SECURITY:
 * - Only teachers and admins can access
 * - Teachers see only their own classes
 * - RLS policies enforce data access control
 */
export const load: PageServerLoad = async ({ locals }) => {
	// Require teacher or admin role
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Get teacher's classes for filter dropdown
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id)
		.order('name');

	if (classesError) {
		console.error('Failed to load classes:', classesError);
	}

	return {
		classes: classes || [],
		teacherId: user.id,
		teacherRole: profile.role
	};
};
