/**
 * API Route: /api/teacher/chapters/[id]/migrate
 * POST - Migrate a chapter to a new template version
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { migrateChapterToVersion } from '$lib/server/chapter-templates';
import { migrateChapterSchema } from '$lib/server/validation/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * POST /api/teacher/chapters/[id]/migrate
 * Migrate a chapter to a specific template version
 *
 * Body:
 * - targetVersion: Version number to migrate to (required)
 *
 * Notes:
 * - Clears all existing chapter content (documents, quiz, checklist, exercises)
 * - Applies content from the target template version
 * - Updates instantiation record with new version and migration timestamp
 * - Only works for chapters linked to templates
 * - Only the chapter owner can migrate
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate chapter ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID format');
	}

	const chapterId = idValidation.data;

	// Verify chapter ownership
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('teacher_id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	if (chapter.teacher_id !== user.id) {
		throw error(403, 'Forbidden - not the chapter owner');
	}

	// Check if chapter is linked to a template
	const { data: instantiation } = await locals.supabase
		.from('chapter_template_instantiations')
		.select('id, is_detached')
		.eq('chapter_id', chapterId)
		.maybeSingle();

	if (!instantiation) {
		throw error(400, 'Chapter is not linked to a template');
	}

	if (instantiation.is_detached) {
		throw error(
			400,
			'Cannot migrate detached chapter. Attach it first or create a new chapter from the template.'
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = migrateChapterSchema.safeParse({
		chapterId,
		...((body as Record<string, unknown>) ?? {})
	});

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const { targetVersion } = validation.data;

	// Migrate chapter
	const result = await migrateChapterToVersion(chapterId, targetVersion, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/migrate] Error:', result.error);
		throw error(500, 'Failed to migrate chapter');
	}

	return json({ success: true }, { status: 200 });
};
