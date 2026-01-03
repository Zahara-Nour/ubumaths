/**
 * API Route: /api/python-exercises/[id]/results
 * GET - Get submission results for an exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exerciseIdParamSchema } from '$lib/server/validation/python-exercises';
import { z } from 'zod';

type ZodIssue = { path: (string | number)[]; message: string };

// Query params validation
const resultsQuerySchema = z.object({
	class_id: z.string().uuid().optional(),
	student_id: z.string().uuid().optional()
});

/**
 * GET /api/python-exercises/[id]/results
 * Get submission results for an exercise
 * Teacher only
 *
 * Query params:
 * - class_id: Filter by class (optional)
 * - student_id: Filter by student (optional)
 *
 * @param id - Exercise UUID
 * @returns Array of submissions with student info
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Validate ID parameter
	const idValidation = exerciseIdParamSchema.safeParse({ id: params.id });
	if (!idValidation.success) {
		throw error(400, "ID d'exercice invalide");
	}

	const exerciseId = params.id;

	// Verify teacher role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile || profile.role !== 'teacher') {
		throw error(403, 'Seuls les enseignants peuvent voir les résultats');
	}

	// Verify exercise exists and teacher has access
	const { data: exercise, error: exerciseError } = await supabase
		.from('python_exercises')
		.select('author_id')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercice introuvable');
	}

	// Teacher must be the author or have assigned this exercise
	const { data: assignments } = await supabase
		.from('python_exercise_assignments')
		.select('id')
		.eq('exercise_id', exerciseId)
		.eq('assigned_by', user.id);

	if (exercise.author_id !== user.id && (!assignments || assignments.length === 0)) {
		throw error(403, "Vous n'avez pas accès aux résultats de cet exercice");
	}

	// Validate query parameters
	const queryValidation = resultsQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id'),
		student_id: url.searchParams.get('student_id')
	});

	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Paramètres de requête invalides: ${errorMsg}`);
	}

	const { class_id, student_id } = queryValidation.data;

	// Build query for submissions
	let query = supabase
		.from('python_exercise_submissions')
		.select(
			`
			*,
			student:profiles!python_exercise_submissions_student_id_fkey(
				id,
				first_name,
				last_name,
				email
			),
			assignment:python_exercise_assignments(
				id,
				class_id,
				student_id,
				due_date,
				max_attempts,
				class:classes(
					id,
					name
				)
			)
		`
		)
		.eq('exercise_id', exerciseId)
		.order('created_at', { ascending: false });

	// Apply filters
	if (student_id) {
		query = query.eq('student_id', student_id);
	}

	if (class_id) {
		// Get students from the specified class
		const { data: classMembers } = await supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', class_id)
			.eq('status', 'active');

		if (!classMembers || classMembers.length === 0) {
			return json({ results: [] });
		}

		const studentIds = classMembers.map((cm) => cm.student_id);
		query = query.in('student_id', studentIds);
	} else {
		// If no class filter, only show submissions from teacher's students
		const { data: teacherClasses } = await supabase
			.from('classes')
			.select('id')
			.eq('teacher_id', user.id);

		if (teacherClasses && teacherClasses.length > 0) {
			const classIds = teacherClasses.map((c) => c.id);

			const { data: classMembers } = await supabase
				.from('class_members')
				.select('student_id')
				.in('class_id', classIds)
				.eq('status', 'active');

			if (classMembers && classMembers.length > 0) {
				const studentIds = classMembers.map((cm) => cm.student_id);
				query = query.in('student_id', studentIds);
			} else {
				// No students in teacher's classes
				return json({ results: [] });
			}
		} else {
			// Teacher has no classes
			return json({ results: [] });
		}
	}

	// Execute query
	const { data: submissions, error: submissionsError } = await query;

	if (submissionsError) {
		console.error('Failed to fetch submissions:', submissionsError);
		throw error(500, 'Erreur lors de la récupération des résultats');
	}

	// Transform data for response
	const results = (submissions || []).map((sub) => ({
		id: sub.id,
		student: sub.student,
		code: sub.code,
		validation_result: sub.validation_result,
		is_correct: sub.is_correct,
		attempt_number: sub.attempt_number,
		execution_time_ms: sub.execution_time_ms,
		created_at: sub.created_at,
		assignment: sub.assignment
	}));

	// Group results by student for summary statistics
	const studentStats = results.reduce(
		(acc, result) => {
			const studentId = result.student.id;

			if (!acc[studentId]) {
				acc[studentId] = {
					student: result.student,
					total_attempts: 0,
					successful_attempts: 0,
					best_attempt: null,
					latest_attempt: null
				};
			}

			acc[studentId].total_attempts++;
			if (result.is_correct) {
				acc[studentId].successful_attempts++;
			}

			// Track best attempt (first successful or lowest attempt number)
			if (
				!acc[studentId].best_attempt ||
				(result.is_correct && !acc[studentId].best_attempt.is_correct) ||
				(result.is_correct &&
					acc[studentId].best_attempt.is_correct &&
					result.attempt_number < acc[studentId].best_attempt.attempt_number)
			) {
				acc[studentId].best_attempt = result;
			}

			// Track latest attempt
			if (
				!acc[studentId].latest_attempt ||
				new Date(result.created_at) > new Date(acc[studentId].latest_attempt.created_at)
			) {
				acc[studentId].latest_attempt = result;
			}

			return acc;
		},
		{} as Record<
			string,
			{
				student: { id: string; first_name: string; last_name: string; email: string };
				total_attempts: number;
				successful_attempts: number;
				best_attempt: (typeof results)[0] | null;
				latest_attempt: (typeof results)[0] | null;
			}
		>
	);

	return json({
		results,
		summary: Object.values(studentStats)
	});
};
