/**
 * API Route: /api/python-exercises/[id]
 * GET - Get exercise by ID
 * PUT - Update exercise
 * DELETE - Delete exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	updateExerciseSchema,
	type UpdateExerciseInput
} from '$lib/server/validation/python-exercises';
import type { PythonExercise, PythonExerciseStudentView } from '$lib/types/python-exercises';
import type { Database } from '$lib/types/database';
import { validateUuidParam } from '$lib/server/validation/params';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/python-exercises/[id]
 * Get exercise by ID
 *
 * Teachers: See all fields
 * Students: See without solution_code (only if assigned)
 *
 * @param id - Exercise UUID
 * @returns Exercise data
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Get user role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		throw error(403, 'Profil utilisateur introuvable');
	}

	// Fetch exercise
	const { data: exercise, error: exerciseError } = await supabase
		.from('python_exercises')
		.select('*')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercice introuvable');
	}

	// For students, verify they have access and exclude solution_code
	if (profile.role === 'student') {
		// Check if student has access (via assignment)
		const { data: assignments } = await supabase
			.from('python_exercise_assignments')
			.select('id')
			.eq('exercise_id', exerciseId)
			.or(`student_id.eq.${user.id},class_id.in.(${await getStudentClassIds(supabase, user.id)})`)
			.limit(1);

		if (!assignments || assignments.length === 0) {
			throw error(403, "Vous n'avez pas accès à cet exercice");
		}

		// Remove solution_code
		const { solution_code: _solution_code, ...studentView } = exercise;
		return json({ exercise: studentView as PythonExerciseStudentView });
	}

	// Teachers can see full exercise if they own it or if it's public
	if (profile.role === 'teacher') {
		if (exercise.author_id !== user.id && !exercise.is_public) {
			throw error(403, "Vous n'avez pas accès à cet exercice");
		}

		return json({ exercise: exercise as PythonExercise });
	}

	throw error(403, 'Rôle utilisateur non autorisé');
};

/**
 * PUT /api/python-exercises/[id]
 * Update exercise
 * Only the author can update
 *
 * @param id - Exercise UUID
 * @body UpdateExerciseInput (partial)
 * @returns Updated exercise
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
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
		throw error(403, 'Seuls les enseignants peuvent modifier des exercices');
	}

	// Check if exercise exists and user is the author
	const { data: existingExercise, error: fetchError } = await supabase
		.from('python_exercises')
		.select('author_id')
		.eq('id', exerciseId)
		.single();

	if (fetchError || !existingExercise) {
		throw error(404, 'Exercice introuvable');
	}

	if (existingExercise.author_id !== user.id) {
		throw error(403, 'Vous ne pouvez modifier que vos propres exercices');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = updateExerciseSchema.safeParse({ ...body, id: exerciseId });

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${errorMsg}`);
	}

	const { id: _id, ...updateData } = validation.data as UpdateExerciseInput;

	// Update exercise
	const { data: updatedExercise, error: updateError } = await supabase
		.from('python_exercises')
		.update(updateData)
		.eq('id', exerciseId)
		.select()
		.single();

	if (updateError) {
		console.error('Failed to update exercise:', updateError);
		throw error(500, "Erreur lors de la mise à jour de l'exercice");
	}

	return json({ exercise: updatedExercise });
};

/**
 * DELETE /api/python-exercises/[id]
 * Delete exercise
 * Only the author can delete
 *
 * @param id - Exercise UUID
 * @returns Success confirmation
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
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
		throw error(403, 'Seuls les enseignants peuvent supprimer des exercices');
	}

	// Check if exercise exists and user is the author
	const { data: existingExercise, error: fetchError } = await supabase
		.from('python_exercises')
		.select('author_id')
		.eq('id', exerciseId)
		.single();

	if (fetchError || !existingExercise) {
		throw error(404, 'Exercice introuvable');
	}

	if (existingExercise.author_id !== user.id) {
		throw error(403, 'Vous ne pouvez supprimer que vos propres exercices');
	}

	// Delete exercise (CASCADE will delete assignments and submissions)
	const { error: deleteError } = await supabase
		.from('python_exercises')
		.delete()
		.eq('id', exerciseId);

	if (deleteError) {
		console.error('Failed to delete exercise:', deleteError);
		throw error(500, "Erreur lors de la suppression de l'exercice");
	}

	return json({ success: true });
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
		.eq('student_id', studentId);

	if (!classes || classes.length === 0) {
		return '';
	}

	return classes.map((c: { class_id: string }) => c.class_id).join(',');
}
