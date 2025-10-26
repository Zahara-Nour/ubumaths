/**
 * API Route: /api/exercises/assignments/[assignmentId]
 *
 * PATCH - Update an assignment (teacher only)
 * DELETE - Remove/deactivate an assignment (teacher only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateAssignment, deleteAssignment } from '$lib/server/exercise-assignments';
import type { ExerciseAssignment } from '$lib/exercises/types';

/**
 * PATCH /api/exercises/assignments/[assignmentId]
 *
 * Update an existing assignment.
 * Can update: optional_deadline, notes, is_active.
 * Teacher only - must own the assignment.
 *
 * @body Partial<{ optional_deadline, notes, is_active }>
 * @returns Updated assignment
 */
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;

	// Check if user is a teacher
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		return json({ error: 'Forbidden - Teachers only' }, { status: 403 });
	}

	const assignmentId = params.assignmentId;
	const updates: Partial<Pick<ExerciseAssignment, 'optional_deadline' | 'notes' | 'is_active'>> =
		await request.json();

	// Validate that at least one field is being updated
	if (
		updates.optional_deadline === undefined &&
		updates.notes === undefined &&
		updates.is_active === undefined
	) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	// Update assignment
	const { data: updated, error: updateError } = await updateAssignment(
		locals.supabase,
		assignmentId,
		updates,
		user.id
	);

	if (updateError) {
		console.error('Failed to update assignment:', updateError);

		// Check if it's an authorization error
		if (updateError.includes('not authorized') || updateError.includes('not found')) {
			return json({ error: updateError }, { status: 403 });
		}

		return json({ error: updateError }, { status: 400 });
	}

	return json(updated);
};

/**
 * DELETE /api/exercises/assignments/[assignmentId]
 *
 * Remove an assignment.
 * Soft delete (deactivate) by default, hard delete if ?hard=true.
 * Teacher only - must own the assignment.
 *
 * @query hard - If 'true', permanently delete; otherwise deactivate
 * @returns Success status
 */
export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;

	// Check if user is a teacher
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		return json({ error: 'Forbidden - Teachers only' }, { status: 403 });
	}

	const assignmentId = params.assignmentId;
	const hardDelete = url.searchParams.get('hard') === 'true';

	// Delete assignment
	const { success, error: deleteError } = await deleteAssignment(
		locals.supabase,
		assignmentId,
		user.id,
		hardDelete
	);

	if (deleteError) {
		console.error('Failed to delete assignment:', deleteError);

		// Check if it's an authorization error
		if (deleteError.includes('not authorized') || deleteError.includes('not found')) {
			return json({ error: deleteError }, { status: 403 });
		}

		return json({ error: deleteError }, { status: 400 });
	}

	return json(
		{
			success,
			message: hardDelete ? 'Assignment deleted permanently' : 'Assignment deactivated'
		},
		{ status: 200 }
	);
};
