/**
 * API Route: /api/teacher/chapters/[id]/exercises
 * GET - List linked exercises for a chapter
 * POST - Link an exercise to a chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { linkExercise } from '$lib/server/chapters';
import { linkExerciseSchema } from '$lib/server/validation/chapters';
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
 * GET /api/teacher/chapters/[id]/exercises
 * List all linked exercises for a chapter
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

	// Fetch chapter exercises with exercise details
	const { data: exerciseLinks, error: linksError } = await locals.supabase
		.from('chapter_exercises')
		.select(
			`
			*,
			exercise:exercises(id, title, topic, difficulty, grades)
		`
		)
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (linksError) {
		console.error('[GET /api/teacher/chapters/[id]/exercises] Error:', linksError);
		throw error(500, 'Failed to fetch exercises');
	}

	return json({
		exercises: exerciseLinks || [],
		count: exerciseLinks?.length || 0
	});
};

/**
 * POST /api/teacher/chapters/[id]/exercises
 * Link an exercise to a chapter
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

	const validation = linkExerciseSchema.safeParse(dataWithChapter);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Verify exercise exists
	const { data: exercise, error: exerciseError } = await locals.supabase
		.from('exercises')
		.select('id')
		.eq('id', validation.data.exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercise not found');
	}

	// Check if already linked
	const { data: existingLink } = await locals.supabase
		.from('chapter_exercises')
		.select('id')
		.eq('chapter_id', chapterId)
		.eq('exercise_id', validation.data.exerciseId)
		.maybeSingle();

	if (existingLink) {
		throw error(400, 'Exercise already linked to this chapter');
	}

	// Link exercise
	const result = await linkExercise(
		chapterId,
		validation.data.exerciseId,
		locals.supabase,
		validation.data.displayOrder
	);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/exercises] Error:', result.error);
		throw error(500, 'Failed to link exercise');
	}

	return json({ exercise: result.data }, { status: 201 });
};
