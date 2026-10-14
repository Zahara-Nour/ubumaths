/**
 * API Route: /api/teacher/chapters/[id]/documents/[docId]
 * PUT - Update a document
 * DELETE - Delete a document
 *
 * Une ligne de LIEN (élément du modèle, ADR 0029) ne se supprime pas d'un
 * chapitre : elle se masque. Son fichier, celui du modèle, n'est jamais touché.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { updateChapterDocument, deleteChapterDocument } from '$lib/server/chapters';
import { updateDocumentSchema } from '$lib/server/validation/chapters';
import { uuidSchema } from '$lib/server/validation/common';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/teacher/chapters/[id]/documents/[docId]/+server');

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify the chapter exists and document belongs to it
 */
async function verifyDocumentOwnership(
	chapterId: string,
	docId: string,
	supabase: App.Locals['supabase']
) {
	// Verify chapter exists
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	// Verify document exists and belongs to chapter
	const { data: document, error: docError } = await supabase
		.from('chapter_documents')
		.select('id, chapter_id, source_id')
		.eq('id', docId)
		.single();

	if (docError || !document) {
		throw error(404, 'Document not found');
	}

	if (document.chapter_id !== chapterId) {
		throw error(400, 'Document does not belong to this chapter');
	}

	return { chapter, document };
}

/**
 * PUT /api/teacher/chapters/[id]/documents/[docId]
 * Update a document
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	await requireRole(locals, 'teacher');

	// Validate IDs
	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const docIdValidation = uuidSchema.safeParse(params.docId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!docIdValidation.success) {
		throw error(400, 'Invalid document ID');
	}

	const chapterId = chapterIdValidation.data;
	const docId = docIdValidation.data;

	// Verify ownership
	await verifyDocumentOwnership(chapterId, docId, locals.supabase);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = updateDocumentSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	// Update document
	const result = await updateChapterDocument(docId, validation.data, locals.supabase);

	if (result.error) {
		logger.error('[PUT /api/teacher/chapters/[id]/documents/[docId]] Error:', result.error);
		throw error(500, 'Failed to update document');
	}

	return json({ document: result.data });
};

/**
 * DELETE /api/teacher/chapters/[id]/documents/[docId]
 * Delete a document
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	// Validate IDs
	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const docIdValidation = uuidSchema.safeParse(params.docId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!docIdValidation.success) {
		throw error(400, 'Invalid document ID');
	}

	const chapterId = chapterIdValidation.data;
	const docId = docIdValidation.data;

	// Verify ownership
	const { document } = await verifyDocumentOwnership(chapterId, docId, locals.supabase);

	if (document.source_id !== null) {
		throw error(409, 'Élément du modèle : masquez-le plutôt que de le supprimer.');
	}

	// Delete document
	const result = await deleteChapterDocument(docId, locals.supabase);

	if (result.error) {
		logger.error('[DELETE /api/teacher/chapters/[id]/documents/[docId]] Error:', result.error);
		throw error(500, 'Failed to delete document');
	}

	return json({ success: true });
};
