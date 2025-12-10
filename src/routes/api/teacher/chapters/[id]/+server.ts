/**
 * API Route: /api/teacher/chapters/[id]
 * GET - Get a single chapter with content
 * PUT - Update chapter
 * DELETE - Delete chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { updateChapter, deleteChapter } from '$lib/server/chapters';
import { updateChapterSchema } from '$lib/server/validation/chapters';
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
		.select('id, teacher_id, class_id')
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
 * GET /api/teacher/chapters/[id]
 * Get a single chapter with all its content
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	// Verify ownership
	await verifyChapterOwnership(chapterId, user.id, locals.supabase);

	// Fetch chapter with all related content
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select(
			`
			*,
			documents:chapter_documents(*),
			quizQuestions:chapter_quiz_questions(*),
			checklistItems:chapter_checklist_items(*),
			exercises:chapter_exercises(*)
		`
		)
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	return json({ chapter });
};

/**
 * PUT /api/teacher/chapters/[id]
 * Update a chapter
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID
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

	const validation = updateChapterSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Update chapter
	const result = await updateChapter(chapterId, validation.data, locals.supabase);

	if (result.error) {
		console.error('[PUT /api/teacher/chapters/[id]] Error:', result.error);
		throw error(500, 'Failed to update chapter');
	}

	return json({ chapter: result.data });
};

/**
 * DELETE /api/teacher/chapters/[id]
 * Delete a chapter
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	// Verify ownership
	await verifyChapterOwnership(chapterId, user.id, locals.supabase);

	// Delete chapter
	const result = await deleteChapter(chapterId, locals.supabase);

	if (result.error) {
		console.error('[DELETE /api/teacher/chapters/[id]] Error:', result.error);
		throw error(500, 'Failed to delete chapter');
	}

	return json({ success: true });
};
