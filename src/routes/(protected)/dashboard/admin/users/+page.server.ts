import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

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
	search_users: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const searchTerm = (formData.get('search') as string)?.trim();

		if (!searchTerm || searchTerm.length < 3) {
			return fail(400, { message: 'Search term must be at least 3 characters' });
		}

		// Case-insensitive partial match across email, firstname, lastname (OR logic)
		const { data: users, error: searchError } = await supabase
			.from('profiles')
			.select('*, schools(name)')
			.or(
				`email.ilike.%${searchTerm}%,firstname.ilike.%${searchTerm}%,lastname.ilike.%${searchTerm}%`
			)
			.order('lastname', { ascending: true })
			.order('firstname', { ascending: true })
			.limit(50);

		if (searchError) {
			console.error('Search error:', searchError);
			return fail(400, { message: 'Search failed' });
		}

		return {
			success: true,
			users: users || []
		};
	},

	get_class_students: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const classId = formData.get('class_id') as string;

		if (!classId) {
			return fail(400, { message: 'Class ID is required' });
		}

		// Get all profiles where class_ids array contains the given classId
		const { data: students, error: studentsError } = await supabase
			.from('profiles')
			.select('*, schools(name)')
			.contains('class_ids', [classId])
			.order('lastname', { ascending: true })
			.order('firstname', { ascending: true });

		if (studentsError) {
			console.error('Error fetching class students:', studentsError);
			return fail(400, { message: 'Failed to fetch students' });
		}

		return {
			success: true,
			users: students || []
		};
	},

	update_profile: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;
		const firstname = formData.get('firstname') as string;
		const lastname = formData.get('lastname') as string;
		const email = formData.get('email') as string;
		const role = formData.get('role') as 'student' | 'teacher' | 'admin';
		const schoolId = formData.get('school_id') as string;
		const avatarUrl = formData.get('avatar_url') as string;
		const gender = formData.get('gender') as 'boy' | 'girl' | '';

		if (!userId) {
			return fail(400, { message: 'User ID is required' });
		}

		// Build update object
		const updateData: any = {
			firstname: firstname || null,
			lastname: lastname || null,
			email,
			role,
			school_id: schoolId || null,
			avatar_url: avatarUrl || null,
			gender: gender || null
		};

		const { error: updateError } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', userId);

		if (updateError) {
			console.error('Update error:', updateError);
			return fail(400, { message: updateError.message });
		}

		// Fetch the updated profile with school relation and classes
		const { data: updatedProfile, error: fetchError } = await supabase
			.from('profiles')
			.select('*, schools(name), class_members(class_id)')
			.eq('id', userId)
			.single();

		if (fetchError) {
			console.error('Fetch error:', fetchError);
			return { success: true }; // Still return success even if fetch fails
		}

		// Transform class_members array to class_ids array for easier use
		const profileWithClasses = {
			...updatedProfile,
			class_ids: updatedProfile.class_members?.map((cm: any) => cm.class_id) || []
		};

		return { success: true, profile: profileWithClasses };
	},

	add_to_class: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;
		const classId = formData.get('class_id') as string;

		if (!userId || !classId) {
			return fail(400, { message: 'User ID and Class ID are required' });
		}

		// Get current class_ids
		const { data: profile, error: fetchError } = await supabase
			.from('profiles')
			.select('class_ids')
			.eq('id', userId)
			.single();

		if (fetchError) {
			console.error('Fetch error:', fetchError);
			return fail(400, { message: 'Failed to fetch user profile' });
		}

		const currentClassIds = profile.class_ids || [];

		// Check if already in class
		if (currentClassIds.includes(classId)) {
			return fail(400, { message: 'User is already in this class' });
		}

		// Add class to array
		const newClassIds = [...currentClassIds, classId];

		const { error: updateError } = await supabase
			.from('profiles')
			.update({ class_ids: newClassIds })
			.eq('id', userId);

		if (updateError) {
			console.error('Update error:', updateError);
			return fail(400, { message: updateError.message });
		}

		return { success: true };
	},

	remove_from_class: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;
		const classId = formData.get('class_id') as string;

		if (!userId || !classId) {
			return fail(400, { message: 'User ID and Class ID are required' });
		}

		// Get current class_ids
		const { data: profile, error: fetchError } = await supabase
			.from('profiles')
			.select('class_ids')
			.eq('id', userId)
			.single();

		if (fetchError) {
			console.error('Fetch error:', fetchError);
			return fail(400, { message: 'Failed to fetch user profile' });
		}

		const currentClassIds = profile.class_ids || [];

		// Remove class from array
		const newClassIds = currentClassIds.filter((id: string) => id !== classId);

		const { error: updateError } = await supabase
			.from('profiles')
			.update({ class_ids: newClassIds })
			.eq('id', userId);

		if (updateError) {
			console.error('Update error:', updateError);
			return fail(400, { message: updateError.message });
		}

		return { success: true };
	}
};
