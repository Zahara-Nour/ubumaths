/**
 * API Route: /api/teacher/chapters/[id]/create-template
 * POST - Create a template from an existing chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { createTemplateFromChapter } from '$lib/server/chapter-templates';
import { createTemplateFromChapterSchema } from '$lib/server/validation/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * POST /api/teacher/chapters/[id]/create-template
 * Create a new template from an existing chapter
 *
 * Body:
 * - title: Template title (required)
 * - description: Template description (optional)
 * - grades: Target grade levels (optional)
 *
 * Notes:
 * - Extracts all content (documents, quiz, checklist, exercises) from the chapter
 * - Creates a draft template with the extracted content
 * - Only the chapter owner can create a template from it
 * - Does not create instantiation link (template is independent)
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

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = createTemplateFromChapterSchema.safeParse({
		chapterId,
		...((body as Record<string, unknown>) ?? {})
	});

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Create template from chapter
	const result = await createTemplateFromChapter(data, user.id, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/create-template] Error:', result.error);
		throw error(500, 'Failed to create template from chapter');
	}

	return json({ template: result.data }, { status: 201 });
};
