/**
 * Publier et dépublier les contenus d'un chapitre.
 * ================================================
 *
 * `class_chapters.is_visible` ouvre le chapitre ; `published_at` décide, contenu
 * par contenu, de ce que l'élève y trouve. Le professeur prépare tout, puis
 * libère au rythme du cours.
 *
 * ⚠️ « Publier » a trois sens dans ce dépôt. Celui-ci — `published_at` — veut
 * dire « mis à disposition des élèves de cette classe, dans ce chapitre ». Les
 * deux autres sont `worksheets.status` (la fiche est terminée) et
 * `chapter_templates.status` (le modèle est diffusable).
 *
 * Le garde de visibilité vit dans la **policy**, pas ici : ce module ne fait
 * qu'écrire la date. Un appelant qui l'oublierait ne pourrait donc pas exposer
 * un contenu par erreur.
 *
 * @module server/chapters-publication
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ChapterContentType } from '$lib/types/chapters';

/**
 * Correspondance FERMÉE entre ce qu'un formulaire envoie et la table visée.
 *
 * Le type de contenu vient du client. Le passer à `supabase.from()` reviendrait
 * à lui laisser choisir la table à écrire : on cherche donc une clé dans cette
 * table de correspondance, et un type inconnu ne produit aucune requête.
 */
// `as const satisfies` et non `Record<…, string>` : le `satisfies` exige que les
// cinq types soient couverts (un sixième ajouté au type casse ici), et le
// `as const` conserve les noms de tables comme types littéraux — sans quoi le
// client Supabase typé n'accepterait plus `from()`.
const TABLES = {
	document: 'chapter_documents',
	exercise: 'chapter_exercises',
	checklist: 'chapter_checklist_items',
	quiz: 'chapter_quiz_questions',
	worksheet: 'chapter_worksheets'
} as const satisfies Record<ChapterContentType, string>;

/** Les types acceptés, pour construire le schéma Zod de l'appelant. */
export const CHAPTER_CONTENT_TYPES = Object.keys(TABLES) as [
	ChapterContentType,
	...ChapterContentType[]
];

export type { ChapterContentType };

export interface SetContentPublicationInput {
	contentType: ChapterContentType;
	itemId: string;
	/** `true` met à disposition, `false` retire. */
	published: boolean;
}

export interface PublicationResult {
	itemId: string;
	chapterId: string;
	publishedAt: string | null;
}

/**
 * Met un contenu de chapitre à disposition des élèves, ou l'en retire.
 *
 * @param input - Type de contenu, élément visé, et sens de l'opération
 * @param supabase - Client **aux droits du professeur** : c'est la policy qui
 *   vérifie que l'élément lui appartient, pas ce module
 */
export async function setContentPublication(
	input: SetContentPublicationInput,
	supabase: SupabaseClient<Database>
): Promise<{ data: PublicationResult | null; error: Error | null }> {
	const table = Object.prototype.hasOwnProperty.call(TABLES, input.contentType)
		? TABLES[input.contentType]
		: undefined;

	if (!table) {
		console.error(`[setContentPublication] Type de contenu inconnu : ${input.contentType}`);
		return { data: null, error: new Error('Type de contenu inconnu') };
	}

	// `now()` et non une date choisie : la policy compare `published_at <= now()`,
	// donc une date future ne publierait rien — et le professeur croirait avoir
	// publié. Programmer une publication est un autre geste, qui n'existe pas
	// encore.
	const publishedAt = input.published ? new Date().toISOString() : null;

	const { data, error } = await supabase
		.from(table)
		.update({ published_at: publishedAt })
		.eq('id', input.itemId)
		.select('id, chapter_id')
		.single();

	// PGRST116 = aucune ligne rendue. Ce n'est pas une panne : soit l'élément
	// n'existe plus, soit la policy ne le donne pas à ce professeur. Dans les
	// deux cas il n'a pas été publié, et il faut le dire.
	if (error?.code === 'PGRST116' || (!error && !data)) {
		return { data: null, error: new Error('Contenu introuvable') };
	}

	if (error) {
		console.error('[setContentPublication] Écriture impossible :', error);
		return { data: null, error: new Error(error.message) };
	}

	return {
		data: { itemId: data.id, chapterId: data.chapter_id, publishedAt },
		error: null
	};
}
