/**
 * Enregistrement d'un document de chapitre
 * ========================================
 *
 * Le fichier est déjà dans le stockage, déposé par le navigateur avec une
 * autorisation signée. Cette route n'enregistre que ses métadonnées — quelques
 * centaines d'octets, là où le fichier lui-même faisait répondre 413.
 *
 * POST /api/teacher/chapters/[id]/documents
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { addChapterDocument } from '$lib/server/chapters';
import { placeInSection } from '$lib/server/chapter-sections';
import { targetSectionFieldSchema } from '$lib/server/validation/chapter-sections';
import { z } from 'zod';

/** Le bucket porte la même liste ; celle-ci refuse tôt, avec un message clair. */
const ALLOWED_MIME_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif'
] as const;

/** Doit rester d'accord avec le bucket et la contrainte `valid_file_size`. */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const bodySchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200),
	description: z.string().trim().max(1000).optional().nullable(),
	storagePath: z.string().min(1, 'Fichier requis'),
	fileName: z.string().trim().min(1, 'Fichier requis').max(255),
	fileType: z.enum(ALLOWED_MIME_TYPES),
	fileSize: z.number().int().positive().max(MAX_FILE_SIZE, 'Fichier trop volumineux (max 25 Mo)'),
	/** Section visée. Absente, le document retombe en « Non classé ». */
	sectionId: targetSectionFieldSchema
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

	// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
	if (chapterError && chapterError.code !== 'PGRST116') {
		console.error('[documents] Lecture impossible :', chapterError);
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

	const data = validation.data;

	// Un chemin venu du navigateur ne vaut que s'il désigne ce chapitre : sinon
	// on rattacherait ici le fichier d'un autre.
	if (!data.storagePath.startsWith(`chapters/${chapterId}/`)) {
		throw error(400, 'Fichier invalide');
	}

	const { data: created, error: dbError } = await addChapterDocument(
		chapterId,
		{
			chapterId,
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
		await locals.supabase.storage.from('chapter-documents').remove([data.storagePath]);
		console.error('[documents] Enregistrement impossible :', dbError);
		throw error(500, "Erreur lors de l'enregistrement");
	}

	// ⚠️ Un rangement raté ne défait PAS l'enregistrement : le document existe,
	// le fichier aussi. Il retombe en « Non classé », d'où le professeur peut
	// le déplacer — bien préférable à un 500 qui l'inviterait à tout refaire.
	let placed = true;
	if (data.sectionId) {
		const { error: placeError } = await placeInSection(
			chapterId,
			data.sectionId,
			'document',
			created.id,
			locals.supabase
		);
		if (placeError) {
			console.error('[documents] Rangement impossible :', placeError);
			placed = false;
		}
	}

	return json({ success: true, placed }, { status: 201 });
};
