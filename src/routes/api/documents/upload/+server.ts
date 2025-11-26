/**
 * Document Upload API
 *
 * POST /api/documents/upload
 *
 * Accepts multipart form data with:
 * - file: The document file (PDF, TXT, MD)
 * - metadata: JSON string with title, gradeLevels, topics, etc.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { documentUploadSchema, fileValidationSchema } from '$lib/server/validation/documents';
import { extractText } from '$lib/server/documents/pdf-extractor';
import { indexDocument } from '$lib/server/rag';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// ====================================================================
		// SECURITY: Authentication Check
		// ====================================================================
		const { user, profile } = await requireAuth(locals);

		// Only teachers and admins can upload documents
		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, { message: 'Seuls les enseignants peuvent téléverser des documents' });
		}

		// ====================================================================
		// Parse multipart form data
		// ====================================================================
		const formData = await request.formData();
		const file = formData.get('file');
		const metadataStr = formData.get('metadata');

		if (!file || !(file instanceof File)) {
			throw error(400, { message: 'Fichier manquant' });
		}

		// ====================================================================
		// Validate file
		// ====================================================================
		const fileValidation = fileValidationSchema.safeParse({
			name: file.name,
			size: file.size,
			type: file.type
		});

		if (!fileValidation.success) {
			throw error(400, { message: fileValidation.error.issues[0].message });
		}

		if (file.size > MAX_FILE_SIZE) {
			throw error(400, { message: 'Le fichier est trop volumineux (max 10MB)' });
		}

		// ====================================================================
		// Parse and validate metadata
		// ====================================================================
		let metadata: {
			title: string;
			description?: string;
			gradeLevels: string[];
			topics: string[];
			enabledForRag: boolean;
		};

		if (metadataStr && typeof metadataStr === 'string') {
			try {
				const parsed = JSON.parse(metadataStr);
				const validation = documentUploadSchema.safeParse(parsed);
				if (!validation.success) {
					throw error(400, { message: validation.error.issues[0].message });
				}
				metadata = validation.data;
			} catch (e) {
				if (e && typeof e === 'object' && 'status' in e) {
					throw e; // Re-throw SvelteKit errors
				}
				throw error(400, { message: 'Métadonnées invalides' });
			}
		} else {
			// Use filename as title if no metadata provided
			metadata = {
				title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
				gradeLevels: [],
				topics: [],
				enabledForRag: true
			};
		}

		// ====================================================================
		// Extract text from file
		// ====================================================================
		const buffer = Buffer.from(await file.arrayBuffer());
		const extraction = await extractText(buffer, file.type);

		if (!extraction.success || !extraction.text) {
			throw error(400, {
				message: extraction.error || "Impossible d'extraire le texte du fichier"
			});
		}

		// Check minimum content length
		if (extraction.text.length < 50) {
			throw error(400, {
				message: 'Le document contient trop peu de texte pour être indexé'
			});
		}

		// ====================================================================
		// Index document in RAG system
		// ====================================================================
		const result = await indexDocument(locals.supabase, {
			sourceType: 'manual_upload',
			sourceId: `${user.id}-${Date.now()}-${file.name}`,
			title: metadata.title,
			content: extraction.text,
			metadata: {
				originalFilename: file.name,
				mimeType: file.type,
				fileSize: file.size,
				pageCount: extraction.pageCount,
				description: metadata.description,
				pdfMetadata: extraction.metadata
			},
			teacherId: user.id,
			gradeLevels: metadata.gradeLevels,
			topics: metadata.topics
		});

		if (!result.success) {
			throw error(500, {
				message: result.error || "Erreur lors de l'indexation du document"
			});
		}

		// ====================================================================
		// Return success response
		// ====================================================================
		return json({
			success: true,
			documentId: result.documentId,
			chunksCreated: result.chunksCreated,
			message: `Document "${metadata.title}" indexé avec succès (${result.chunksCreated} segments créés)`
		});
	} catch (err) {
		console.error('Document upload error:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, {
			message: 'Erreur lors du téléversement du document'
		});
	}
};
