/**
 * API Route: /api/teacher/chapters/[id]/quiz/[questionId]
 * DELETE - Remove a question from the chapter quiz
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { removeQuizQuestion } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Verify the chapter exists and quiz question belongs to it
 */
async function verifyQuizQuestionOwnership(
	chapterId: string,
	questionId: string,
	supabase: App.Locals['supabase']
) {
	// Verify chapter exists
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	// Verify question exists and belongs to chapter
	const { data: question, error: questionError } = await supabase
		.from('chapter_quiz_questions')
		.select('id, chapter_id')
		.eq('id', questionId)
		.single();

	if (questionError || !question) {
		throw error(404, 'Quiz question not found');
	}

	if (question.chapter_id !== chapterId) {
		throw error(400, 'Question does not belong to this chapter');
	}

	return { chapter, question };
}

/**
 * DELETE /api/teacher/chapters/[id]/quiz/[questionId]
 * Remove a question from the chapter quiz
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	// Validate IDs
	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const questionIdValidation = uuidSchema.safeParse(params.questionId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!questionIdValidation.success) {
		throw error(400, 'Invalid question ID');
	}

	const chapterId = chapterIdValidation.data;
	const questionId = questionIdValidation.data;

	// Verify ownership
	await verifyQuizQuestionOwnership(chapterId, questionId, locals.supabase);

	// Remove question
	const result = await removeQuizQuestion(questionId, locals.supabase);

	if (result.error) {
		console.error('[DELETE /api/teacher/chapters/[id]/quiz/[questionId]] Error:', result.error);
		throw error(500, 'Failed to remove quiz question');
	}

	return json({ success: true });
};
