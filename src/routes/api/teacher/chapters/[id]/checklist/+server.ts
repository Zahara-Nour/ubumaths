/**
 * API Route: /api/teacher/chapters/[id]/checklist
 * GET - List checklist items for a chapter
 * POST - Add a checklist item to a chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { addChecklistItem } from '$lib/server/chapters';
import { createChecklistItemSchema } from '$lib/server/validation/chapters';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify the teacher owns the chapter
 */
async function verifyChapterOwnership(
	chapterId: string,
	teacherId: string,
	supabase: App.Locals['supabase']
) {
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

	return chapter;
}

/**
 * GET /api/teacher/chapters/[id]/checklist
 * List all checklist items for a chapter
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate chapter ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	// Verify ownership
	await verifyChapterOwnership(chapterId, user.id, locals.supabase);

	// Fetch checklist items
	const { data: items, error: itemsError } = await locals.supabase
		.from('chapter_checklist_items')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (itemsError) {
		console.error('[GET /api/teacher/chapters/[id]/checklist] Error:', itemsError);
		throw error(500, 'Failed to fetch checklist items');
	}

	return json({
		items: items || [],
		count: items?.length || 0
	});
};

/**
 * POST /api/teacher/chapters/[id]/checklist
 * Add a checklist item to a chapter
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate chapter ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	// Verify ownership
	await verifyChapterOwnership(chapterId, user.id, locals.supabase);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Add chapterId to body for validation
	const dataWithChapter = { ...(body as object), chapterId };

	const validation = createChecklistItemSchema.safeParse(dataWithChapter);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Add checklist item
	const result = await addChecklistItem(chapterId, validation.data, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/checklist] Error:', result.error);
		throw error(500, 'Failed to add checklist item');
	}

	return json({ item: result.data }, { status: 201 });
};
