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

			// Try to insert into pending_students table (normal flow)
			// This is the happy path: students don't exist yet and will be activated on first login
			const { data, error: insertError } = await supabase
				.from('pending_students')
				.insert(pendingStudents)
				.select();

			if (insertError) {
				console.error('Error inserting pending students:', insertError);

				// Handle duplicate emails (error code 23505 = unique_violation)
				// This happens when students logged in BEFORE being imported
				// In this case, we need to add them directly to class_members instead
				if (insertError.code === '23505') {
					console.log('Some students already exist, checking profiles...');

					let updatedCount = 0;
					let skippedCount = 0;

					// Process each student individually to handle already-logged-in students
					for (const student of pendingStudents) {
						// Check if student already has an active profile (logged in before import)
						const { data: existingProfile } = await supabase
							.from('profiles')
							.select('id, class_ids')
							.eq('email', student.email)
							.single();

						if (existingProfile) {
							console.log(`Profile exists for ${student.email}, updating profile and class memberships...`);

							// Update the student's profile with school_id, grade, and gender from import
							const profileUpdates: {
								school_id: string;
								grade?: string | null;
								gender?: string | null;
							} = {
								school_id: student.school_id
							};

							// Only update grade if provided in import
							if (student.grade) {
								profileUpdates.grade = student.grade;
							}

							// Only update gender if provided in import
							if (student.gender) {
								profileUpdates.gender = student.gender;
							}

							const { error: profileUpdateError } = await supabase
								.from('profiles')
								.update(profileUpdates)
								.eq('id', existingProfile.id);

							if (profileUpdateError) {
								console.error(`Error updating profile for ${student.email}:`, profileUpdateError);
							}

							// Add student to class_members table directly (bypassing pending_students)
							// This syncs their profile with the imported class assignments
							for (const classId of student.class_ids) {
								const { error: memberError } = await supabase
									.from('class_members')
									.insert({
										student_id: existingProfile.id,
										class_id: classId
									})
									.select();

								// Ignore if student is already in the class (error code 23505)
								if (memberError && memberError.code !== '23505') {
									console.error(`Error adding ${student.email} to class ${classId}:`, memberError);
								}
							}

							// Check if there's a pending_students entry for this email and mark it as activated
							// This handles the edge case where student logged in BEFORE being imported
							const { error: activateError } = await supabase
								.from('pending_students')
								.update({
									is_activated: true,
									activated_at: new Date().toISOString()
								})
								.eq('email', student.email)
								.eq('is_activated', false);

							if (activateError) {
								console.error(`Error activating pending student ${student.email}:`, activateError);
							}

							updatedCount++;
						} else {
							// Student not in profiles, try adding to pending_students individually
							const { error: pendingError } = await supabase
								.from('pending_students')
								.insert(student);

							if (pendingError && pendingError.code === '23505') {
								// Already exists in pending_students, skip
								console.log(`Student ${student.email} exists in pending_students, skipping...`);
								skippedCount++;
							} else if (pendingError) {
								console.error(`Error adding ${student.email} to pending:`, pendingError);
								skippedCount++;
							}
						}
					}

					// Return success with detailed counts
					return {
						success: true,
						count: pendingStudents.length,
						updated: updatedCount,
						skipped: skippedCount,
						message: `${updatedCount} élève(s) déjà existant(s) mis à jour, ${skippedCount} ignoré(s)`
					};
				}

				// Other database errors (not duplicate email)
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
