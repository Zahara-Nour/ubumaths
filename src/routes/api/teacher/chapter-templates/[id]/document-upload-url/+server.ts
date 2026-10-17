/**
 * Autorisation d'envoi d'un document de MODÈLE
 * ============================================
 *
 * Miroir de `/api/teacher/chapters/[id]/document-upload-url` (ADR 0029) : le
 * fichier est rangé chez le modèle, `templates/<template_id>/…`, jamais dans un
 * chapitre. Le navigateur le dépose directement dans le stockage avec
 * l'autorisation à usage unique rendue ici.
 *
 * POST /api/teacher/chapter-templates/[id]/document-upload-url
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import { documentUploadUrlSchema } from '$lib/server/validation/chapter-documents';
import { CHAPTER_DOCUMENTS_BUCKET, newStoragePath } from '$lib/server/content-owner';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/teacher/chapter-templates/[id]/document-upload-url/+server');

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = documentUploadUrlSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Le chemin est décidé ici, jamais reçu du navigateur : c'est lui qui
	// enferme le fichier dans son modèle.
	const storagePath = newStoragePath(
		{ kind: 'template', id: templateId },
		validation.data.fileName
	);

	const { data, error: signError } = await locals.supabase.storage
		.from(CHAPTER_DOCUMENTS_BUCKET)
		.createSignedUploadUrl(storagePath);

	if (signError || !data) {
		logger.error('[document-upload-url] Signature impossible :', signError);
		throw error(500, "Erreur lors de la préparation de l'envoi");
	}

	return json({ storagePath: data.path, token: data.token }, { status: 201 });
};
