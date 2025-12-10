/**
 * API Route: /api/teacher/chapters/[id]/checklist/[itemId]
 * PUT - Update a checklist item
 * DELETE - Delete a checklist item
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { updateChecklistItem, deleteChecklistItem } from '$lib/server/chapters';
import { updateChecklistItemSchema } from '$lib/server/validation/chapters';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify the teacher owns the chapter and checklist item exists
 */
async function verifyChecklistItemOwnership(
	chapterId: string,
	itemId: string,
	teacherId: string,
	supabase: App.Locals['supabase']
) {
	// Verify chapter ownership
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('id, teacher_id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	if (chapter.teacher_id !== teacherId) {
		throw error(403, 'Forbidden - Not your chapter');
	}

	// Verify item exists and belongs to chapter
	const { data: item, error: itemError } = await supabase
		.from('chapter_checklist_items')
		.select('id, chapter_id')
		.eq('id', itemId)
		.single();

	if (itemError || !item) {
		throw error(404, 'Checklist item not found');
	}

	if (item.chapter_id !== chapterId) {
		throw error(400, 'Checklist item does not belong to this chapter');
	}

	return { chapter, item };
}

/**
 * PUT /api/teacher/chapters/[id]/checklist/[itemId]
 * Update a checklist item
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate IDs
	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const itemIdValidation = uuidSchema.safeParse(params.itemId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!itemIdValidation.success) {
		throw error(400, 'Invalid checklist item ID');
	}

	const chapterId = chapterIdValidation.data;
	const itemId = itemIdValidation.data;

	// Verify ownership
	await verifyChecklistItemOwnership(chapterId, itemId, user.id, locals.supabase);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = updateChecklistItemSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Update item
	const result = await updateChecklistItem(itemId, validation.data, locals.supabase);

	if (result.error) {
		console.error('[PUT /api/teacher/chapters/[id]/checklist/[itemId]] Error:', result.error);
		throw error(500, 'Failed to update checklist item');
	}

	return json({ item: result.data });
};

/**
 * DELETE /api/teacher/chapters/[id]/checklist/[itemId]
 * Delete a checklist item
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate IDs
	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const itemIdValidation = uuidSchema.safeParse(params.itemId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!itemIdValidation.success) {
		throw error(400, 'Invalid checklist item ID');
	}

	const chapterId = chapterIdValidation.data;
	const itemId = itemIdValidation.data;

	// Verify ownership
	await verifyChecklistItemOwnership(chapterId, itemId, user.id, locals.supabase);

	// Delete item
	const result = await deleteChecklistItem(itemId, locals.supabase);

	if (result.error) {
		console.error('[DELETE /api/teacher/chapters/[id]/checklist/[itemId]] Error:', result.error);
		throw error(500, 'Failed to delete checklist item');
	}

	return json({ success: true });
};
