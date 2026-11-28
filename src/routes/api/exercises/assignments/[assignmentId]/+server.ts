/**
 * API Route: /api/exercises/assignments/[assignmentId]
 *
 * PATCH - Update an assignment (teacher only)
 * DELETE - Remove/deactivate an assignment (teacher only)
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateAssignment, deleteAssignment } from '#lib/server/exercise-assignments.ts';
import type { ExerciseAssignment } from '#lib/exercises/types.ts';
import { validateUpdateAssignment } from '#lib/server/validation/index.ts';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/exercises/assignments/[assignmentId]/+server');

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
	const { user } = await requireRole(locals, 'teacher');

	const assignmentId = validateUuidParam(params.assignmentId, 'assignmentId');

	// Corps illisible : 400, jamais un plantage (le schéma refuse ensuite ce qui n'est pas un objet).
	const body: unknown = await request.json().catch(() => undefined);
	if (body === undefined) {
		throw error(400, 'Données invalides');
	}

	// Validate update body
	const validation = validateUpdateAssignment(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		return Response.json({ error: `Données invalides : ${errorMsg}` }, { status: 400 });
	}

	const updates: Partial<Pick<ExerciseAssignment, 'optional_deadline' | 'notes' | 'is_active'>> =
		validation.data;

	// Update assignment
	const { data: updated, error: updateError } = await updateAssignment(
		locals.supabase,
		assignmentId,
		updates,
		user.id
	);

	if (updateError) {
		logger.error('Failed to update assignment:', updateError);

		// Check if it's an authorization error
		if (updateError.includes('not authorized') || updateError.includes('not found')) {
			return Response.json({ error: updateError }, { status: 403 });
		}

		return Response.json({ error: updateError }, { status: 400 });
	}

	return Response.json(updated);
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
	const { user } = await requireRole(locals, 'teacher');

	const assignmentId = validateUuidParam(params.assignmentId, 'assignmentId');
	const hardDelete = url.searchParams.get('hard') === 'true';

	// Delete assignment
	const { success, error: deleteError } = await deleteAssignment(
		locals.supabase,
		assignmentId,
		user.id,
		hardDelete
	);

	if (deleteError) {
		logger.error('Failed to delete assignment:', deleteError);

		// Check if it's an authorization error
		if (deleteError.includes('not authorized') || deleteError.includes('not found')) {
			return Response.json({ error: deleteError }, { status: 403 });
		}

		return Response.json({ error: deleteError }, { status: 400 });
	}

	return Response.json(
		{
			success,
			message: hardDelete ? 'Affectation supprimée définitivement' : 'Affectation désactivée'
		},
		{ status: 200 }
	);
};
