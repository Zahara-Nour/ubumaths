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
 *
 * ⚠️ La garde, c'est la LECTURE DE LA LIGNE avec le client de l'utilisateur : la
 * RLS ne rend à un élève que les documents PUBLIÉS d'un chapitre visible de sa
 * classe. Le fichier se télécharge ensuite avec le client service (ADR 0029) :
 * le fichier d'un élément de modèle vit sous `templates/…`, où l'élève n'a, à
 * dessein, aucune règle de stockage. Le chemin téléchargé est TOUJOURS celui de
 * la ligne lue, jamais un paramètre de la requête.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { CHAPTER_DOCUMENTS_BUCKET } from '$lib/server/content-owner';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/documents/[id]/+server');

const idSchema = z.string().uuid('ID invalide');

/** Les seuls dossiers d'où ce service sert un fichier : chapitre ou modèle. */
const SERVABLE_PREFIXES = ['chapters/', 'templates/'] as const;

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
				chapter:chapter_id(
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

		// Access control - chapter is array from join, get first element.
		// Une ligne de MODÈLE n'a pas de chapitre (`null`) : seul le professeur la lit.
		const chapterArray = document.chapter as unknown as
			| Array<{ id: string; is_visible: boolean; class_id: string }>
			| { id: string; is_visible: boolean; class_id: string }
			| null;
		const chapter = Array.isArray(chapterArray) ? (chapterArray[0] ?? null) : chapterArray;

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
		else if (profile.role === 'student' && chapter?.is_visible) {
			const { data: enrollment, error: enrollmentError } = await supabase
				.from('class_members')
				.select('id')
				.eq('class_id', chapter.class_id)
				.eq('student_id', profile.id)
				// Depuis le 2026-09-13, retirer un élève l'ARCHIVE : l'adhésion
				// survit au départ, donc son existence ne prouve plus rien. Sans
				// ce filtre, cette route énoncerait une règle d'accès que
				// `is_class_student` refuse désormais côté base.
				.eq('status', 'active')
				.single();

			// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
			// panne doit se distinguer d'un refus mérité.
			if (enrollmentError && enrollmentError.code !== 'PGRST116') {
				console.error('Contrôle d’accès impossible :', enrollmentError);
				throw error(500, 'Impossible de vérifier l’accès');
			}

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

		// Le client service lit tout le bucket : on ne lui confie qu'un chemin
		// de chapitre ou de modèle, sans remontée de dossier.
		const storagePath = document.storage_path;
		if (
			!SERVABLE_PREFIXES.some((prefix) => storagePath.startsWith(prefix)) ||
			storagePath.includes('..')
		) {
			logger.error('Chemin hors des dossiers servis :', document.id);
			throw error(404, 'Document non trouve');
		}

		// Fetch from Supabase Storage — APRÈS la garde de la ligne ci-dessus.
		const { data: fileData, error: storageError } = await createServiceRoleClient()
			.storage.from(CHAPTER_DOCUMENTS_BUCKET)
			.download(storagePath);

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
				// `no-store` : un document dépublié ne doit pas rester lisible dans le
				// cache du navigateur de l'élève.
				'Cache-Control': 'private, no-store'
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
