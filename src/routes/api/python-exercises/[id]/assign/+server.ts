/**
 * API Route: /api/python-exercises/[id]/assign
 * POST - Assign exercise to class or student
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	assignExerciseSchema,
	type AssignExerciseInput
} from '$lib/server/validation/python-exercises';
import { validateUuidParam } from '$lib/server/validation/params';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * POST /api/python-exercises/[id]/assign
 * Assign exercise to class or individual student
 * Teacher only (must own the class/student)
 *
 * @param id - Exercise UUID
 * @body AssignExerciseInput
 * @returns Created assignment
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Verify teacher role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile || profile.role !== 'teacher') {
		throw error(403, 'Seuls les enseignants peuvent assigner des exercices');
	}

	// Verify exercise exists
	const { data: exercise, error: exerciseError } = await supabase
		.from('python_exercises')
		.select('id, author_id, is_public')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercice introuvable');
	}

	// Teacher must own the exercise or it must be public
	if (exercise.author_id !== user.id && !exercise.is_public) {
		throw error(403, 'Vous ne pouvez assigner que vos exercices ou des exercices publics');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = assignExerciseSchema.safeParse({
		...body,
		exercise_id: exerciseId
	});

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${errorMsg}`);
	}

	const data = validation.data as AssignExerciseInput;

	// Validate that exactly one of class_id or student_id is provided
	if ((data.class_id && data.student_id) || (!data.class_id && !data.student_id)) {
		throw error(400, 'Vous devez fournir soit class_id soit student_id, mais pas les deux');
	}

	// If assigning to class, verify teacher owns the class
	if (data.class_id) {
		const { data: classData, error: classError } = await supabase
			.from('classes')
			.select('teacher_id')
			.eq('id', data.class_id)
			.single();

		if (classError || !classData) {
			throw error(404, 'Classe introuvable');
		}

		if (classData.teacher_id !== user.id) {
			throw error(403, "Vous ne pouvez assigner qu'à vos propres classes");
		}
	}

	// If assigning to student, verify student is in one of teacher's classes
	if (data.student_id) {
		const { data: studentClasses } = await supabase
			.from('class_members')
			.select('class_id, classes!inner(teacher_id)')
			.eq('student_id', data.student_id);

		if (!studentClasses || studentClasses.length === 0) {
			throw error(404, 'Étudiant introuvable dans vos classes');
		}

		const isInTeacherClass = studentClasses.some((sc) => {
			const classes = sc.classes as unknown as { teacher_id: string };
			return classes.teacher_id === user.id;
		});

		if (!isInTeacherClass) {
			throw error(403, "Vous ne pouvez assigner qu'à vos propres étudiants");
		}
	}

	// Create assignment
	const { data: assignment, error: assignmentError } = await supabase
		.from('python_exercise_assignments')
		.insert({
			exercise_id: exerciseId,
			class_id: data.class_id || null,
			student_id: data.student_id || null,
			assigned_by: user.id,
			due_date: data.due_date || null,
			max_attempts: data.max_attempts || null
		})
		.select()
		.single();

	if (assignmentError) {
		console.error('Failed to create assignment:', assignmentError);

		// Check for duplicate assignment
		if (assignmentError.code === '23505') {
			throw error(400, 'Cet exercice est déjà assigné à cette classe/étudiant');
		}

		throw error(500, "Erreur lors de la création de l'assignation");
	}

	return json({ assignment }, { status: 201 });
};
