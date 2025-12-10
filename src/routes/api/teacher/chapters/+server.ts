/**
 * API Route: /api/teacher/chapters
 * GET - List chapters for teacher (optionally filtered by class)
 * POST - Create a new chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getTeacherChapters, createChapter } from '$lib/server/chapters';
import { createChapterSchema, type CreateChapterInput } from '$lib/server/validation/chapters';
import { uuidSchema } from '$lib/server/validation/common';
import { z } from 'zod';

/** Query parameters schema for GET */
const listChaptersQuerySchema = z.object({
	classId: uuidSchema.optional()
});

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/teacher/chapters
 * List all chapters for the authenticated teacher
 * Optionally filter by classId query parameter
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Parse query parameters
	const queryValidation = listChaptersQuerySchema.safeParse({
		classId: url.searchParams.get('classId') ?? undefined
	});

	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Invalid query parameters: ${errorMsg}`);
	}

	const { classId } = queryValidation.data;

	// Fetch chapters
	const result = await getTeacherChapters(user.id, locals.supabase, classId);

	if (result.error) {
		console.error('[GET /api/teacher/chapters] Error:', result.error);
		throw error(500, 'Failed to fetch chapters');
	}

	return json({
		chapters: result.data,
		count: result.count
	});
};

/**
 * POST /api/teacher/chapters
 * Create a new chapter
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	await requireRole(locals, 'teacher');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = createChapterSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data: CreateChapterInput = validation.data;

	// Verify the teacher owns the class
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('teacher_id')
		.eq('id', data.classId)
		.single();

	if (classError || !classData) {
		throw error(404, 'Class not found');
	}

	const { user } = await locals.safeGetSession();
	if (classData.teacher_id !== user?.id) {
		throw error(403, 'Forbidden - Not your class');
	}

	// Create chapter
	const result = await createChapter(data, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters] Error:', result.error);
		throw error(500, 'Failed to create chapter');
	}

	return json({ chapter: result.data }, { status: 201 });
};
