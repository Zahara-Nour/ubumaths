/**
 * Student Chapter Detail Page Server
 * ===================================
 *
 * Loads a specific chapter with all its content:
 * - Documents
 * - Quiz questions with student's results
 * - Checklist items with progress
 * - Linked exercises
 *
 * Uses getChapterWithContent for rich data including progress tracking.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { getChapterWithContent, toggleChecklistItem, submitQuizAnswer } from '$lib/server/chapters';
import { toggleChecklistSchema, submitQuizAnswerSchema } from '$lib/server/validation/chapters';

export const load: PageServerLoad = async ({ locals, params }) => {
	// Only students can view this page
	const { user } = await requireRole(locals, 'student');

	const { chapterId } = params;

	// Get chapter with full content and progress
	const { data: chapter, error: chapterError } = await getChapterWithContent(
		chapterId,
		user.id,
		locals.supabase
	);

	if (chapterError) {
		console.error('[Student Chapter Detail] Error:', chapterError);
		if (chapterError.message.includes('not found') || chapterError.message.includes('PGRST116')) {
			throw error(404, 'Chapitre non trouvé');
		}
		throw error(500, 'Erreur lors du chargement du chapitre');
	}

	if (!chapter) {
		throw error(404, 'Chapitre non trouvé ou non accessible');
	}

	// Get class info for breadcrumb
	const { data: classInfo } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', chapter.classId)
		.single();

	// Get question templates for quiz display
	const questionTemplates: Record<
		string,
		{ id: string; question: string; answer: boolean; explanation: string | null }
	> = {};

	if (chapter.quizQuestions.length > 0) {
		const templateIds = chapter.quizQuestions.map((q) => q.questionTemplateId);
		const { data: templates } = await locals.supabase
			.from('question_templates')
			.select('id, question, answer, explanation')
			.in('id', templateIds);

		if (templates) {
			for (const t of templates) {
				// Only include true/false questions (answer is boolean-like)
				if (typeof t.answer === 'boolean' || t.answer === 'true' || t.answer === 'false') {
					questionTemplates[t.id] = {
						id: t.id,
						question: t.question,
						answer: t.answer === true || t.answer === 'true',
						explanation: t.explanation
					};
				}
			}
		}
	}

	// Get exercise details for linked exercises
	const exerciseDetails: Record<string, { id: string; title: string; description: string | null }> =
		{};

	if (chapter.exercises.length > 0) {
		const exerciseIds = chapter.exercises.map((e) => e.exerciseId);
		const { data: exercises } = await locals.supabase
			.from('exercises')
			.select('id, title, description')
			.in('id', exerciseIds);

		if (exercises) {
			for (const e of exercises) {
				exerciseDetails[e.id] = {
					id: e.id,
					title: e.title,
					description: e.description
				};
			}
		}
	}

	return {
		chapter,
		className: classInfo?.name || 'Classe',
		questionTemplates,
		exerciseDetails
	};
};

export const actions: Actions = {
	/**
	 * Toggle checklist item completion
	 */
	toggleChecklist: async ({ request, locals, params: _params }) => {
		const { user } = await requireRole(locals, 'student');

		const formData = await request.formData();
		const checklistItemId = formData.get('checklistItemId');
		const isCompleted = formData.get('isCompleted') === 'true';

		// Validate input
		const validation = toggleChecklistSchema.safeParse({
			checklistItemId,
			isCompleted
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'toggleChecklist'
			});
		}

		// Toggle the item
		const { error: toggleError } = await toggleChecklistItem(
			user.id,
			validation.data.checklistItemId,
			validation.data.isCompleted,
			locals.supabase
		);

		if (toggleError) {
			console.error('[Toggle Checklist] Error:', toggleError);
			return fail(500, {
				error: 'Erreur lors de la mise à jour',
				action: 'toggleChecklist'
			});
		}

		return { success: true, action: 'toggleChecklist' };
	},

	/**
	 * Submit quiz answer
	 */
	submitQuiz: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'student');

		const formData = await request.formData();
		const chapterQuizQuestionId = formData.get('quizQuestionId') as string;
		const answer = formData.get('answer');
		const timeSpentSecondsRaw = formData.get('timeSpentSeconds');
		const submittedAnswer = answer === 'true' ? 'true' : 'false';
		const timeSpentSeconds = timeSpentSecondsRaw ? parseInt(timeSpentSecondsRaw as string, 10) : 0;

		// Get the correct answer to check
		const { data: quizQuestion } = await locals.supabase
			.from('chapter_quiz_questions')
			.select('question_template_id')
			.eq('id', chapterQuizQuestionId)
			.single();

		if (!quizQuestion) {
			return fail(404, {
				error: 'Question non trouvée',
				action: 'submitQuiz'
			});
		}

		// Get the template to check the answer
		const { data: template } = await locals.supabase
			.from('question_templates')
			.select('answer')
			.eq('id', quizQuestion.question_template_id)
			.single();

		if (!template) {
			return fail(404, {
				error: 'Template de question non trouvé',
				action: 'submitQuiz'
			});
		}

		// Determine if answer is correct
		const correctAnswer = template.answer === true || template.answer === 'true';
		const isCorrect = (submittedAnswer === 'true') === correctAnswer;

		// Validate input (after computing isCorrect)
		const validation = submitQuizAnswerSchema.safeParse({
			chapterQuizQuestionId,
			submittedAnswer,
			isCorrect,
			timeSpentSeconds
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'submitQuiz'
			});
		}

		// Submit the answer (this also handles SRS integration)
		const { data: result, error: submitError } = await submitQuizAnswer(
			user.id,
			validation.data.chapterQuizQuestionId,
			validation.data.isCorrect,
			validation.data.timeSpentSeconds ?? 0,
			locals.supabase,
			validation.data.submittedAnswer
		);

		if (submitError) {
			console.error('[Submit Quiz] Error:', submitError);
			return fail(500, {
				error: 'Erreur lors de la soumission de la réponse',
				action: 'submitQuiz'
			});
		}

		return {
			success: true,
			action: 'submitQuiz',
			isCorrect,
			resultId: result?.id
		};
	}
};
