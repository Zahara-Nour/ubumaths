/**
 * API Route: /api/teacher/chapters/[id]/exercises/[linkId]
 * DELETE - Unlink an exercise from a chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { unlinkExercise } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Verify the teacher owns the chapter and exercise link exists
 */
async function verifyExerciseLinkOwnership(
	chapterId: string,
	linkId: string,
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

	// Verify link exists and belongs to chapter
	const { data: link, error: linkError } = await supabase
		.from('chapter_exercises')
		.select('id, chapter_id')
		.eq('id', linkId)
		.single();

	if (linkError || !link) {
		throw error(404, 'Exercise link not found');
	}

	if (link.chapter_id !== chapterId) {
		throw error(400, 'Exercise link does not belong to this chapter');
	}

	return { chapter, link };
}

/**
 * DELETE /api/teacher/chapters/[id]/exercises/[linkId]
 * Unlink an exercise from a chapter
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate IDs
	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const linkIdValidation = uuidSchema.safeParse(params.linkId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!linkIdValidation.success) {
		throw error(400, 'Invalid exercise link ID');
	}

	const chapterId = chapterIdValidation.data;
	const linkId = linkIdValidation.data;

	// Verify ownership
	await verifyExerciseLinkOwnership(chapterId, linkId, user.id, locals.supabase);

	// Unlink exercise
	const result = await unlinkExercise(linkId, locals.supabase);

	if (result.error) {
		console.error('[DELETE /api/teacher/chapters/[id]/exercises/[linkId]] Error:', result.error);
		throw error(500, 'Failed to unlink exercise');
	}

	return json({ success: true });
};
