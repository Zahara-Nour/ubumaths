/**
 * GET /api/student/chapters
 * ==========================
 *
 * Returns visible chapters for the authenticated student.
 *
 * AUTH: Any authenticated user (RLS handles visibility)
 *
 * QUERY PARAMS:
 * - classId (optional): Filter chapters by class ID
 *
 * RESPONSE:
 * {
 *   chapters: ClassChapter[],
 *   count: number
 * }
 *
 * SECURITY:
 * - RLS policies ensure students only see visible chapters from their enrolled classes
 * - is_visible = true filter applied
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { getStudentChapters } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Query parameters schema
 */
const querySchema = z.object({
	classId: uuidSchema.optional()
});

export const GET: RequestHandler = async ({ locals, url }) => {
	// Authenticate user (any role - RLS handles visibility)
	const { user } = await requireAuth(locals);

	// Parse and validate query parameters
	const classIdParam = url.searchParams.get('classId');
	const queryData: Record<string, string> = {};
	if (classIdParam) {
		queryData.classId = classIdParam;
	}

	const validation = querySchema.safeParse(queryData);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classId } = validation.data;

	try {
		// Fetch visible chapters for student
		const result = await getStudentChapters(user.id, locals.supabase, classId);

		if (result.error) {
			console.error('[API] Error fetching student chapters:', result.error);
			throw error(500, 'Failed to fetch chapters');
		}

		return json({
			chapters: result.data,
			count: result.count
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/chapters:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
