/**
 * Document View/Download API
 * ==========================
 *
 * Serves chapter documents from Supabase Storage.
 * Handles both viewing (inline) and downloading (attachment).
 *
 * GET /api/documents/[id]/view - View document inline
 * GET /api/documents/[id]/download - Download document as attachment
 *
 * Security:
 * - Teachers can access documents from their chapters
 * - Students can access documents from visible chapters they're enrolled in
 * - Admins can access all documents
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const idSchema = z.string().uuid('ID invalide');

/**
 * GET /api/documents/[id]
 *
 * Fetch a document from storage.
 * Query params:
 * - download: if present, serve as attachment instead of inline
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Check authentication
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// Validate ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const documentId = params.id;
	const isDownload = url.searchParams.has('download');
	const supabase = locals.supabase;

	try {
		// Get document info
		const { data: document, error: docError } = await supabase
			.from('chapter_documents')
			.select(
				`
				id,
				title,
				storage_path,
				file_name,
				mime_type,
				source_type,
				chapter:chapter_id!inner(
					id,
					is_visible,
					class_id,
					teacher_id
				)
			`
			)
			.eq('id', documentId)
			.single();

		if (docError || !document) {
			throw error(404, 'Document non trouve');
		}

		// Access control
		const chapter = document.chapter as {
			id: string;
			is_visible: boolean;
			class_id: string;
			teacher_id: string;
		};

		const profile = locals.profile;
		let hasAccess = false;

		// Admin has full access
		if (profile.role === 'admin') {
			hasAccess = true;
		}
		// Teacher has access to their own chapters
		else if (profile.role === 'teacher' && chapter.teacher_id === profile.id) {
			hasAccess = true;
		}
		// Student has access to visible chapters in their enrolled classes
		else if (profile.role === 'student' && chapter.is_visible) {
			const { data: enrollment } = await supabase
				.from('class_members')
				.select('id')
				.eq('class_id', chapter.class_id)
				.eq('student_id', profile.id)
				.single();

			if (enrollment) {
				hasAccess = true;
			}
		}

		if (!hasAccess) {
			throw error(403, 'Acces refuse');
		}

		// Google Drive documents are external
		if (document.source_type === 'google_drive') {
			throw error(400, 'Ce document est un lien Google Drive externe');
		}

		// Ensure we have a storage path
		if (!document.storage_path) {
			throw error(404, 'Chemin de stockage manquant');
		}

		// Fetch from Supabase Storage
		const { data: fileData, error: storageError } = await supabase.storage
			.from('chapter-documents')
			.download(document.storage_path);

		if (storageError || !fileData) {
			console.error('[Document API] Storage error:', storageError);
			throw error(500, 'Erreur lors du chargement du document');
		}

		// Determine content disposition
		const fileName = document.file_name || 'document';
		const contentDisposition = isDownload
			? `attachment; filename="${encodeURIComponent(fileName)}"`
			: `inline; filename="${encodeURIComponent(fileName)}"`;

		// Return the file
		return new Response(fileData, {
			headers: {
				'Content-Type': document.mime_type || 'application/octet-stream',
				'Content-Disposition': contentDisposition,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Document API] Error:', err);
		throw error(500, 'Erreur serveur');
	}
};
