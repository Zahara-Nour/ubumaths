/**
 * API Route: /api/teacher/chapters/[id]/quiz
 * GET - List quiz questions for a chapter
 * POST - Add a question to the chapter quiz
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { addQuizQuestion } from '$lib/server/chapters';
import { addQuizQuestionSchema } from '$lib/server/validation/chapters';
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
 * GET /api/teacher/chapters/[id]/quiz
 * List all quiz questions for a chapter
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

	// Fetch quiz questions with template info
	const { data: questions, error: questionsError } = await locals.supabase
		.from('chapter_quiz_questions')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (questionsError) {
		console.error('[GET /api/teacher/chapters/[id]/quiz] Error:', questionsError);
		throw error(500, 'Failed to fetch quiz questions');
	}

	return json({
		questions: questions || [],
		count: questions?.length || 0
	});
};

/**
 * POST /api/teacher/chapters/[id]/quiz
 * Add a question to the chapter quiz
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

	const validation = addQuizQuestionSchema.safeParse(dataWithChapter);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Add quiz question
	const result = await addQuizQuestion(
		chapterId,
		validation.data.questionTemplateId,
		locals.supabase,
		validation.data.displayOrder
	);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/quiz] Error:', result.error);
		throw error(500, 'Failed to add quiz question');
	}

	return json({ question: result.data }, { status: 201 });
};
