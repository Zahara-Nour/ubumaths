/**
 * API Route: /api/teacher/chapters/[id]/documents
 * GET - List documents for a chapter
 * POST - Add a document to a chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { addChapterDocument } from '$lib/server/chapters';
import { createDocumentSchema } from '$lib/server/validation/chapters';
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
 * GET /api/teacher/chapters/[id]/documents
 * List all documents for a chapter
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

	// Fetch documents
	const { data: documents, error: docsError } = await locals.supabase
		.from('chapter_documents')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (docsError) {
		console.error('[GET /api/teacher/chapters/[id]/documents] Error:', docsError);
		throw error(500, 'Failed to fetch documents');
	}

	return json({
		documents: documents || [],
		count: documents?.length || 0
	});
};

/**
 * POST /api/teacher/chapters/[id]/documents
 * Add a document to a chapter
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

	// Add chapterId to body for validation (it comes from URL)
	const dataWithChapter = { ...(body as object), chapterId };

	const validation = createDocumentSchema.safeParse(dataWithChapter);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Add document
	const result = await addChapterDocument(chapterId, validation.data, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/documents] Error:', result.error);
		throw error(500, 'Failed to add document');
	}

	return json({ document: result.data }, { status: 201 });
};
