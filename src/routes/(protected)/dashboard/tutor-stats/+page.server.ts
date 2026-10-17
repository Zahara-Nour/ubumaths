import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/tutor-stats/+page.server');

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
		.order('name');

	if (classesError) {
		logger.error('Failed to load classes:', classesError);
	}

	return {
		classes: classes || [],
		teacherId: user.id,
		teacherRole: profile.role
	};
};
