/**
 * API Route: /api/teacher/chapters/[id]/progress
 * GET - Get student progress for a chapter (checklist + quiz results)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getStudentChecklistProgress, getChapterQuizResults } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';
import { z } from 'zod';

/** Query parameters schema */
const progressQuerySchema = z.object({
	studentId: uuidSchema.optional()
});

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
 * GET /api/teacher/chapters/[id]/progress
 * Get student progress for a chapter
 * Optionally filter by studentId query parameter
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate chapter ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	// Parse query parameters
	const queryValidation = progressQuerySchema.safeParse({
		studentId: url.searchParams.get('studentId') ?? undefined
	});

	if (!queryValidation.success) {
		throw error(400, 'Invalid query parameters');
	}

	const { studentId } = queryValidation.data;

	// Verify ownership
	const chapter = await verifyChapterOwnership(chapterId, user.id, locals.supabase);

	// Fetch checklist progress
	const checklistResult = await getStudentChecklistProgress(chapterId, locals.supabase, studentId);

	if (checklistResult.error) {
		console.error(
			'[GET /api/teacher/chapters/[id]/progress] Checklist error:',
			checklistResult.error
		);
		throw error(500, 'Failed to fetch checklist progress');
	}

	// Fetch quiz results
	const quizResult = await getChapterQuizResults(chapterId, locals.supabase, studentId);

	if (quizResult.error) {
		console.error('[GET /api/teacher/chapters/[id]/progress] Quiz error:', quizResult.error);
		throw error(500, 'Failed to fetch quiz results');
	}

	// Get list of students in the class for complete progress view
	const { data: students, error: studentsError } = await locals.supabase
		.from('class_members')
		.select(
			`
			student_id,
			profile:profiles!class_members_student_id_fkey(id, firstname, lastname)
		`
		)
		.eq('class_id', chapter.class_id);

	if (studentsError) {
		console.error('[GET /api/teacher/chapters/[id]/progress] Students error:', studentsError);
		throw error(500, 'Failed to fetch students');
	}

	// Build combined progress response
	type StudentProgress = {
		studentId: string;
		studentName: string;
		checklistProgress: {
			completed: number;
			total: number;
			percentage: number;
		};
		quizProgress: {
			correct: number;
			attempted: number;
			total: number;
			percentage: number;
		};
	};

	// Get total counts
	const { count: totalChecklistItems } = await locals.supabase
		.from('chapter_checklist_items')
		.select('*', { count: 'exact', head: true })
		.eq('chapter_id', chapterId);

	const { count: totalQuizQuestions } = await locals.supabase
		.from('chapter_quiz_questions')
		.select('*', { count: 'exact', head: true })
		.eq('chapter_id', chapterId);

	// Map checklist progress by student
	const checklistByStudent = new Map(checklistResult.data.map((p) => [p.studentId, p]));

	// Map quiz results by student
	const quizByStudent = new Map(quizResult.data.map((r) => [r.studentId, r]));

	// Build progress for each student
	const progress: StudentProgress[] = (students || []).map((s) => {
		// Profile comes as an array from the join, take the first element
		const profileData = s.profile as unknown as {
			id: string;
			firstname: string | null;
			lastname: string | null;
		} | null;
		const checklistData = checklistByStudent.get(s.student_id);
		const quizData = quizByStudent.get(s.student_id);

		const completedChecklist = checklistData?.items.filter((i) => i.isCompleted).length ?? 0;
		const correctQuiz = quizData?.totalCorrect ?? 0;
		const attemptedQuiz = quizData?.totalAttempted ?? 0;

		return {
			studentId: s.student_id,
			studentName: profileData
				? `${profileData.firstname ?? ''} ${profileData.lastname ?? ''}`.trim() || 'Unknown'
				: 'Unknown',
			checklistProgress: {
				completed: completedChecklist,
				total: totalChecklistItems ?? 0,
				percentage:
					totalChecklistItems && totalChecklistItems > 0
						? Math.round((completedChecklist / totalChecklistItems) * 100)
						: 0
			},
			quizProgress: {
				correct: correctQuiz,
				attempted: attemptedQuiz,
				total: totalQuizQuestions ?? 0,
				percentage:
					totalQuizQuestions && totalQuizQuestions > 0
						? Math.round((correctQuiz / totalQuizQuestions) * 100)
						: 0
			}
		};
	});

	// Filter by studentId if provided
	const filteredProgress = studentId ? progress.filter((p) => p.studentId === studentId) : progress;

	return json({
		chapterId,
		totalChecklistItems: totalChecklistItems ?? 0,
		totalQuizQuestions: totalQuizQuestions ?? 0,
		students: filteredProgress,
		count: filteredProgress.length
	});
};
