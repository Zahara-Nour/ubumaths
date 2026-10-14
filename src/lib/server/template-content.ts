/**
 * Contenu d'un modèle de chapitre — opérations serveur (ADR 0029)
 * ===============================================================
 *
 * Le modèle POSSÈDE son contenu : sections, documents (fichiers rangés sous
 * `templates/<template_id>/…`), objectifs, exercices, fiches, séries. Il s'édite
 * avec les mêmes fonctions que le chapitre (paramétrées par `ContentOwner`) ; ce
 * module ajoute ce qui n'existe que pour un modèle :
 *
 * - lister son contenu non retiré ;
 * - RETIRER un élément : il reste chez les élèves qui l'avaient reçu, disparaît
 *   ailleurs (la base supprime les liens non publiés) ;
 * - copier un fichier d'un propriétaire à l'autre (détacher, faire un modèle).
 *
 * ⚠️ Toutes ces fonctions passent par le client de la requête, donc SOUS RLS : la
 * policy « Teachers can manage content of their templates » et les règles de
 * stockage sur `templates/…` sont les gardes réelles. La RLS échoue en silence
 * (docs/pratiques/rls-echecs-silencieux.md) : chaque écriture relit ses lignes.
 *
 * @module server/template-content
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	TemplateContent,
	TemplateDocument,
	TemplateChecklistItem,
	TemplateExercise,
	TemplateWorksheet,
	TemplateSeries,
	TemplateSection
} from '$lib/types/chapter-templates';
import type { SectionContentKind } from './validation/chapter-sections';
import {
	CHAPTER_DOCUMENTS_BUCKET,
	newStoragePath,
	ownerStoragePrefix,
	type ContentOwner
} from './content-owner';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/template-content');

// Types
type Tables = Database['public']['Tables'];

/** Pourquoi une opération sur le contenu du modèle n'a pas abouti. */
export type TemplateContentErrorKind = 'not_found' | 'db';

export class TemplateContentError extends Error {
	readonly kind: TemplateContentErrorKind;

	constructor(kind: TemplateContentErrorKind, message: string) {
		super(message);
		this.name = 'TemplateContentError';
		this.kind = kind;
	}
}

/** Ce que le retrait a fait : `deleted` faux = l'élément reste, retiré (encore publié ailleurs). */
export interface RetireResult {
	deleted: boolean;
	fileRemoved: boolean;
}

// Constantes
/**
 * Correspondance FERMÉE entre un type d'élément et sa table. Le type vient du
 * client : il ne choisit jamais la table, il choisit une clé de cette liste.
 */
export const TEMPLATE_ELEMENT_TABLES = {
	document: 'chapter_documents',
	checklistItem: 'chapter_checklist_items',
	exercise: 'chapter_exercises',
	worksheet: 'chapter_worksheets',
	series: 'chapter_series'
} as const satisfies Record<SectionContentKind, keyof Tables>;

/** Code Postgres d'une clé étrangère violée : ici, le RESTRICT d'une ligne de lien. */
const FOREIGN_KEY_VIOLATION = '23503';

// Functions

/**
 * Le contenu d'un modèle : sections, puis éléments NON retirés, chacun trié dans
 * l'ordre du professeur.
 */
export async function listTemplateContent(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: TemplateContent | null; error: Error | null }> {
	const [sections, documents, checklistItems, exercises, worksheets, series] = await Promise.all([
		supabase
			.from('chapter_sections')
			.select('*')
			.eq('template_id', templateId)
			.order('display_order'),
		supabase
			.from('chapter_documents')
			.select('*')
			.eq('template_id', templateId)
			.is('retired_at', null)
			.order('display_order'),
		supabase
			.from('chapter_checklist_items')
			.select('*')
			.eq('template_id', templateId)
			.is('retired_at', null)
			.order('display_order'),
		supabase
			.from('chapter_exercises')
			.select('*')
			.eq('template_id', templateId)
			.is('retired_at', null)
			.order('display_order'),
		supabase
			.from('chapter_worksheets')
			.select('*')
			.eq('template_id', templateId)
			.is('retired_at', null)
			.order('display_order'),
		supabase
			.from('chapter_series')
			.select('*')
			.eq('template_id', templateId)
			.is('retired_at', null)
			.order('display_order')
	]);

	// Une lecture en échec ne doit pas passer pour « modèle vide » : le
	// professeur rajouterait ce qui y est déjà.
	const enEchec = [sections, documents, checklistItems, exercises, worksheets, series].find(
		(r) => r.error
	);
	if (enEchec?.error) {
		logger.error('[listTemplateContent] Contenu illisible :', enEchec.error);
		return { data: null, error: new Error(enEchec.error.message) };
	}

	return {
		data: {
			sections: (sections.data ?? []).map(toTemplateSection(templateId)),
			documents: (documents.data ?? []).map(toTemplateDocument(templateId)),
			checklistItems: (checklistItems.data ?? []).map(toTemplateChecklistItem(templateId)),
			exercises: (exercises.data ?? []).map(toTemplateExercise(templateId)),
			worksheets: (worksheets.data ?? []).map(toTemplateWorksheet(templateId)),
			series: (series.data ?? []).map(toTemplateSeries(templateId))
		},
		error: null
	};
}

/** Ce que compte un modèle, pour la liste et l'aperçu « Créer depuis un modèle ». */
export interface TemplateContentCounts {
	documentCount: number;
	checklistItemCount: number;
	exerciseCount: number;
	worksheetCount: number;
}

/** Des compteurs à zéro : un modèle sans élément. */
export const EMPTY_TEMPLATE_COUNTS: TemplateContentCounts = {
	documentCount: 0,
	checklistItemCount: 0,
	exerciseCount: 0,
	worksheetCount: 0
};

/**
 * Compte le contenu RÉEL (en tables, non retiré) de plusieurs modèles à la fois
 * — depuis l'ADR 0029, plus la photo `content_snapshot`, que l'éditeur ne
 * modifie pas. Un modèle sans aucun élément n'est pas dans la `Map` : lire avec
 * `EMPTY_TEMPLATE_COUNTS` en repli.
 *
 * Une lecture en échec rend une erreur, jamais des zéros : « 0 document » sur un
 * modèle qui en a quatre ferait croire à un modèle vide.
 */
export async function countTemplateContent(
	templateIds: string[],
	supabase: SupabaseClient<Database>
): Promise<{ data: Map<string, TemplateContentCounts> | null; error: Error | null }> {
	const counts = new Map<string, TemplateContentCounts>();
	if (templateIds.length === 0) return { data: counts, error: null };

	const compteurs = [
		['chapter_documents', 'documentCount'],
		['chapter_checklist_items', 'checklistItemCount'],
		['chapter_exercises', 'exerciseCount'],
		['chapter_worksheets', 'worksheetCount']
	] as const;

	const resultats = await Promise.all(
		compteurs.map(([table]) =>
			supabase
				.from(table)
				.select('template_id')
				.in('template_id', templateIds)
				.is('retired_at', null)
		)
	);

	for (const [i, { data, error }] of resultats.entries()) {
		const [table, cle] = compteurs[i];
		if (error) {
			logger.error(`[countTemplateContent] ${table} illisible :`, error);
			return { data: null, error: new Error(error.message) };
		}
		for (const row of data ?? []) {
			if (!row.template_id) continue;
			const actuel = counts.get(row.template_id) ?? { ...EMPTY_TEMPLATE_COUNTS };
			actuel[cle] += 1;
			counts.set(row.template_id, actuel);
		}
	}

	return { data: counts, error: null };
}

/**
 * Le modèle a-t-il au moins un élément non retiré (document, objectif,
 * exercice, fiche ou série) ? Une section seule ne fait pas un contenu : c'est
 * la règle de publication d'avant (`hasContent`), appliquée aux tables.
 */
export async function templateHasContent(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: boolean | null; error: Error | null }> {
	for (const table of Object.values(TEMPLATE_ELEMENT_TABLES)) {
		const { data, error } = await supabase
			.from(table)
			.select('id')
			.eq('template_id', templateId)
			.is('retired_at', null)
			.limit(1);

		if (error) {
			logger.error(`[templateHasContent] ${table} illisible :`, error);
			return { data: null, error: new Error(error.message) };
		}
		if ((data ?? []).length > 0) return { data: true, error: null };
	}
	return { data: false, error: null };
}

/**
 * Retire un élément du modèle (comportement 10 de la phase 0).
 *
 * 1. `retired_at` est posé : la base supprime aussitôt les lignes de lien NON
 *    publiées (déclencheur `modele_retrait`) ; les élèves qui l'avaient reçu le
 *    gardent.
 * 2. On tente alors de supprimer la ligne du modèle. Si un chapitre le relie
 *    encore (publié), la base refuse (`ON DELETE RESTRICT`) : l'élément RESTE,
 *    retiré, invisible dans l'éditeur du modèle.
 * 3. Le fichier d'un document n'est supprimé du stockage que si la ligne l'a été
 *    ET qu'aucune autre ligne ne désigne ce chemin.
 *
 * Rejouable : un élément déjà retiré repasse directement à l'étape 2.
 */
export async function retireTemplateElement(
	templateId: string,
	kind: SectionContentKind,
	itemId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: RetireResult | null; error: TemplateContentError | null }> {
	const table = Object.prototype.hasOwnProperty.call(TEMPLATE_ELEMENT_TABLES, kind)
		? TEMPLATE_ELEMENT_TABLES[kind]
		: undefined;
	if (!table) {
		return { data: null, error: new TemplateContentError('not_found', 'Type inconnu') };
	}

	const { data: element, error: readError } = await supabase
		.from(table)
		.select('id, retired_at')
		.eq('id', itemId)
		.eq('template_id', templateId)
		.maybeSingle();

	if (readError) {
		logger.error(`[retireTemplateElement] ${table} illisible :`, readError);
		return { data: null, error: new TemplateContentError('db', readError.message) };
	}
	if (!element) {
		return {
			data: null,
			error: new TemplateContentError('not_found', 'Élément introuvable dans ce modèle')
		};
	}

	// Le chemin du fichier n'existe que pour un document ; il se lit AVANT la
	// suppression, la ligne n'est plus lisible après.
	const fichier = kind === 'document' ? await readUploadedPath(itemId, supabase) : null;
	if (fichier?.error) return { data: null, error: fichier.error };

	if (element.retired_at === null) {
		const { data: retire, error: retireError } = await supabase
			.from(table)
			.update({ retired_at: new Date().toISOString() })
			.eq('id', itemId)
			.eq('template_id', templateId)
			.select('id');

		if (retireError) {
			logger.error(`[retireTemplateElement] Retrait impossible (${table}) :`, retireError);
			return { data: null, error: new TemplateContentError('db', retireError.message) };
		}
		if (!retire || retire.length !== 1) {
			return {
				data: null,
				error: new TemplateContentError('not_found', 'Élément introuvable dans ce modèle')
			};
		}
	}

	const { data: supprime, error: deleteError } = await supabase
		.from(table)
		.delete()
		.eq('id', itemId)
		.eq('template_id', templateId)
		.select('id');

	if (deleteError) {
		// Encore publié dans un chapitre : la base garde la ligne, et c'est voulu.
		if (deleteError.code === FOREIGN_KEY_VIOLATION) {
			return { data: { deleted: false, fileRemoved: false }, error: null };
		}
		logger.error(`[retireTemplateElement] Suppression impossible (${table}) :`, deleteError);
		return { data: null, error: new TemplateContentError('db', deleteError.message) };
	}
	if (!supprime || supprime.length !== 1) {
		// Zéro ligne sans erreur : refus silencieux. L'élément reste retiré.
		logger.error(`[retireTemplateElement] ${table} : aucune ligne supprimée pour ${itemId}`);
		return { data: { deleted: false, fileRemoved: false }, error: null };
	}

	// Le fichier n'est supprimé que s'il est rangé chez CE modèle : un chemin
	// d'ailleurs (copie, chapitre) n'est jamais à lui de le détruire.
	const chemin = fichier?.path ?? null;
	if (!chemin || !chemin.startsWith(ownerStoragePrefix({ kind: 'template', id: templateId }))) {
		return { data: { deleted: true, fileRemoved: false }, error: null };
	}

	const fileRemoved = await removeFileIfUnused(chemin, supabase);
	return { data: { deleted: true, fileRemoved }, error: null };
}

/**
 * Copie un fichier du bucket chez un autre propriétaire, avec les droits de
 * l'appelant (lecture de la source, écriture de la cible). Rend le chemin neuf.
 *
 * @param suffix - Distingue les copies faites dans la même milliseconde
 */
export async function copyStoredFile(
	fromPath: string,
	to: ContentOwner,
	suffix: string,
	supabase: SupabaseClient<Database>
): Promise<{ path: string | null; error: Error | null }> {
	const toPath = newStoragePath(to, fromPath, suffix);
	const { error } = await supabase.storage.from(CHAPTER_DOCUMENTS_BUCKET).copy(fromPath, toPath);

	if (error) {
		logger.error(`[copyStoredFile] Copie impossible ${fromPath} → ${toPath} :`, error);
		return { path: null, error: new Error(error.message) };
	}
	return { path: toPath, error: null };
}

/**
 * Supprime des fichiers du bucket, au mieux : une panne est tracée, pas
 * remontée (un fichier en trop est un déchet, pas une perte).
 */
export async function removeStoredFiles(
	paths: string[],
	supabase: SupabaseClient<Database>
): Promise<void> {
	if (paths.length === 0) return;
	const { data, error } = await supabase.storage.from(CHAPTER_DOCUMENTS_BUCKET).remove(paths);
	if (error) {
		logger.error('[removeStoredFiles] Suppression impossible :', error);
		return;
	}
	// Les règles de stockage échouent en silence, comme la RLS.
	if ((data ?? []).length !== paths.length) {
		logger.error(
			`[removeStoredFiles] ${(data ?? []).length} fichier(s) supprimé(s) sur ${paths.length}`
		);
	}
}

/** Le chemin du fichier d'un document téléversé, `null` pour un lien Drive. */
async function readUploadedPath(
	documentId: string,
	supabase: SupabaseClient<Database>
): Promise<{ path: string | null; error: TemplateContentError | null }> {
	const { data, error } = await supabase
		.from('chapter_documents')
		.select('source_type, storage_path')
		.eq('id', documentId)
		.maybeSingle();

	if (error) {
		logger.error('[readUploadedPath] Document illisible :', error);
		return { path: null, error: new TemplateContentError('db', error.message) };
	}
	return {
		path: data?.source_type === 'upload' ? (data.storage_path ?? null) : null,
		error: null
	};
}

/**
 * Supprime le fichier si plus AUCUNE ligne ne le désigne. Une lecture en échec
 * garde le fichier : dans le doute, on ne détruit pas.
 */
export async function removeFileIfUnused(
	path: string,
	supabase: SupabaseClient<Database>
): Promise<boolean> {
	const { data: autres, error } = await supabase
		.from('chapter_documents')
		.select('id')
		.eq('storage_path', path)
		.limit(1);

	if (error) {
		logger.error('[removeFileIfUnused] Références illisibles, fichier gardé :', error);
		return false;
	}
	if ((autres ?? []).length > 0) return false;

	const { data, error: removeError } = await supabase.storage
		.from(CHAPTER_DOCUMENTS_BUCKET)
		.remove([path]);
	if (removeError || (data ?? []).length !== 1) {
		logger.error(`[removeFileIfUnused] Fichier non supprimé ${path} :`, removeError);
		return false;
	}
	return true;
}

// Conversions (ligne → type d'application). Le propriétaire est le MODÈLE :
// pas de `publishedAt` ici, un élément du modèle n'est jamais publié.

function toTemplateSection(templateId: string) {
	return (r: Tables['chapter_sections']['Row']): TemplateSection => ({
		id: r.id,
		templateId,
		title: r.title,
		displayOrder: r.display_order,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	});
}

function toTemplateDocument(templateId: string) {
	return (r: Tables['chapter_documents']['Row']): TemplateDocument => ({
		id: r.id,
		templateId,
		title: r.title,
		description: r.description,
		sourceType: r.source_type === 'upload' ? 'upload' : 'google_drive',
		storagePath: r.storage_path,
		fileName: r.file_name,
		mimeType: r.mime_type,
		fileSize: r.file_size,
		googleFileId: r.google_file_id,
		googleDriveUrl: r.google_drive_url,
		thumbnailUrl: r.thumbnail_url,
		displayOrder: r.display_order,
		sectionId: r.section_id,
		sectionOrder: r.section_order,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	});
}

function toTemplateChecklistItem(templateId: string) {
	return (r: Tables['chapter_checklist_items']['Row']): TemplateChecklistItem => ({
		id: r.id,
		templateId,
		content: r.content,
		description: r.description,
		displayOrder: r.display_order,
		sectionId: r.section_id,
		sectionOrder: r.section_order,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	});
}

function toTemplateExercise(templateId: string) {
	return (r: Tables['chapter_exercises']['Row']): TemplateExercise => ({
		id: r.id,
		templateId,
		exerciseId: r.exercise_id,
		displayOrder: r.display_order,
		sectionId: r.section_id,
		sectionOrder: r.section_order,
		createdAt: r.created_at
	});
}

function toTemplateWorksheet(templateId: string) {
	return (r: Tables['chapter_worksheets']['Row']): TemplateWorksheet => ({
		id: r.id,
		templateId,
		worksheetId: r.worksheet_id,
		displayOrder: r.display_order,
		sectionId: r.section_id,
		sectionOrder: r.section_order,
		createdAt: r.created_at
	});
}

function toTemplateSeries(templateId: string) {
	return (r: Tables['chapter_series']['Row']): TemplateSeries => ({
		id: r.id,
		templateId,
		seriesId: r.series_id,
		form: r.form === 'interactive' ? 'interactive' : 'flash',
		displayOrder: r.display_order,
		sectionId: r.section_id,
		sectionOrder: r.section_order,
		createdAt: r.created_at
	});
}
