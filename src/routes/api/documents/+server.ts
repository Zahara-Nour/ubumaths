/**
 * Documents API
 *
 * GET /api/documents - List documents
 * DELETE /api/documents - Delete a document
 * PATCH /api/documents - Update document metadata
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import {
	documentListQuerySchema,
	documentUpdateSchema,
	documentDeleteSchema
} from '$lib/server/validation/documents';
import { deleteDocument, disableDocument, enableDocument } from '$lib/server/rag';

/**
 * GET /api/documents - List documents for the current teacher
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const { user, profile } = await requireAuth(locals);

		// Only teachers and admins can view documents
		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, { message: 'Accès non autorisé' });
		}

		// Parse query parameters
		const queryValidation = documentListQuerySchema.safeParse(Object.fromEntries(url.searchParams));

		if (!queryValidation.success) {
			throw error(400, { message: queryValidation.error.issues[0].message });
		}

		const { page, limit, search, sourceType, gradeLevel, topic, enabledOnly } =
			queryValidation.data;
		const offset = (page - 1) * limit;

		// Build query
		let query = locals.supabase.from('rag_documents').select('*', { count: 'exact' });

		// Filter by teacher (admins see all)
		if (profile.role !== 'admin') {
			query = query.eq('teacher_id', user.id);
		}

		// Apply filters
		if (sourceType) {
			query = query.eq('source_type', sourceType);
		}

		if (gradeLevel) {
			query = query.contains('grade_levels', [gradeLevel]);
		}

		if (topic) {
			query = query.contains('topics', [topic]);
		}

		if (enabledOnly) {
			query = query.eq('enabled_for_rag', true);
		}

		if (search) {
			query = query.ilike('title', `%${search}%`);
		}

		// Order and paginate
		query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

		const { data: documents, error: queryError, count } = await query;

		if (queryError) {
			console.error('Error fetching documents:', queryError);
			throw error(500, { message: 'Erreur lors de la récupération des documents' });
		}

		// Get chunk counts for each document
		const documentIds = documents?.map((d) => d.id) || [];
		let chunkCounts: Record<string, number> = {};

		if (documentIds.length > 0) {
			const { data: chunks } = await locals.supabase
				.from('rag_chunks')
				.select('document_id')
				.in('document_id', documentIds);

			if (chunks) {
				chunkCounts = chunks.reduce(
					(acc, chunk) => {
						acc[chunk.document_id] = (acc[chunk.document_id] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>
				);
			}
		}

		// Format response
		const formattedDocuments = (documents || []).map((doc) => ({
			id: doc.id,
			title: doc.title,
			sourceType: doc.source_type,
			gradeLevels: doc.grade_levels,
			topics: doc.topics,
			enabledForRag: doc.enabled_for_rag,
			chunkCount: chunkCounts[doc.id] || 0,
			metadata: doc.metadata,
			createdAt: doc.created_at,
			updatedAt: doc.updated_at
		}));

		return json({
			documents: formattedDocuments,
			pagination: {
				page,
				limit,
				total: count || 0,
				totalPages: Math.ceil((count || 0) / limit)
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Documents list error:', err);
		throw error(500, { message: 'Erreur serveur' });
	}
};

/**
 * DELETE /api/documents - Delete a document
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	try {
		const { user, profile } = await requireAuth(locals);

		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, { message: 'Accès non autorisé' });
		}

		const body = await request.json();
		const validation = documentDeleteSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, { message: validation.error.issues[0].message });
		}

		const { documentId } = validation.data;

		// Verify ownership (unless admin)
		if (profile.role !== 'admin') {
			const { data: doc } = await locals.supabase
				.from('rag_documents')
				.select('teacher_id')
				.eq('id', documentId)
				.single();

			if (!doc || doc.teacher_id !== user.id) {
				throw error(403, { message: 'Vous ne pouvez supprimer que vos propres documents' });
			}
		}

		// Delete document (cascades to chunks)
		const success = await deleteDocument(locals.supabase, documentId);

		if (!success) {
			throw error(500, { message: 'Erreur lors de la suppression du document' });
		}

		return json({ success: true, message: 'Document supprimé' });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Document delete error:', err);
		throw error(500, { message: 'Erreur serveur' });
	}
};

/**
 * PATCH /api/documents - Update document metadata
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const { user, profile } = await requireAuth(locals);

		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, { message: 'Accès non autorisé' });
		}

		const body = await request.json();
		const { documentId, ...updateData } = body;

		if (!documentId || typeof documentId !== 'string') {
			throw error(400, { message: 'ID de document requis' });
		}

		const validation = documentUpdateSchema.safeParse(updateData);

		if (!validation.success) {
			throw error(400, { message: validation.error.issues[0].message });
		}

		// Verify ownership (unless admin)
		if (profile.role !== 'admin') {
			const { data: doc } = await locals.supabase
				.from('rag_documents')
				.select('teacher_id')
				.eq('id', documentId)
				.single();

			if (!doc || doc.teacher_id !== user.id) {
				throw error(403, { message: 'Vous ne pouvez modifier que vos propres documents' });
			}
		}

		// Handle enable/disable specially
		if (validation.data.enabledForRag !== undefined) {
			const success = validation.data.enabledForRag
				? await enableDocument(locals.supabase, documentId)
				: await disableDocument(locals.supabase, documentId);

			if (!success) {
				throw error(500, { message: 'Erreur lors de la mise à jour du document' });
			}
		}

		// Update other fields
		const updateFields: Record<string, unknown> = {};
		if (validation.data.title) updateFields.title = validation.data.title;
		if (validation.data.gradeLevels) updateFields.grade_levels = validation.data.gradeLevels;
		if (validation.data.topics) updateFields.topics = validation.data.topics;

		if (Object.keys(updateFields).length > 0) {
			const { error: updateError } = await locals.supabase
				.from('rag_documents')
				.update(updateFields)
				.eq('id', documentId);

			if (updateError) {
				throw error(500, { message: 'Erreur lors de la mise à jour du document' });
			}
		}

		return json({ success: true, message: 'Document mis à jour' });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Document update error:', err);
		throw error(500, { message: 'Erreur serveur' });
	}
};
