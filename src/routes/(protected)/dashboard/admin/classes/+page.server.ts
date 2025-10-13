import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, parent }) => {
	// Get authenticated user from session
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Get profile from parent layout (already verified by dashboard layout)
	const { profile } = await parent();

	// Verify admin role
	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// Fetch all schools
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		console.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	// Fetch all teachers (for teacher assignment dropdown)
	const { data: teachers, error: teachersError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email, school_id')
		.eq('role', 'teacher')
		.order('lastname')
		.order('firstname');

	if (teachersError) {
		console.error('Error fetching teachers:', teachersError);
		throw error(500, 'Failed to load teachers');
	}

	// Fetch all classes with teacher and school info
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select(`
			*,
			teacher:profiles!classes_teacher_id_fkey(id, firstname, lastname, email),
			school:schools(id, name)
		`)
		.order('name');

	if (classesError) {
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Count students for each class
	const classesWithCounts = await Promise.all(
		(classes || []).map(async (classItem) => {
			const { count, error: countError } = await supabase
				.from('profiles')
				.select('id', { count: 'exact', head: true })
				.contains('class_ids', [classItem.id]);

			if (countError) {
				console.error(`Error counting students for class ${classItem.id}:`, countError);
			}

			return {
				...classItem,
				student_count: count || 0
			};
		})
	);

	return {
		schools: schools || [],
		teachers: teachers || [],
		classes: classesWithCounts || []
	};
};

export const actions: Actions = {
	create: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const teacher_id = formData.get('teacher_id') as string;
		const school_id = formData.get('school_id') as string;
		const custom_join_code = formData.get('join_code') as string;

		// Validate required fields
		if (!name || !teacher_id) {
			return fail(400, { message: 'Name and teacher are required' });
		}

		// Generate or use custom join code
		let join_code = custom_join_code?.trim().toUpperCase();

		if (!join_code) {
			// Auto-generate join code
			const { data: generatedCode, error: rpcError } = await supabase.rpc('generate_join_code');

			if (rpcError || !generatedCode) {
				console.error('Error generating join code:', rpcError);
				return fail(500, { message: 'Failed to generate join code' });
			}

			join_code = generatedCode;
		} else {
			// Validate custom join code is unique
			const { data: existingClass, error: checkError } = await supabase
				.from('classes')
				.select('id')
				.eq('join_code', join_code)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				// PGRST116 = no rows returned (good, code is unique)
				console.error('Error checking join code:', checkError);
				return fail(400, { message: 'Error validating join code' });
			}

			if (existingClass) {
				return fail(400, { message: 'Join code already exists. Please choose another.' });
			}
		}

		// Insert class
		const { error: insertError } = await supabase.from('classes').insert({
			name,
			description: description || null,
			teacher_id,
			school_id: school_id || null,
			join_code,
			is_active: true
		});

		if (insertError) {
			console.error('Error creating class:', insertError);
			return fail(400, { message: insertError.message });
		}

		return { success: true };
	},

	update: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const teacher_id = formData.get('teacher_id') as string;
		const school_id = formData.get('school_id') as string;
		const join_code = formData.get('join_code') as string;
		const is_active = formData.get('is_active') === 'true';

		// Validate required fields
		if (!id || !name || !teacher_id) {
			return fail(400, { message: 'ID, name, and teacher are required' });
		}

		// If join code changed, validate it's unique
		const { data: currentClass, error: fetchError } = await supabase
			.from('classes')
			.select('join_code')
			.eq('id', id)
			.single();

		if (fetchError) {
			console.error('Error fetching current class:', fetchError);
			return fail(400, { message: 'Failed to fetch class' });
		}

		if (join_code !== currentClass.join_code) {
			// Validate new join code is unique
			const { data: existingClass, error: checkError } = await supabase
				.from('classes')
				.select('id')
				.eq('join_code', join_code)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.error('Error checking join code:', checkError);
				return fail(400, { message: 'Error validating join code' });
			}

			if (existingClass) {
				return fail(400, { message: 'Join code already exists. Please choose another.' });
			}
		}

		// Update class
		const { error: updateError } = await supabase
			.from('classes')
			.update({
				name,
				description: description || null,
				teacher_id,
				school_id: school_id || null,
				join_code,
				is_active
			})
			.eq('id', id);

		if (updateError) {
			console.error('Error updating class:', updateError);
			return fail(400, { message: updateError.message });
		}

		return { success: true };
	},

	deactivate: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { message: 'Class ID is required' });
		}

		const { error: updateError } = await supabase
			.from('classes')
			.update({ is_active: false })
			.eq('id', id);

		if (updateError) {
			console.error('Error deactivating class:', updateError);
			return fail(400, { message: updateError.message });
		}

		return { success: true };
	}
};
