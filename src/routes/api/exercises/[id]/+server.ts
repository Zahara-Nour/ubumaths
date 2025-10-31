/**
 * API Route: /api/exercises/[id]
 * GET - Get exercise by ID
 * PUT - Update exercise
 * DELETE - Delete exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExercise, updateExercise, deleteExercise } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';
import { validateUpdateExercise } from '$lib/server/validation';
import { requireRole } from '$lib/server/middleware/auth';

type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];
type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/exercises/[id]
 * Get exercise by ID
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	const { id } = params;

	// Fetch exercise
	const result = await getExercise(locals.supabase, id);

	if (result.error || !result.data) {
		throw error(404, 'Exercise not found');
	}

	return json({ exercise: result.data });
};

/**
 * PUT /api/exercises/[id]
 * Update exercise
 * Only the creator can update
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	const { id } = params;

	// Parse and validate update data
	const body = await request.json();
	const validation = validateUpdateExercise(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data as Omit<ExerciseUpdate, 'id' | 'created_by' | 'created_at'>;

	// Update exercise
	const result = await updateExercise(locals.supabase, id, data, user.id);

	if (result.error) {
		if (result.error.message === 'Unauthorized') {
			throw error(403, 'Forbidden - Not your exercise');
		}
		if (result.error.message === 'Exercise not found') {
			throw error(404, 'Exercise not found');
		}
		console.error('Failed to update exercise:', result.error);
		throw error(500, 'Failed to update exercise');
	}

	return json({ exercise: result.data });
};

/**
 * DELETE /api/exercises/[id]
 * Delete exercise
 * Only the creator can delete
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	const { id } = params;

	// Delete exercise
	const result = await deleteExercise(locals.supabase, id, user.id);

	if (result.error) {
		if (result.error.message === 'Unauthorized') {
			throw error(403, 'Forbidden - Not your exercise');
		}
		if (result.error.message === 'Exercise not found') {
			throw error(404, 'Exercise not found');
		}
		console.error('Failed to delete exercise:', result.error);
		throw error(500, 'Failed to delete exercise');
	}

	return json({ success: true });
};
