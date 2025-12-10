/**
 * GET /api/student/chapters/[id]
 * ===============================
 *
 * Returns a chapter with full content and the student's progress.
 *
 * AUTH: Any authenticated user (RLS handles visibility)
 *
 * PARAMS:
 * - id: Chapter UUID
 *
 * RESPONSE:
 * {
 *   chapter: StudentChapterView
 * }
 *
 * StudentChapterView includes:
 * - Chapter metadata (title, description, color, icon)
 * - Documents list
 * - Quiz questions
 * - Checklist items with completion status
 * - Exercises
 * - Student's progress (checklist completion %, quiz score)
 *
 * SECURITY:
 * - RLS policies ensure students only see visible chapters from their enrolled classes
 * - Student progress is filtered to only show their own data
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { getChapterWithContent } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Path parameters schema
 */
const paramsSchema = z.object({
	id: uuidSchema
});

export const GET: RequestHandler = async ({ locals, params }) => {
	// Authenticate user (any role - RLS handles visibility)
	const { user } = await requireAuth(locals);

	// Validate chapter ID parameter
	const validation = paramsSchema.safeParse(params);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { id: chapterId } = validation.data;

	try {
		// Fetch chapter with full content and student progress
		const result = await getChapterWithContent(chapterId, user.id, locals.supabase);

		if (result.error) {
			// Check for common errors
			if (result.error.message.includes('not found') || result.error.message.includes('PGRST116')) {
				throw error(404, 'Chapter not found');
			}
			console.error('[API] Error fetching chapter content:', result.error);
			throw error(500, 'Failed to fetch chapter');
		}

		if (!result.data) {
			throw error(404, 'Chapter not found');
		}

		return json({
			chapter: result.data
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/chapters/[id]:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
