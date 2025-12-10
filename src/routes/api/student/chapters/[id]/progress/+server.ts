/**
 * GET /api/student/chapters/[id]/progress
 * =========================================
 *
 * Returns the authenticated student's progress for a specific chapter.
 *
 * AUTH: Any authenticated user (RLS handles access control)
 *
 * PARAMS:
 * - id: Chapter UUID
 *
 * RESPONSE:
 * {
 *   progress: {
 *     chapterId: string,
 *     studentId: string,
 *     totalChecklistItems: number,
 *     completedChecklistItems: number,
 *     checklistProgress: number (0-100),
 *     totalQuizQuestions: number,
 *     correctQuizQuestions: number,
 *     quizScore: number (0-100),
 *     totalPointsEarned: number,
 *     maxPossiblePoints: number,
 *     lastActivityAt: string | null
 *   },
 *   checklistItems: ChecklistItemWithProgress[]
 * }
 *
 * NOTES:
 * - checklistProgress and quizScore are percentages (0-100)
 * - lastActivityAt is the most recent checklist completion or quiz submission
 * - Returns 404 if chapter doesn't exist or student doesn't have access
 *
 * SECURITY:
 * - Authenticated users only
 * - RLS ensures chapter is visible to the student
 * - Only returns the authenticated student's own progress
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { getMyChecklistProgress, getChapterWithContent } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Path parameters schema
 */
const paramsSchema = z.object({
	id: uuidSchema
});

export const GET: RequestHandler = async ({ locals, params }) => {
	// Authenticate user
	const { user } = await requireAuth(locals);

	// Validate chapter ID parameter
	const paramsValidation = paramsSchema.safeParse(params);
	if (!paramsValidation.success) {
		throw error(400, paramsValidation.error.issues[0].message);
	}

	const { id: chapterId } = paramsValidation.data;

	try {
		// Fetch full chapter with progress (reuses existing function)
		// This gives us comprehensive progress data including quiz results
		const chapterResult = await getChapterWithContent(chapterId, user.id, locals.supabase);

		if (chapterResult.error) {
			if (
				chapterResult.error.message.includes('not found') ||
				chapterResult.error.message.includes('PGRST116')
			) {
				throw error(404, 'Chapter not found');
			}
			console.error('[API] Error fetching chapter progress:', chapterResult.error);
			throw error(500, 'Failed to fetch chapter progress');
		}

		if (!chapterResult.data) {
			throw error(404, 'Chapter not found');
		}

		// Also fetch detailed checklist progress
		const checklistResult = await getMyChecklistProgress(user.id, chapterId, locals.supabase);

		if (checklistResult.error) {
			console.error('[API] Error fetching checklist progress:', checklistResult.error);
			// Don't fail entirely, just return empty checklist
		}

		return json({
			progress: chapterResult.data.progress,
			checklistItems: checklistResult.data || []
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/chapters/[id]/progress:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
