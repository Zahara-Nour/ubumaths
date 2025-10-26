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

type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];

/**
 * GET /api/exercises/[id]
 * Get exercise by ID
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can access exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

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
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can update exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	const { id } = params;

	// Parse update data
	const data: Omit<ExerciseUpdate, 'id' | 'created_by' | 'created_at'> = await request.json();

	// Validate difficulty if provided
	if (data.difficulty !== undefined && ![1, 2, 3].includes(data.difficulty)) {
		throw error(400, 'Invalid difficulty: must be 1 (easy), 2 (medium), or 3 (hard)');
	}

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
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can delete exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

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
