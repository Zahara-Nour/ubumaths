/**
 * API Route: /api/python-exercises/[id]/submit
 * POST - Submit solution to exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	submitExerciseSchema,
	validationResultSchema,
	type SubmitExerciseInput
} from '$lib/server/validation/python-exercises';
import type { Database } from '$lib/types/database';
import { requireConsent } from '$lib/server/middleware/consent';
import { validateUuidParam } from '$lib/server/validation/params';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * POST /api/python-exercises/[id]/submit
 * Submit solution to exercise
 * Student only (must have access via assignment)
 *
 * @param id - Exercise UUID
 * @body SubmitExerciseInput (code + validation_result)
 * @returns Created submission
 *
 * NOTE: This endpoint does NOT run validation server-side
 * Validation is performed client-side via web worker
 * The validation_result is passed from the client
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Verify student role and check consent
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, consent_required, consent_granted_at, consent_grace_period_ends')
		.eq('id', user.id)
		.single();

	if (profileError || !profile || profile.role !== 'student') {
		throw error(403, 'Seuls les étudiants peuvent soumettre des solutions');
	}

	requireConsent(profile, 'submit_exercise');

	// Parse and validate request body
	const body = await request.json();
	const validation = submitExerciseSchema.safeParse({
		...body,
		exercise_id: exerciseId
	});

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${errorMsg}`);
	}

	const data = validation.data as SubmitExerciseInput;

	// Validate the validation_result structure (from client)
	if (!body.validation_result) {
		throw error(400, 'Le résultat de validation est requis');
	}

	const validationResultValidation = validationResultSchema.safeParse(body.validation_result);
	if (!validationResultValidation.success) {
		const errorMsg = validationResultValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Résultat de validation invalide: ${errorMsg}`);
	}

	const validationResult = validationResultValidation.data;

	// Verify student has access to this exercise
	// Student must have an assignment (class or individual)
	const { data: assignments } = await supabase
		.from('python_exercise_assignments')
		.select('id, class_id, student_id, max_attempts, due_date')
		.eq('exercise_id', exerciseId)
		.or(`student_id.eq.${user.id},class_id.in.(${await getStudentClassIds(supabase, user.id)})`);

	if (!assignments || assignments.length === 0) {
		throw error(403, "Vous n'avez pas accès à cet exercice");
	}

	// Find the most specific assignment (individual takes precedence over class)
	const assignment = assignments.find((a) => a.student_id === user.id) || assignments[0];

	// Check if assignment has passed due date (warning, not blocking)
	if (assignment.due_date) {
		const dueDate = new Date(assignment.due_date);
		if (dueDate < new Date()) {
			console.warn(`Student ${user.id} submitting after due date for exercise ${exerciseId}`);
		}
	}

	// Check max attempts if specified
	if (assignment.max_attempts) {
		// Count existing submissions for this exercise
		const { count: submissionCount, error: countError } = await supabase
			.from('python_exercise_submissions')
			.select('*', { count: 'exact', head: true })
			.eq('exercise_id', exerciseId)
			.eq('student_id', user.id)
			.eq('assignment_id', assignment.id);

		if (countError) {
			console.error('Failed to count submissions:', countError);
			throw error(500, 'Erreur lors de la vérification du nombre de tentatives');
		}

		if (submissionCount !== null && submissionCount >= assignment.max_attempts) {
			throw error(400, `Nombre maximum de tentatives atteint (${assignment.max_attempts})`);
		}
	}

	// Get next attempt number (auto-incremented by trigger, but we calculate for validation)
	const { count: attemptCount } = await supabase
		.from('python_exercise_submissions')
		.select('*', { count: 'exact', head: true })
		.eq('exercise_id', exerciseId)
		.eq('student_id', user.id);

	const nextAttemptNumber = (attemptCount || 0) + 1;

	// Create submission
	// Note: attempt_number is auto-set by trigger, but we include it for clarity
	const { data: submission, error: submissionError } = await supabase
		.from('python_exercise_submissions')
		.insert({
			exercise_id: exerciseId,
			assignment_id: assignment.id,
			student_id: user.id,
			code: data.code,
			validation_result: validationResult,
			is_correct: validationResult.valid,
			attempt_number: nextAttemptNumber, // Will be overridden by trigger
			execution_time_ms: validationResult.execution_time_ms
		})
		.select()
		.single();

	if (submissionError) {
		console.error('Failed to create submission:', submissionError);

		// Check for rate limit error
		if (submissionError.message?.includes('Limite de taux dépassée')) {
			throw error(429, submissionError.message);
		}

		// Check for max attempts error (from trigger)
		if (submissionError.message?.includes('Nombre maximum de tentatives atteint')) {
			throw error(400, submissionError.message);
		}

		throw error(500, 'Erreur lors de la création de la soumission');
	}

	return json(
		{
			submission,
			message: validationResult.valid
				? 'Solution correcte ! Félicitations !'
				: 'Solution incorrecte. Réessayez !'
		},
		{ status: 201 }
	);
};

/**
 * Helper function to get student's class IDs
 */
async function getStudentClassIds(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<string> {
	const { data: classes } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.eq('status', 'active');

	if (!classes || classes.length === 0) {
		return '';
	}

	return classes.map((c: { class_id: string }) => c.class_id).join(',');
}
