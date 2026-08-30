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
					class_id
				)
			`
			)
			.eq('id', documentId)
			.single();

		if (docError || !document) {
			throw error(404, 'Document non trouve');
		}

		// Access control - chapter is array from join, get first element
		const chapterArray = document.chapter as unknown as Array<{
			id: string;
			is_visible: boolean;
			class_id: string;
		}>;
		const chapter = Array.isArray(chapterArray) ? chapterArray[0] : chapterArray;

		const profile = locals.profile;
		let hasAccess = false;

		// Admin has full access
		if (profile.role === 'admin') {
			hasAccess = true;
		}
		// Teacher has access to all chapters (mono-teacher owns every chapter)
		else if (profile.role === 'teacher') {
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

		// SECURITY (finding M6): the mime_type is stored unvalidated. Serving a
		// `text/html` (or SVG) document `inline` executes on our origin (stored XSS).
		// Only serve a small allowlist of safe types inline; anything else is forced
		// to download as an opaque octet-stream.
		const INLINE_SAFE_MIMES = new Set([
			'application/pdf',
			'image/png',
			'image/jpeg',
			'image/jpg',
			'image/gif',
			'image/webp'
		]);
		const rawMime = document.mime_type || 'application/octet-stream';
		const canInline = !isDownload && INLINE_SAFE_MIMES.has(rawMime);

		const fileName = document.file_name || 'document';
		const contentDisposition = canInline
			? `inline; filename="${encodeURIComponent(fileName)}"`
			: `attachment; filename="${encodeURIComponent(fileName)}"`;

		// Return the file
		return new Response(fileData, {
			headers: {
				'Content-Type': canInline ? rawMime : 'application/octet-stream',
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
