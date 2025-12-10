/**
 * PATCH /api/student/checklist/[itemId]
 * ======================================
 *
 * Toggle a checklist item's completion status for the authenticated student.
 *
 * AUTH: Any authenticated user (RLS handles access control)
 *
 * PARAMS:
 * - itemId: Checklist item UUID
 *
 * BODY:
 * {
 *   isCompleted: boolean
 * }
 *
 * RESPONSE:
 * {
 *   progress: StudentChecklistProgress
 * }
 *
 * BEHAVIOR:
 * - If no progress record exists, creates one
 * - If progress record exists, updates it
 * - completed_at timestamp is managed by database trigger
 *
 * SECURITY:
 * - Authenticated users only
 * - RLS ensures checklist item belongs to a visible chapter in student's class
 * - Students can only modify their own progress
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { toggleChecklistItem } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Path parameters schema
 */
const paramsSchema = z.object({
	itemId: uuidSchema
});

/**
 * Request body schema
 */
const bodySchema = z.object({
	isCompleted: z.boolean()
});

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	// Authenticate user
	const { user } = await requireAuth(locals);

	// Validate checklist item ID parameter
	const paramsValidation = paramsSchema.safeParse(params);
	if (!paramsValidation.success) {
		throw error(400, paramsValidation.error.issues[0].message);
	}

	const { itemId } = paramsValidation.data;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const bodyValidation = bodySchema.safeParse(body);
	if (!bodyValidation.success) {
		throw error(400, bodyValidation.error.issues[0].message);
	}

	const { isCompleted } = bodyValidation.data;

	try {
		// Toggle the checklist item
		const result = await toggleChecklistItem(user.id, itemId, isCompleted, locals.supabase);

		if (result.error) {
			// Check for common errors
			if (result.error.message.includes('not found') || result.error.message.includes('PGRST116')) {
				throw error(404, 'Checklist item not found');
			}
			// Check for foreign key constraint violation (item doesn't exist)
			if (result.error.message.includes('foreign key')) {
				throw error(404, 'Checklist item not found');
			}
			console.error('[API] Error toggling checklist item:', result.error);
			throw error(500, 'Failed to update checklist item');
		}

		if (!result.data) {
			throw error(500, 'Failed to update checklist progress');
		}

		return json({
			progress: result.data
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in PATCH /api/student/checklist/[itemId]:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
