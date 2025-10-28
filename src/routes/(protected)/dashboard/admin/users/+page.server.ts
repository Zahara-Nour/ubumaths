/**
 * Admin Users Management Server
 *
 * This server file provides:
 * - Loading classes and schools data for selectors
 * - Profile update action (name, email, role, school, gender, avatar)
 *
 * NOTE: User search and class filtering are handled by API routes:
 * - /api/admin/search-users (text search by email/name)
 * - /api/admin/class-students (filter by class)
 * - /api/admin/add-to-class (add student to class via class_members table)
 * - /api/admin/remove-from-class (remove student from class via class_members table)
 *
 * IMPORTANT: All class membership operations use the class_members table,
 * which is the source of truth. The profiles.class_ids array is kept in sync
 * via database triggers for backward compatibility.
 */

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { validateFormData, updateProfileFormSchema } from '$lib/server/validation';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, parent }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { profile } = await parent();

	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
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

	return {
		classes: classes || [],
		schools: schools || []
	};
};

export const actions: Actions = {
	update_profile: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

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
			class_ids: updatedProfile.class_members?.map((cm) => cm.class_id) || []
		};

		return { success: true, profile: profileWithClasses };
	}
};
