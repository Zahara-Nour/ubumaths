/**
 * Enregistrement d'un document de MODÈLE
 * ======================================
 *
 * Miroir de `/api/teacher/chapters/[id]/documents` (ADR 0029). Le fichier est
 * déjà dans le stockage, sous `templates/<template_id>/…` ; cette route n'en
 * enregistre que les métadonnées. La base diffuse aussitôt le document, NON
 * publié, dans chaque chapitre lié.
 *
 * POST /api/teacher/chapter-templates/[id]/documents
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import { insertDocument } from '$lib/server/chapters';
import { placeInSection } from '$lib/server/chapter-sections';
import { isPathInFolder, registerDocumentSchema } from '$lib/server/validation/chapter-documents';
import { CHAPTER_DOCUMENTS_BUCKET, ownerStoragePrefix } from '$lib/server/content-owner';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/teacher/chapter-templates/[id]/documents/+server');

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);
	const owner = { kind: 'template', id: templateId } as const;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = registerDocumentSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Un chemin venu du navigateur ne vaut que s'il désigne CE modèle : sinon on
	// rattacherait ici le fichier d'un autre (chapitre ou modèle).
	if (!isPathInFolder(data.storagePath, ownerStoragePrefix(owner))) {
		throw error(400, 'Fichier invalide');
	}

	const { data: created, error: dbError } = await insertDocument(
		owner,
		{
			sourceType: 'upload',
			title: data.title,
			description: data.description || null,
			storagePath: data.storagePath,
			fileName: data.fileName,
			mimeType: data.fileType,
			fileSize: data.fileSize
		},
		locals.supabase
	);

	if (dbError || !created) {
		// Le fichier est déjà dans le stockage : le laisser sans sa ligne en
		// ferait un orphelin invisible.
		await locals.supabase.storage.from(CHAPTER_DOCUMENTS_BUCKET).remove([data.storagePath]);
		logger.error('[documents] Enregistrement impossible :', dbError);
		throw error(500, "Erreur lors de l'enregistrement");
	}

	// ⚠️ Un rangement raté ne défait PAS l'enregistrement : le document existe, il
	// retombe en « Non classé », d'où le professeur peut le déplacer.
	let placed = true;
	if (data.sectionId) {
		const { error: placeError } = await placeInSection(
			owner,
			data.sectionId,
			'document',
			created.id,
			locals.supabase
		);
		if (placeError) {
			logger.error('[documents] Rangement impossible :', placeError);
			placed = false;
		}
	}

	return json({ success: true, placed }, { status: 201 });
};
