/**
 * Admin Users Management Server
 *
 * This server file provides:
 * - Loading classes and schools data for selectors
 * - Count of pending user approvals
 * - Profile update action (name, email, role, school, gender, avatar)
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

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { validateFormData, updateProfileFormSchema } from '$lib/server/validation';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase, safeGetSession: _safeGetSession } = locals;

	if (!user) {
		throw error(401, 'Unauthorized');
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
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Fetch all schools for the school selector
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		console.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	// Count pending users awaiting approval
	const { count: pendingCount, error: countError } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'pending');

	if (countError) {
		console.error('Error counting pending users:', countError);
		// Don't throw - just log and continue with 0
	}

	return {
		classes: classes || [],
		schools: schools || [],
		pendingCount: pendingCount ?? 0
	};
};

export const actions: Actions = {
	update_profile: async ({ request, locals }) => {
		const { user, supabase } = locals;

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();

		const validation = validateFormData(updateProfileFormSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		// Build update object
		const updateData = {
			firstname: validation.data.firstname,
			lastname: validation.data.lastname,
			email: validation.data.email,
			role: validation.data.role,
			school_id: validation.data.school_id,
			avatar_url: validation.data.avatar_url,
			gender: validation.data.gender,
			is_test: validation.data.is_test ?? false
		};

		const { error: updateError } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', validation.data.user_id);

		if (updateError) {
			console.error('Update error:', updateError);
			return fail(400, { message: updateError.message });
		}

		// Fetch the updated profile with school relation and classes
		const { data: updatedProfile, error: fetchError } = await supabase
			.from('profiles')
			.select('*, schools(name), class_members(class_id)')
			.eq('id', validation.data.user_id)
			.single();

		if (fetchError) {
			console.error('Fetch error:', fetchError);
			return { success: true }; // Still return success even if fetch fails
		}

		// Transform class_members array to class_ids array for easier use
		const profileWithClasses = {
			...updatedProfile,
			class_ids: updatedProfile.class_members?.map((cm: { class_id: string }) => cm.class_id) || []
		};

		return { success: true, profile: profileWithClasses };
	}
};
