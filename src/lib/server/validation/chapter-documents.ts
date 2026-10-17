/**
 * Documents d'un chapitre ou d'un modèle — schémas de validation
 * ==============================================================
 *
 * Un fichier ne traverse pas le serveur : le navigateur le dépose dans le bucket
 * `chapter-documents` avec une autorisation signée, puis le serveur enregistre
 * ses métadonnées. Mêmes règles pour un chapitre et pour un modèle (ADR 0029) :
 * mêmes types MIME, même plafond de 25 Mo.
 *
 * Le bucket porte la même liste et la même limite : ces schémas refusent tôt,
 * avec un message clair, ce que le stockage refuserait de toute façon.
 */

import { z } from 'zod';
import { targetSectionFieldSchema } from './chapter-sections';

// Constantes
export const CHAPTER_DOCUMENT_MIME_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif'
] as const;

/** Doit rester d'accord avec le bucket et la contrainte `valid_file_size`. */
export const CHAPTER_DOCUMENT_MAX_SIZE = 25 * 1024 * 1024;

/** Demander une autorisation d'envoi. */
export const documentUploadUrlSchema = z.object({
	fileName: z.string().trim().min(1, 'Nom de fichier requis').max(255),
	fileType: z.enum(CHAPTER_DOCUMENT_MIME_TYPES)
});

/** Enregistrer un fichier déjà déposé. */
export const registerDocumentSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200),
	description: z.string().trim().max(1000).optional().nullable(),
	storagePath: z.string().min(1, 'Fichier requis').max(500),
	fileName: z.string().trim().min(1, 'Fichier requis').max(255),
	fileType: z.enum(CHAPTER_DOCUMENT_MIME_TYPES),
	fileSize: z
		.number()
		.int()
		.positive()
		.max(CHAPTER_DOCUMENT_MAX_SIZE, 'Fichier trop volumineux (max 25 Mo)'),
	/** Section visée. Absente, le document retombe en « Non classé ». */
	sectionId: targetSectionFieldSchema
});

export type RegisterDocumentInput = z.infer<typeof registerDocumentSchema>;

/**
 * Un chemin reçu du navigateur ne vaut que s'il désigne un fichier DIRECTEMENT
 * dans le dossier attendu : ni sous-dossier, ni `..`, ni autre propriétaire.
 */
export function isPathInFolder(path: string, folder: string): boolean {
	if (!path.startsWith(folder)) return false;
	const reste = path.slice(folder.length);
	return reste.length > 0 && !reste.includes('/') && !reste.includes('..');
}
