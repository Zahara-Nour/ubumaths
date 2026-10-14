/**
 * Propriétaire d'un contenu de chapitre — chapitre ou modèle (ADR 0029)
 * =====================================================================
 *
 * Les six tables de contenu (`chapter_sections`, `chapter_documents`,
 * `chapter_checklist_items`, `chapter_exercises`, `chapter_worksheets`,
 * `chapter_series`) rangent un élément SOIT dans un chapitre (`chapter_id`), SOIT
 * dans un modèle (`template_id`). Les opérations du chapitre sont paramétrées par
 * ce propriétaire plutôt que dupliquées.
 *
 * Les fichiers téléversés vivent dans le bucket `chapter-documents`, sous un
 * préfixe propre au propriétaire : `chapters/<id>/…` ou `templates/<id>/…`. Les
 * règles de stockage du professeur sont symétriques sur ces deux préfixes.
 *
 * @module server/content-owner
 */

import type { ContentOwner } from '$lib/types/chapters';

export type { ContentOwner };

// Constantes
/** Bucket des documents de chapitre et de modèle. */
export const CHAPTER_DOCUMENTS_BUCKET = 'chapter-documents';

// Functions

/**
 * Normalise le propriétaire. Une chaîne seule désigne un CHAPITRE : c'est la
 * forme des appelants d'avant l'ADR 0029, gardée telle quelle.
 */
export function toOwner(owner: ContentOwner | string): ContentOwner {
	return typeof owner === 'string' ? { kind: 'chapter', id: owner } : owner;
}

/** La colonne qui porte le propriétaire dans les six tables de contenu. */
export function ownerColumn(owner: ContentOwner): 'chapter_id' | 'template_id' {
	return owner.kind === 'chapter' ? 'chapter_id' : 'template_id';
}

/**
 * Le propriétaire, prêt à être étalé dans un `insert` : exactement UNE des deux
 * colonnes, comme l'exige la contrainte `*_un_proprietaire`.
 */
export function ownerInsert(
	owner: ContentOwner
): { chapter_id: string; template_id?: never } | { template_id: string; chapter_id?: never } {
	return owner.kind === 'chapter' ? { chapter_id: owner.id } : { template_id: owner.id };
}

/** Le dossier des fichiers d'un propriétaire, barre finale comprise. */
export function ownerStoragePrefix(owner: ContentOwner): string {
	return owner.kind === 'chapter' ? `chapters/${owner.id}/` : `templates/${owner.id}/`;
}

/**
 * Un chemin de fichier neuf pour ce propriétaire. Décidé par le serveur, jamais
 * reçu du navigateur : c'est lui qui enferme le fichier chez son propriétaire.
 *
 * @param fileName - Nom d'origine, dont seule l'extension est gardée
 * @param suffix - Distingue deux fichiers créés dans la même milliseconde (copies en lot)
 */
export function newStoragePath(owner: ContentOwner, fileName: string, suffix?: string): string {
	const ext = extensionOf(fileName);
	const stamp = suffix ? `${Date.now()}-${suffix}` : `${Date.now()}`;
	return `${ownerStoragePrefix(owner)}${stamp}.${ext}`;
}

/** L'extension d'un nom ou d'un chemin de fichier, `bin` à défaut. */
export function extensionOf(fileName: string): string {
	const last = fileName.split('/').pop() ?? '';
	const parts = last.split('.');
	const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
	// Une extension sert à nommer le fichier, pas à injecter un chemin.
	return ext && /^[a-z0-9]{1,10}$/.test(ext) ? ext : 'bin';
}
