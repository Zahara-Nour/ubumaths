/**
 * Admin Users Management Server
 *
 * This server file provides:
 * - Loading classes and schools data for selectors
 * - Count of pending user approvals
 * - Profile update action (name, email, role, school, avatar)
 *
 * ACCESS: Admin and Teacher roles
 * - Teachers can only see pending users (due to RLS policies)
 * - Admins have full access to all users
 *
 * NOTE: User search and class filtering are handled by API routes:
 * - /api/admin/search-users (text search by email/name)
 * - /api/admin/class-students (filter by class)
 * - /api/admin/add-to-class (add student to class via class_members table)
 * - /api/admin/remove-from-class (remove student from class via class_members table)
 * - /api/admin/users/[id]/status (approve/reject pending users)
 *
 * IMPORTANT: All class membership operations use the class_members table,
 * which is the source of truth. The profiles.class_ids array is kept in sync
 * via database triggers for backward compatibility.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/users/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase, safeGetSession: _safeGetSession } = locals;

	if (!user) {
		throw error(401, 'Connexion requise');
	}

	// Allow admin and teacher roles (teachers will only see pending users due to RLS)
	if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
		throw error(403, 'Accès réservé aux administrateurs et enseignants');
	}

	// Fetch all classes for the selectors
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('*')
		.order('name');

	if (classesError) {
		logger.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Fetch all schools for the school selector
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		logger.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	// Count pending users awaiting approval
	const { count: pendingCount, error: countError } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'pending');

	if (countError) {
		logger.error('Error counting pending users:', countError);
		// Don't throw - just log and continue with 0
	}

	return {
		classes: classes || [],
		schools: schools || [],
		pendingCount: pendingCount ?? 0
	};
};
