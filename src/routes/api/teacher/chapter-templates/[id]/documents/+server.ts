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
import { insertDocument, type SectionPlacement } from '$lib/server/chapters';
import { nextSectionOrder } from '$lib/server/chapter-sections';
import { removeFileIfUnused } from '$lib/server/template-content';
import { isPathInFolder, registerDocumentSchema } from '$lib/server/validation/chapter-documents';
import { ownerStoragePrefix } from '$lib/server/content-owner';
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

	// La section est passée À L'INSERTION : la base crée aussitôt les lignes de
	// lien des chapitres liés, avec la section qu'a le document à ce moment-là.
	// Un rang illisible ne défait rien : le document naît non classé.
	let placement: SectionPlacement | undefined;
	let placed = true;
	if (data.sectionId) {
		const { data: rang, error: rangError } = await nextSectionOrder(
			owner,
			data.sectionId,
			locals.supabase
		);
		if (rangError || rang === null) {
			logger.error('[documents] Rang illisible :', rangError);
			placed = false;
		} else {
			placement = { sectionId: data.sectionId, sectionOrder: rang };
		}
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
		locals.supabase,
		placement
	);

	if (dbError || !created) {
		// Le fichier déposé n'a plus de ligne : orphelin invisible. Mais le chemin
		// vient du navigateur : on ne le supprime que si AUCUNE ligne ne le
		// désigne (un autre document du modèle peut pointer ce même fichier).
		await removeFileIfUnused(data.storagePath, locals.supabase);
		logger.error('[documents] Enregistrement impossible :', dbError);
		throw error(500, "Erreur lors de l'enregistrement");
	}

	return json({ success: true, placed }, { status: 201 });
};
