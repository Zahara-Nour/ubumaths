/**
 * Autorisation d'envoi d'un document de chapitre
 * ==============================================
 *
 * Le fichier ne traverse plus le serveur : au-delà de quelques mégaoctets, la
 * plateforme répondait 413 avant même que le code ne s'exécute. Cette route
 * vérifie les droits et délivre une autorisation à usage unique, avec laquelle
 * le navigateur dépose le fichier directement dans le stockage.
 *
 * POST /api/teacher/chapters/[id]/document-upload-url
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { z } from 'zod';

/** Le bucket porte la même liste ; celle-ci refuse tôt, avec un message clair. */
const ALLOWED_MIME_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif'
] as const;

const bodySchema = z.object({
	fileName: z.string().trim().min(1, 'Nom de fichier requis').max(255),
	fileType: z.enum(ALLOWED_MIME_TYPES)
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
	await requireRole(locals, 'teacher');

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de chapitre invalide');
	}

	const chapterId = idValidation.data;

	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('id')
		.eq('id', chapterId)
		.single();

	// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime ; toute
	// autre panne mérite son propre message.
	if (chapterError && chapterError.code !== 'PGRST116') {
		console.error('[document-upload-url] Lecture impossible :', chapterError);
		throw error(500, 'Vérification impossible');
	}

	if (!chapter) {
		throw error(403, 'Accès refusé');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = bodySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Le chemin est décidé ici, jamais reçu du navigateur : c'est lui qui
	// enferme le fichier dans son chapitre.
	const ext = validation.data.fileName.split('.').pop()?.toLowerCase() || 'bin';
	const storagePath = `chapters/${chapterId}/${Date.now()}.${ext}`;

	const { data, error: signError } = await locals.supabase.storage
		.from('chapter-documents')
		.createSignedUploadUrl(storagePath);

	if (signError || !data) {
		console.error('[document-upload-url] Signature impossible :', signError);
		throw error(500, "Erreur lors de la préparation de l'envoi");
	}

	return json({ storagePath: data.path, token: data.token }, { status: 201 });
};
