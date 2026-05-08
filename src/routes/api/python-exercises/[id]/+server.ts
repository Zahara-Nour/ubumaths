/**
 * API Route: /api/python-exercises/[id]
 * GET - Get exercise by ID
 * PUT - Update exercise
 * DELETE - Delete exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	updateExerciseSchema,
	type UpdateExerciseInput
} from '$lib/server/validation/python-exercises';
import type { PythonExercise, PythonExerciseStudentView } from '$lib/types/python-exercises';
import { validateUuidParam } from '$lib/server/validation/params';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/python-exercises/[id]
 * Get exercise by ID.
 *
 * Visibility is enforced by RLS:
 *   - anon                     → public exercises only (migration 20260508125858)
 *   - student authenticated    → own + public + assigned-to-them
 *   - teacher authenticated    → own + public
 *
 * If the row is not visible to the caller, RLS filters it and Supabase returns
 * null → we respond 404 (rather than 403, to avoid leaking existence).
 *
 * The endpoint strips `solution_code` for any caller who is not the author.
 * RLS controls row visibility but cannot mask columns; that's our job.
 *
 * @param id - Exercise UUID
 * @returns Exercise data
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	const { data: exercise, error: fetchError } = await supabase
		.from('python_exercises')
		.select('*')
		.eq('id', exerciseId)
		.maybeSingle();

	if (fetchError) {
		console.error('Failed to fetch exercise:', fetchError);
		throw error(500, "Erreur lors de la récupération de l'exercice");
	}

	if (!exercise) {
		// Either does not exist OR not visible to caller via RLS — same response
		throw error(404, 'Exercice introuvable');
	}

	// Author sees full exercise (including solution_code); everyone else stripped.
	if (user && exercise.author_id === user.id) {
		return json({ exercise: exercise as PythonExercise });
	}

	const { solution_code: _solution_code, ...studentView } = exercise;
	return json({ exercise: studentView as PythonExerciseStudentView });
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
