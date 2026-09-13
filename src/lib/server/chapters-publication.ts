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
	/** Auteur de l'affectation créée en distribuant une fiche. */
	teacherId: string;
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

	// Publier une fiche, c'est la DONNER.
	//
	// Tranché par David le 2026-09-13 : un clic, la fiche part à la classe du
	// chapitre, ouverte tout de suite, sans échéance ni consigne. La
	// distribution passe AVANT l'écriture de `published_at` — si elle échoue, la
	// fiche ne doit pas se retrouver marquée « publiée » alors que personne ne
	// l'a reçue.
	//
	// Dépublier, en revanche, ne touche pas à l'affectation : l'élève garde la
	// fiche dans « Mon travail », on n'interrompt pas un travail en cours.
	if (input.contentType === 'worksheet' && input.published) {
		const distribution = await ensureWorksheetDistributed(input.itemId, input.teacherId, supabase);
		if (distribution.error) {
			return { data: null, error: distribution.error };
		}
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
		// Une fiche déjà distribuée dont le chapitre n'a pas pu être mis à jour :
		// la classe l'a reçue, l'écran dira « Préparé ». Le dire, plutôt que de
		// laisser le professeur croire que rien n'est parti.
		if (input.contentType === 'worksheet' && input.published) {
			return {
				data: null,
				error: new Error(
					"La fiche a été distribuée à la classe, mais le chapitre n'a pas pu être mis à jour."
				)
			};
		}
		return { data: null, error: new Error(error.message) };
	}

	return {
		data: { itemId: data.id, chapterId: data.chapter_id, publishedAt },
		error: null
	};
}

/**
 * S'assure que la fiche d'un chapitre est bien distribuée à la classe de ce
 * chapitre — en créant l'affectation si elle manque.
 *
 * Idempotent : une classe qui a déjà une affectation active n'en reçoit pas une
 * seconde. Sans ce garde, republier une fiche empilerait les affectations, et
 * l'élève verrait la même fiche plusieurs fois dans « Mon travail ».
 */
/**
 * Parmi ces fiches, lesquelles sont réellement distribuées à cette classe ?
 *
 * ⚠️ **Une seule définition de « distribuée », et c'est le point.** Ce critère
 * doit rester identique à celui de `student_has_worksheet_access` : statut
 * actif, ouverture déjà échue, et un lien vers la classe. Deux endroits le
 * consultent — le garde d'idempotence ci-dessous et l'écran du professeur — et
 * s'ils divergeaient, le badge afficherait « visible par les élèves » pour une
 * fiche programmée pour lundi prochain.
 *
 * `available_from` était justement l'oubli : la colonne a pour défaut `now()`,
 * mais l'écran de distribution permet de la fixer dans le futur.
 *
 * Pas de `maybeSingle()` ici : rien n'interdit deux affectations actives de la
 * même fiche à la même classe, et `maybeSingle()` lève `PGRST116` dès la
 * deuxième ligne — ce qui rendait la fiche DÉFINITIVEMENT impubliable.
 */
export async function listDistributedWorksheetIds(
	worksheetIds: string[],
	classId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: Set<string> | null; error: Error | null }> {
	if (worksheetIds.length === 0) {
		return { data: new Set(), error: null };
	}

	const maintenant = new Date().toISOString();
	const { data, error } = await supabase
		.from('worksheet_assignments')
		.select('worksheet_id, worksheet_assignment_classes!inner(class_id)')
		.in('worksheet_id', worksheetIds)
		.eq('status', 'active')
		.eq('worksheet_assignment_classes.class_id', classId)
		.or(`available_from.is.null,available_from.lte.${maintenant}`);

	if (error) {
		console.error('[listDistributedWorksheetIds] Affectations illisibles :', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: new Set((data ?? []).map((a) => a.worksheet_id)), error: null };
}

async function ensureWorksheetDistributed(
	chapterWorksheetId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	// Quelle fiche, et à quelle classe ? Les deux viennent du rattachement,
	// jamais du client : c'est ce qui empêche de distribuer à une autre classe.
	const { data: lien, error: lienError } = await supabase
		.from('chapter_worksheets')
		.select('id, worksheet_id, chapter:class_chapters!inner(class_id)')
		.eq('id', chapterWorksheetId)
		.single();

	if (lienError || !lien) {
		console.error('[ensureWorksheetDistributed] Rattachement illisible :', lienError);
		return { error: new Error('Fiche introuvable dans ce chapitre') };
	}

	// PostgREST type une jointure « vers un » en tableau quand il ne peut pas
	// prouver l'unicité ; à l'exécution c'est un objet. L'idiome du dépôt.
	const chapitre = Array.isArray(lien.chapter) ? lien.chapter[0] : lien.chapter;
	const classId = chapitre?.class_id;

	if (!classId) {
		return { error: new Error('Chapitre sans classe') };
	}

	const { data: dejaDistribuees, error: lectureError } = await listDistributedWorksheetIds(
		[lien.worksheet_id],
		classId,
		supabase
	);

	if (lectureError) {
		return { error: lectureError };
	}

	if (dejaDistribuees!.has(lien.worksheet_id)) {
		return { error: null };
	}

	// Créée en BROUILLON d'abord, activée en dernier.
	//
	// Ce n'est pas un détail de style : la seule policy DELETE de
	// `worksheet_assignments` ne laisse supprimer que des brouillons. Une
	// affectation créée directement en `active` et dont le rattachement à la
	// classe échouerait serait donc **indélébile par l'API**, et le « ménage »
	// ci-dessous un no-op silencieux (un DELETE qui ne touche aucune ligne ne
	// renvoie pas d'erreur). En trois temps, le ménage fonctionne vraiment.
	//
	// Et tant qu'elle est en brouillon, elle n'atteint personne :
	// `student_has_worksheet_access` exige `status = 'active'`.
	const { data: affectation, error: affectationError } = await supabase
		.from('worksheet_assignments')
		.insert({
			worksheet_id: lien.worksheet_id,
			status: 'draft',
			created_by: teacherId
		})
		.select('id')
		.single();

	if (affectationError || !affectation) {
		console.error('[ensureWorksheetDistributed] Affectation impossible :', affectationError);
		return { error: new Error('Distribution impossible') };
	}

	const { error: lienClasseError } = await supabase
		.from('worksheet_assignment_classes')
		.insert({ assignment_id: affectation.id, class_id: classId });

	if (lienClasseError) {
		console.error(
			'[ensureWorksheetDistributed] Rattachement à la classe impossible :',
			lienClasseError
		);
		// Le brouillon, lui, est supprimable : la policy l'autorise.
		const { error: menageError } = await supabase
			.from('worksheet_assignments')
			.delete()
			.eq('id', affectation.id);
		if (menageError) {
			console.error('[ensureWorksheetDistributed] Ménage impossible :', menageError);
		}
		return { error: new Error('Distribution impossible') };
	}

	// Activation en dernier : à cet instant seulement, et pas avant, la fiche
	// devient lisible par la classe.
	const { error: activationError } = await supabase
		.from('worksheet_assignments')
		.update({ status: 'active' })
		.eq('id', affectation.id);

	if (activationError) {
		console.error('[ensureWorksheetDistributed] Activation impossible :', activationError);
		// Le brouillon reste, invisible aux élèves, et supprimable.
		return { error: new Error('Distribution impossible') };
	}

	return { error: null };
}
