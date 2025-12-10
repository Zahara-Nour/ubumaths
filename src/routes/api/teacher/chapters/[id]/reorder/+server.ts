/**
 * API Route: /api/teacher/chapters/[id]/reorder
 * POST - Reorder chapters in a class
 *
 * Note: The [id] here refers to the class ID, not a chapter ID
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { reorderChapters } from '$lib/server/chapters';
import { reorderChaptersSchema } from '$lib/server/validation/chapters';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * POST /api/teacher/chapters/[id]/reorder
 * Reorder chapters in a class
 * [id] = class ID
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate class ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid class ID');
	}

	const classId = idValidation.data;

	// Verify the teacher owns the class
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('teacher_id')
		.eq('id', classId)
		.single();

	if (classError || !classData) {
		throw error(404, 'Class not found');
	}

	if (classData.teacher_id !== user.id) {
		throw error(403, 'Forbidden - Not your class');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = reorderChaptersSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Transform to OrderUpdate format
	const orderUpdates = validation.data.chapters.map((c) => ({
		id: c.id,
		displayOrder: c.displayOrder
	}));

	// Reorder chapters
	const result = await reorderChapters(classId, orderUpdates, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/reorder] Error:', result.error);
		throw error(500, 'Failed to reorder chapters');
	}

	return json({ success: true });
};
