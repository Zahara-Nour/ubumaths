/**
 * API Route: /api/teacher/chapters/[id]/detach
 * POST - Detach a chapter from its template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { detachChapterFromTemplate } from '$lib/server/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * POST /api/teacher/chapters/[id]/detach
 * Detach a chapter from its source template
 *
 * Notes:
 * - Marks the chapter as detached from its template
 * - Chapter will no longer receive template updates
 * - Chapter content remains unchanged
 * - Instantiation record is preserved for history
 * - Only works for chapters linked to templates
 * - Only the chapter owner can detach
 * - This action is reversible (can be re-attached manually in DB if needed)
 */
export const POST: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate chapter ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID format');
	}

	const chapterId = idValidation.data;

	// Verify chapter ownership
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('teacher_id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	if (chapter.teacher_id !== user.id) {
		throw error(403, 'Forbidden - not the chapter owner');
	}

	// Check if chapter is linked to a template
	const { data: instantiation } = await locals.supabase
		.from('chapter_template_instantiations')
		.select('id, is_detached')
		.eq('chapter_id', chapterId)
		.maybeSingle();

	if (!instantiation) {
		throw error(400, 'Chapter is not linked to a template');
	}

	if (instantiation.is_detached) {
		throw error(400, 'Chapter is already detached from template');
	}

	// Detach chapter
	const result = await detachChapterFromTemplate(chapterId, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/detach] Error:', result.error);
		throw error(500, 'Failed to detach chapter from template');
	}

	return json({ success: true }, { status: 200 });
};
