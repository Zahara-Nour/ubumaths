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

	// Fetch all schools for the school selector
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		console.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	// Fetch all classes for code mapping
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('*')
		.order('name');

	if (classesError) {
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Fetch pending students (not yet activated)
	const { data: pendingStudents, error: pendingError } = await supabase
		.from('pending_students')
		.select('*')
		.eq('is_activated', false)
		.order('created_at', { ascending: false });

	if (pendingError) {
		console.error('Error fetching pending students:', pendingError);
	}

	// Fetch activated students
	const { data: activatedStudents, error: activatedError } = await supabase
		.from('pending_students')
		.select('*')
		.eq('is_activated', true)
		.order('activated_at', { ascending: false });

	if (activatedError) {
		console.error('Error fetching activated students:', activatedError);
	}

	return {
		schools: schools || [],
		classes: classes || [],
		pendingStudents: pendingStudents || [],
		activatedStudents: activatedStudents || []
	};
};

export const actions: Actions = {
	/**
	 * Import students from CSV data
	 */
	import: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		// Check admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profile?.role !== 'admin') {
			return fail(403, { message: 'Admin access required' });
		}

		const formData = await request.formData();
		const studentsJson = formData.get('students') as string;
		const schoolId = formData.get('school_id') as string;

		if (!studentsJson || !schoolId) {
			return fail(400, { message: 'Missing required fields' });
		}

		try {
			const students = JSON.parse(studentsJson);

			// Validate data
			if (!Array.isArray(students) || students.length === 0) {
				return fail(400, { message: 'Invalid student data' });
			}

			// Fetch all classes to map codes to IDs
			const { data: classes, error: classesError } = await supabase
				.from('classes')
				.select('id, join_code');

			if (classesError) {
				console.error('Error fetching classes:', classesError);
				return fail(500, { message: 'Erreur lors de la récupération des classes' });
			}

			// Create a map of join_code -> class_id
			const classCodeMap = new Map<string, string>();
			classes?.forEach((c) => {
				classCodeMap.set(c.join_code.toUpperCase(), c.id);
			});

			// Prepare student records with class_ids resolved
			const pendingStudents = students.map((s) => {
				// Convert class codes to class IDs
				const classIds = (s.class_codes || [])
					.map((code: string) => classCodeMap.get(code.toUpperCase()))
					.filter((id: string | undefined): id is string => !!id);

				return {
					email: s.email.toLowerCase().trim(),
					firstname: s.firstname.trim(),
					lastname: s.lastname.trim(),
					grade: s.grade || null,
					gender: s.gender || null,
					school_id: schoolId,
					class_ids: classIds
				};
			});

			// Insert into pending_students table
			const { data, error: insertError } = await supabase
				.from('pending_students')
				.insert(pendingStudents)
				.select();

			if (insertError) {
				console.error('Error inserting pending students:', insertError);

				// Check for duplicate emails
				if (insertError.code === '23505') {
					return fail(400, {
						message: 'Un ou plusieurs emails existent déjà dans le système'
					});
				}

				return fail(500, { message: 'Erreur lors de l\'importation des élèves' });
			}

			return {
				success: true,
				count: data?.length || 0
			};
		} catch (err) {
			console.error('Error parsing student data:', err);
			return fail(400, { message: 'Données invalides' });
		}
	}
};
