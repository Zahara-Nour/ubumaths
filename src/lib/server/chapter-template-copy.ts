/**
 * Copier le contenu d'un chapitre chez un modèle (ADR 0029)
 * ========================================================
 *
 * Aides partagées par « Faire un modèle » (`createTemplateFromChapter`) et par la
 * reprise des modèles à snapshot (`chapter-template-reprise.ts`) :
 *
 * - lire tout le contenu d'un chapitre ;
 * - le copier en lignes du modèle (fichiers copiés sous `templates/<id>/…`) ;
 * - faire ADOPTER à chaque ligne du chapitre sa copie (`source_id`) : même
 *   identifiant, même publication, contenu du modèle.
 *
 * Toutes passent par le client reçu (RLS du professeur, ou service pour la
 * reprise). Aucune dépendance aux modules virtuels de SvelteKit : un script
 * `tsx` peut l'importer.
 *
 * @module server/chapter-template-copy
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';
import { copyStoredFile } from './template-content';

const logger = createServerLogger('server/chapter-template-copy');

// Constantes et types
/** Les six tables de contenu qui portent des lignes de lien, sections EN DERNIER. */
export const LINKED_TABLES_SECTIONS_LAST = [
	'chapter_documents',
	'chapter_checklist_items',
	'chapter_exercises',
	'chapter_worksheets',
	'chapter_series',
	'chapter_sections'
] as const;

export type LinkedTable = (typeof LINKED_TABLES_SECTIONS_LAST)[number];

type ContentRow<T extends LinkedTable> = Database['public']['Tables'][T]['Row'];

/** Le contenu complet d'un chapitre, ligne par ligne, dans l'ordre du professeur. */
export interface ChapterContentRows {
	sections: ContentRow<'chapter_sections'>[];
	documents: ContentRow<'chapter_documents'>[];
	checklistItems: ContentRow<'chapter_checklist_items'>[];
	exercises: ContentRow<'chapter_exercises'>[];
	worksheets: ContentRow<'chapter_worksheets'>[];
	series: ContentRow<'chapter_series'>[];
}

/** Une ligne du chapitre et sa copie chez le modèle. Sections d'abord. */
export type ContentMapping = { table: LinkedTable; chapterRowId: string; templateRowId: string }[];

/** Lit tout le contenu d'un chapitre ; une table illisible fait tout échouer. */
export async function readChapterContent(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterContentRows | null; error: Error | null }> {
	const [sections, documents, checklistItems, exercises, worksheets, series] = await Promise.all([
		supabase
			.from('chapter_sections')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		supabase
			.from('chapter_documents')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		supabase
			.from('chapter_checklist_items')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		supabase
			.from('chapter_exercises')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		supabase
			.from('chapter_worksheets')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		supabase.from('chapter_series').select('*').eq('chapter_id', chapterId).order('display_order')
	]);

	const enEchec = [sections, documents, checklistItems, exercises, worksheets, series].find(
		(r) => r.error
	);
	if (enEchec?.error) {
		logger.error('[readChapterContent] Contenu illisible :', enEchec.error);
		return { data: null, error: new Error(enEchec.error.message) };
	}

	return {
		data: {
			sections: sections.data ?? [],
			documents: documents.data ?? [],
			checklistItems: checklistItems.data ?? [],
			exercises: exercises.data ?? [],
			worksheets: worksheets.data ?? [],
			series: series.data ?? []
		},
		error: null
	};
}

/**
 * Copie le contenu d'un chapitre en lignes du modèle : sections d'abord (leurs
 * identifiants neufs rangent les éléments), puis les cinq types. Les fichiers
 * téléversés sont copiés sous `templates/<id>/…`. Ni publication ni masquage :
 * un élément du modèle n'est jamais publié.
 *
 * Rend la correspondance chapitre → modèle, et les fichiers copiés (à supprimer
 * si l'appelant renonce).
 */
export async function copyContentToTemplate(
	rows: ChapterContentRows,
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: ContentMapping | null; error: Error | null; copiedFiles: string[] }> {
	const owner = { kind: 'template', id: templateId } as const;
	const mapping: ContentMapping = [];
	const copiedFiles: string[] = [];
	const sections = new Map<string, string>();
	const echec = (error: Error) => ({ data: null, error, copiedFiles });

	/** Enregistre une copie, ou rend l'erreur qui l'a empêchée. */
	const enregistrer = async (
		table: LinkedTable,
		chapterRowId: string,
		insertion: PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>
	): Promise<Error | null> => {
		const { data, error } = await insertion;
		if (error || !data) {
			logger.error(`[copyContentToTemplate] ${table} non copié :`, error);
			return new Error(error?.message ?? `${table} : copie refusée`);
		}
		mapping.push({ table, chapterRowId, templateRowId: data.id });
		if (table === 'chapter_sections') sections.set(chapterRowId, data.id);
		return null;
	};
	const section = (id: string | null) => (id ? (sections.get(id) ?? null) : null);

	for (const s of rows.sections) {
		const e = await enregistrer(
			'chapter_sections',
			s.id,
			supabase
				.from('chapter_sections')
				.insert({ template_id: templateId, title: s.title, display_order: s.display_order })
				.select('id')
				.single()
		);
		if (e) return echec(e);
	}

	// Ce que le chapitre a MASQUÉ (« pas cette année ») n'entre pas dans le modèle.
	const visibles = <T extends { hidden: boolean }>(lignes: T[]) => lignes.filter((l) => !l.hidden);

	for (const [rang, d] of visibles(rows.documents).entries()) {
		let storagePath = d.storage_path;
		if (d.source_type === 'upload' && d.storage_path) {
			const { path, error } = await copyStoredFile(d.storage_path, owner, String(rang), supabase);
			if (error || !path) return echec(error ?? new Error('Copie du fichier impossible'));
			copiedFiles.push(path);
			storagePath = path;
		}
		const e = await enregistrer(
			'chapter_documents',
			d.id,
			supabase
				.from('chapter_documents')
				.insert({
					template_id: templateId,
					title: d.title,
					description: d.description,
					source_type: d.source_type,
					storage_path: storagePath,
					file_name: d.file_name,
					file_size: d.file_size,
					mime_type: d.mime_type,
					google_drive_url: d.google_drive_url,
					google_file_id: d.google_file_id,
					thumbnail_url: d.thumbnail_url,
					display_order: d.display_order,
					section_id: section(d.section_id),
					section_order: d.section_order
				})
				.select('id')
				.single()
		);
		if (e) return echec(e);
	}

	for (const c of visibles(rows.checklistItems)) {
		const e = await enregistrer(
			'chapter_checklist_items',
			c.id,
			supabase
				.from('chapter_checklist_items')
				.insert({
					template_id: templateId,
					content: c.content,
					description: c.description,
					display_order: c.display_order,
					section_id: section(c.section_id),
					section_order: c.section_order
				})
				.select('id')
				.single()
		);
		if (e) return echec(e);
	}

	for (const x of visibles(rows.exercises)) {
		const e = await enregistrer(
			'chapter_exercises',
			x.id,
			supabase
				.from('chapter_exercises')
				.insert({
					template_id: templateId,
					exercise_id: x.exercise_id,
					display_order: x.display_order,
					section_id: section(x.section_id),
					section_order: x.section_order
				})
				.select('id')
				.single()
		);
		if (e) return echec(e);
	}

	for (const w of visibles(rows.worksheets)) {
		const e = await enregistrer(
			'chapter_worksheets',
			w.id,
			supabase
				.from('chapter_worksheets')
				.insert({
					template_id: templateId,
					worksheet_id: w.worksheet_id,
					display_order: w.display_order,
					section_id: section(w.section_id),
					section_order: w.section_order
				})
				.select('id')
				.single()
		);
		if (e) return echec(e);
	}

	for (const r of visibles(rows.series)) {
		const e = await enregistrer(
			'chapter_series',
			r.id,
			supabase
				.from('chapter_series')
				.insert({
					template_id: templateId,
					series_id: r.series_id,
					form: r.form,
					display_order: r.display_order,
					section_id: section(r.section_id),
					section_order: r.section_order
				})
				.select('id')
				.single()
		);
		if (e) return echec(e);
	}

	return { data: mapping, error: null, copiedFiles };
}

/**
 * Chaque ligne du chapitre ADOPTE sa copie chez le modèle (`source_id`), dans
 * l'ordre de la correspondance (sections d'abord). La base reprend le contenu
 * du modèle et garde l'identifiant, l'ordre, la section et la publication du
 * chapitre. Le chapitre doit déjà être lié (non détaché) au modèle : sinon la
 * garde `modele_lien_garde` refuse.
 *
 * @returns Les éléments que le chapitre n'a pas pu adopter (tracés)
 */
export async function adoptMappedRows(
	chapterId: string,
	mapping: ContentMapping,
	supabase: SupabaseClient<Database>
): Promise<ContentMapping> {
	const echecs: ContentMapping = [];
	for (const m of mapping) {
		const { data, error } = await supabase
			.from(m.table)
			.update({ source_id: m.templateRowId })
			.eq('id', m.chapterRowId)
			.eq('chapter_id', chapterId)
			.select('id');
		// La RLS échoue en silence : une ligne non rendue n'a pas été adoptée.
		if (error || !data || data.length !== 1) {
			logger.error(`[adoptMappedRows] ${m.table} ${m.chapterRowId} non adopté :`, error);
			echecs.push(m);
		}
	}
	return echecs;
}
