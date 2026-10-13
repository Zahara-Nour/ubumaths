import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	validateFormData,
	importStudentsFormSchema,
	importedStudentsSchema
} from '$lib/server/validation';
import { requireAdmin } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/import-students/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	// Admin only (real admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	// Fetch all schools for the school selector
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		logger.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	// Fetch all classes for code mapping
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('*')
		.order('name');

	if (classesError) {
		logger.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Fetch pending students (not yet activated)
	const { data: pendingStudents, error: pendingError } = await supabase
		.from('pending_students')
		.select('*')
		.eq('is_activated', false)
		.order('created_at', { ascending: false });

	if (pendingError) {
		logger.error('Error fetching pending students:', pendingError);
	}

	// Fetch activated students
	const { data: activatedStudents, error: activatedError } = await supabase
		.from('pending_students')
		.select('*')
		.eq('is_activated', true)
		.order('activated_at', { ascending: false });

	if (activatedError) {
		logger.error('Error fetching activated students:', activatedError);
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
	import: async ({ request, locals }) => {
		// Admin only (real admin login OR step-up elevation)
		const { supabase } = await requireAdmin(locals);

		const formData = await request.formData();

		const validation = validateFormData(importStudentsFormSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		const { students: studentsJson, school_id: schoolId } = validation.data;

		// Chaque élève est validé (champs, nombre) avant toute écriture.
		let studentsInput: unknown;
		try {
			studentsInput = JSON.parse(studentsJson);
		} catch {
			return fail(400, { message: 'Données invalides' });
		}
		const studentsResult = importedStudentsSchema.safeParse(studentsInput);
		if (!studentsResult.success) {
			const issue = studentsResult.error.issues[0];
			const line = typeof issue.path[0] === 'number' ? `Élève n° ${issue.path[0] + 1} : ` : '';
			return fail(400, { message: `${line}${issue.message}` });
		}
		const students = studentsResult.data;

		// Fetch all classes to map codes to IDs
		const { data: classes, error: classesError } = await supabase
			.from('classes')
			.select('id, join_code');

		if (classesError) {
			logger.error('Error fetching classes:', classesError);
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
			const classIds = s.class_codes
				.map((code) => classCodeMap.get(code))
				.filter((id): id is string => !!id);

			return {
				email: s.email,
				firstname: s.firstname,
				lastname: s.lastname,
				grade: s.grade,
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
			logger.error('Error inserting pending students:', insertError);

			// Handle duplicate emails (error code 23505 = unique_violation)
			// This happens when students logged in BEFORE being imported
			// In this case, we need to add them directly to class_members instead
			if (insertError.code === '23505') {
				logger.info('Some students already exist, checking profiles...');

				let updatedCount = 0;
				let skippedCount = 0;

				// Process each student individually to handle already-logged-in students
				for (const student of pendingStudents) {
					// Check if student already has an active profile (logged in before import)
					const { data: existingProfile, error: existingProfileError } = await supabase
						.from('profiles')
						.select('id, class_ids')
						.eq('email', student.email)
						.single();

					// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
					// panne prenait le même visage et faisait conclure « rien ici », donc créer
					// par-dessus ce qu'on n'avait simplement pas su lire.
					if (existingProfileError && existingProfileError.code !== 'PGRST116') {
						logger.error('Lecture impossible :', existingProfileError);
						return fail(500, { message: 'Impossible de vérifier l’état actuel' });
					}

					if (existingProfile) {
						logger.info(
							`Profile exists for ${existingProfile.id}, updating profile and class memberships...`
						);

						// Update the student's profile with school_id and grade from import
						const profileUpdates: {
							school_id: string;
							grade?: string | null;
						} = {
							school_id: student.school_id
						};

						// Only update grade if provided in import
						if (student.grade) {
							profileUpdates.grade = student.grade;
						}

						const { error: profileUpdateError } = await supabase
							.from('profiles')
							.update(profileUpdates)
							.eq('id', existingProfile.id);

						if (profileUpdateError) {
							logger.error(`Error updating profile for ${existingProfile.id}:`, profileUpdateError);
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
								logger.error(
									`Error adding ${existingProfile.id} to class ${classId}:`,
									memberError
								);
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
							logger.error(
								`Error activating pending student ${existingProfile.id}:`,
								activateError
							);
						}

						updatedCount++;
					} else {
						// Student not in profiles, try adding to pending_students individually
						const { error: pendingError } = await supabase.from('pending_students').insert(student);

						if (pendingError && pendingError.code === '23505') {
							// Already exists in pending_students, skip
							logger.info('Student already in pending_students, skipping...');
							skippedCount++;
						} else if (pendingError) {
							logger.error('Error adding student to pending:', pendingError);
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
			return fail(500, { message: "Erreur lors de l'importation des élèves" });
		}

		return {
			success: true,
			count: data?.length || 0
		};
	}
};
