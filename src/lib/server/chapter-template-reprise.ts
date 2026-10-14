/**
 * Reprise des modèles à snapshot (ADR 0029, étape 4)
 * ===================================================
 *
 * Avant l'ADR 0029, un modèle ne gardait de son contenu qu'une photo
 * (`content_snapshot`), dont les documents téléversés n'étaient que des adresses
 * `storage://chapters/<chapitre d'origine>/…`. Cette reprise donne au modèle son
 * contenu EN TABLES, à partir du chapitre d'origine (source), sans qu'un élève
 * perde l'accès à un document publié, à aucun instant :
 *
 * 1. refus si le modèle possède déjà du contenu en tables (rejouable : « rien à
 *    faire », vérification seule) ;
 * 2. vérifications EN TÊTE, avant toute écriture : chapitre source lié au modèle,
 *    fichiers présents, aucun faux lien `storage://` publié dans un autre chapitre ;
 * 3. les chapitres liés sont marqués TEMPORAIREMENT détachés (sinon insérer une
 *    ligne du modèle diffuserait un lien dans chacun, en double de la suite), le
 *    contenu du chapitre source est copié chez le modèle (fichiers COPIÉS sous
 *    `templates/<id>/…`, l'original `chapters/…` n'est jamais touché), puis les
 *    chapitres sont rattachés — dans un `finally` : une erreur les rattache quand
 *    même ;
 * 4. les lignes du chapitre source ADOPTENT leur copie : mêmes identifiants, même
 *    `published_at`, le chemin de fichier pointe la copie du modèle ;
 * 5. chaque autre chapitre lié perd ses faux liens (non publiés), reçoit les liens
 *    du modèle (`link_chapter_to_template`, non publiés), puis perd ses sections
 *    semées restées vides ;
 * 6. vérification finale : documents publiés toujours publiés aux mêmes dates,
 *    fichiers réellement téléchargeables, liens présents, plus aucun `storage://`.
 *
 * `dryRun` n'écrit RIEN (ni base, ni stockage) et décrit ce qui serait fait.
 *
 * ⚠️ Prévue pour le client SERVICE (script `scripts/reprise-modeles-adr0029.ts`) :
 * la RLS ne garde rien ici, chaque écriture relit donc ses lignes (la RLS et les
 * déclencheurs échouent en silence, docs/pratiques/rls-echecs-silencieux.md).
 * Aucune dépendance aux modules virtuels de SvelteKit : importable par `tsx`.
 *
 * @module server/chapter-template-reprise
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';
import { CHAPTER_DOCUMENTS_BUCKET, extensionOf, ownerStoragePrefix } from './content-owner';
import { removeStoredFiles } from './template-content';
import {
	LINKED_TABLES_SECTIONS_LAST,
	adoptMappedRows,
	copyContentToTemplate,
	readChapterContent,
	type ChapterContentRows,
	type ContentMapping
} from './chapter-template-copy';

const logger = createServerLogger('server/chapter-template-reprise');

// Types
type DocumentRow = Database['public']['Tables']['chapter_documents']['Row'];
type Client = SupabaseClient<Database>;

/** Ce que la reprise a fait (ou ferait), en français, ligne par ligne. */
export interface RepriseReport {
	outcome: 'dry_run' | 'done' | 'nothing_to_do';
	lines: string[];
	verification: { ok: boolean; lines: string[] };
}

/** Une reprise arrêtée : le message dit pourquoi, `lines` ce qui a été fait avant. */
export class RepriseError extends Error {
	readonly lines: string[];

	constructor(message: string, lines: string[] = []) {
		super(message);
		this.name = 'RepriseError';
		this.lines = lines;
	}
}

/** Un document publié du chapitre source, tel qu'il était AVANT la reprise. */
interface PublishedBefore {
	id: string;
	title: string;
	publishedAt: string;
}

/** Ce que la reprise fera dans un autre chapitre lié. */
interface OtherChapterPlan {
	chapterId: string;
	fakeLinks: DocumentRow[];
}

// Constantes
const FAKE_LINK_PREFIX = 'storage://';
/** Les deux identifiants entrent dans des filtres PostgREST : des UUID, rien d'autre. */
const idsSchema = z.object({ templateId: z.string().uuid(), sourceChapterId: z.string().uuid() });
const ELEMENT_TABLES = LINKED_TABLES_SECTIONS_LAST.filter((t) => t !== 'chapter_sections');

// Functions

/**
 * Reprend un modèle à snapshot : son contenu passe en tables, copié du chapitre
 * source ; ses chapitres liés relient ce contenu. Voir l'en-tête du module.
 *
 * @param templateId - Le modèle à reprendre
 * @param sourceChapterId - Le chapitre d'origine, déjà lié (non détaché) au modèle
 * @param supabase - Client SERVICE (la reprise touche les chapitres de toutes les classes)
 * @param options - `dryRun` : ne rien écrire, décrire
 */
export async function migrateSnapshotTemplate(
	templateId: string,
	sourceChapterId: string,
	supabase: Client,
	options: { dryRun: boolean }
): Promise<{ data: RepriseReport | null; error: RepriseError | null }> {
	const lines: string[] = [];
	const stop = (message: string) => ({ data: null, error: new RepriseError(message, lines) });

	const ids = idsSchema.safeParse({ templateId, sourceChapterId });
	if (!ids.success) return stop(`Identifiant invalide : ${ids.error.issues[0].message}`);

	try {
		// --- 1. Le modèle, et son contenu en tables -------------------------------
		const { data: template, error: templateError } = await supabase
			.from('chapter_templates')
			.select('id, title, status, content_snapshot')
			.eq('id', templateId)
			.maybeSingle();
		if (templateError) return stop(`Modèle illisible : ${templateError.message}`);
		if (!template) return stop(`Modèle introuvable : ${templateId}`);
		lines.push(`Modèle « ${template.title} » (${templateId}), statut ${template.status}.`);

		const owned = await countTemplateRows(templateId, supabase);
		if (owned.error) return stop(owned.error);
		if (owned.total > 0) {
			lines.push(
				`Le modèle possède déjà ${owned.total} ligne(s) en tables : RIEN À FAIRE (reprise déjà passée).`
			);
			const verification = await verifyReprise(templateId, sourceChapterId, null, supabase);
			return { data: { outcome: 'nothing_to_do', lines, verification }, error: null };
		}

		// --- 2. Vérifications en tête : rien n'est écrit si l'une échoue ----------
		const { data: insts, error: instError } = await supabase
			.from('chapter_template_instantiations')
			.select('id, chapter_id, is_detached')
			.eq('template_id', templateId);
		if (instError) return stop(`Chapitres liés illisibles : ${instError.message}`);
		const linked = (insts ?? []).filter((i) => !i.is_detached);
		if (!linked.some((i) => i.chapter_id === sourceChapterId)) {
			return stop(
				`Le chapitre source ${sourceChapterId} n'est pas un chapitre lié (non détaché) de ce modèle.`
			);
		}
		const others = linked.filter((i) => i.chapter_id !== sourceChapterId);

		const contenu = await readChapterContent(sourceChapterId, supabase);
		if (contenu.error || !contenu.data) {
			return stop(`Contenu du chapitre source illisible : ${contenu.error?.message ?? '?'}`);
		}
		const source = contenu.data;
		const preflight = await checkSource(source, supabase);
		if (preflight) return stop(preflight);

		const plans: OtherChapterPlan[] = [];
		for (const other of others) {
			const { data: docs, error } = await supabase
				.from('chapter_documents')
				.select('*')
				.eq('chapter_id', other.chapter_id)
				.is('source_id', null)
				.like('google_drive_url', `${FAKE_LINK_PREFIX}%`);
			if (error) {
				return stop(`Documents du chapitre ${other.chapter_id} illisibles : ${error.message}`);
			}
			const publies = (docs ?? []).filter((d) => d.published_at !== null);
			if (publies.length > 0) {
				return stop(
					`Le chapitre ${other.chapter_id} a ${publies.length} faux lien(s) storage:// publié(s) ` +
						`(${publies.map((d) => `« ${d.title} »`).join(', ')}) : des élèves les voient, ` +
						`la reprise ne les supprime pas. Arrêt, rien n'a été écrit.`
				);
			}
			plans.push({ chapterId: other.chapter_id, fakeLinks: docs ?? [] });
		}

		const publishedBefore: PublishedBefore[] = source.documents
			.filter((d) => d.published_at !== null)
			.map((d) => ({ id: d.id, title: d.title, publishedAt: d.published_at as string }));

		describePlan(template.content_snapshot, templateId, sourceChapterId, source, plans, lines);

		if (options.dryRun) {
			lines.push('', 'ESSAI : rien n’a été écrit (ni base, ni stockage).');
			const verification = await verifySourceFilesNow(source, supabase);
			return { data: { outcome: 'dry_run', lines, verification }, error: null };
		}

		// --- 3. Copie chez le modèle, chapitres liés détachés le temps de la copie --
		lines.push('', 'APPLICATION');
		const copie = await copyWhileDetached(
			linked.map((i) => i.id),
			source,
			templateId,
			supabase,
			lines
		);
		if (copie.error || !copie.mapping) return stop(copie.error ?? 'Copie impossible');

		// --- 4. Le chapitre source adopte sa copie ---------------------------------
		const nonAdoptes = await adoptMappedRows(sourceChapterId, copie.mapping, supabase);
		if (nonAdoptes.length > 0) {
			return stop(
				`${nonAdoptes.length} ligne(s) du chapitre source non adoptée(s) : ` +
					nonAdoptes.map((m) => `${m.table} ${m.chapterRowId}`).join(', ')
			);
		}
		lines.push(
			`  ✓ ${copie.mapping.length} ligne(s) du chapitre source adoptée(s) (mêmes identifiants)`
		);

		// --- 5. Les autres chapitres liés -----------------------------------------
		for (const plan of plans) {
			const err = await repairOtherChapter(plan, templateId, supabase, lines);
			if (err) return stop(err);
		}

		// --- 6. Vérification -------------------------------------------------------
		const verification = await verifyReprise(
			templateId,
			sourceChapterId,
			publishedBefore,
			supabase
		);
		return { data: { outcome: 'done', lines, verification }, error: null };
	} catch (err) {
		logger.error('[migrateSnapshotTemplate] Erreur inattendue :', err);
		return stop(`Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`);
	}
}

/**
 * Détache temporairement les chapitres liés, copie le contenu chez le modèle,
 * puis les RATTACHE, quoi qu'il arrive (`finally`). Une copie ratée est défaite :
 * le modèle redevient vide, comme avant.
 */
async function copyWhileDetached(
	instantiationIds: string[],
	source: ChapterContentRows,
	templateId: string,
	supabase: Client,
	lines: string[]
): Promise<{ mapping: ContentMapping | null; error: string | null }> {
	let mapping: ContentMapping | null = null;
	let error: string | null = null;

	const { data: detached, error: detachError } = await supabase
		.from('chapter_template_instantiations')
		.update({ is_detached: true })
		.in('id', instantiationIds)
		.eq('is_detached', false)
		.select('id');

	try {
		if (detachError || (detached ?? []).length !== instantiationIds.length) {
			error =
				`Détachement temporaire incomplet (${(detached ?? []).length}/${instantiationIds.length}) : ` +
				(detachError?.message ?? 'lignes non rendues');
		} else {
			lines.push(
				`  ✓ ${instantiationIds.length} chapitre(s) lié(s) détaché(s) le temps de la copie`
			);
			const copie = await copyContentToTemplate(source, templateId, supabase);
			if (copie.error || !copie.data) {
				error = `Copie chez le modèle impossible : ${copie.error?.message ?? '?'}`;
				await undoTemplateCopy(templateId, copie.copiedFiles, supabase, lines);
			} else {
				mapping = copie.data;
				lines.push(
					`  ✓ ${copie.data.length} ligne(s) copiée(s) chez le modèle, ` +
						`${copie.copiedFiles.length} fichier(s) copié(s) sous templates/${templateId}/`
				);
			}
		}
	} finally {
		// Toujours : un chapitre resté « détaché » ne suivrait plus son modèle.
		const { data: restored, error: restoreError } = await supabase
			.from('chapter_template_instantiations')
			.update({ is_detached: false })
			.in('id', instantiationIds)
			.select('id');
		if (restoreError || (restored ?? []).length !== instantiationIds.length) {
			const msg =
				`⚠️ RATTACHEMENT INCOMPLET (${(restored ?? []).length}/${instantiationIds.length}) : ` +
				`${restoreError?.message ?? 'lignes non rendues'} — remettre is_detached = false ` +
				`sur chapter_template_instantiations ${instantiationIds.join(', ')}`;
			logger.error(`[copyWhileDetached] ${msg}`);
			lines.push(`  ${msg}`);
			error = error ?? msg;
		} else {
			lines.push(`  ✓ ${instantiationIds.length} chapitre(s) lié(s) rattaché(s)`);
		}
	}
	return { mapping: error ? null : mapping, error };
}

/** Lignes du modèle, toutes tables confondues (retirées comprises). */
async function countTemplateRows(
	templateId: string,
	supabase: Client
): Promise<{ total: number; parTable: Record<string, number>; error: string | null }> {
	const parTable: Record<string, number> = {};
	let total = 0;
	for (const table of LINKED_TABLES_SECTIONS_LAST) {
		const { count, error } = await supabase
			.from(table)
			.select('id', { count: 'exact', head: true })
			.eq('template_id', templateId);
		if (error) return { total: 0, parTable, error: `${table} illisible : ${error.message}` };
		parTable[table] = count ?? 0;
		total += count ?? 0;
	}
	return { total, parTable, error: null };
}

/** Le chapitre source est-il repris tel quel ? Rend la raison du refus, ou `null`. */
async function checkSource(source: ChapterContentRows, supabase: Client): Promise<string | null> {
	const toutes = [
		...source.sections,
		...source.documents,
		...source.checklistItems,
		...source.exercises,
		...source.worksheets,
		...source.series
	];
	if (toutes.some((r) => r.source_id !== null)) {
		return 'Le chapitre source relie déjà des éléments d’un modèle : état inattendu, arrêt.';
	}
	const faux = source.documents.filter((d) => d.google_drive_url?.startsWith(FAKE_LINK_PREFIX));
	if (faux.length > 0) {
		return `Le chapitre source porte ${faux.length} faux lien(s) storage:// : ils seraient copiés chez le modèle. Arrêt.`;
	}
	for (const d of source.documents.filter((x) => x.source_type === 'upload' && !x.hidden)) {
		if (!d.storage_path) return `Document « ${d.title} » (${d.id}) téléversé sans fichier. Arrêt.`;
		if (!(await downloads(d.storage_path, supabase))) {
			return `Fichier introuvable pour « ${d.title} » : ${d.storage_path}. Arrêt.`;
		}
	}
	return null;
}

/** Décrit, avant d'agir, exactement ce que la reprise va faire. */
function describePlan(
	snapshot: unknown,
	templateId: string,
	sourceChapterId: string,
	source: ChapterContentRows,
	plans: OtherChapterPlan[],
	lines: string[]
): void {
	const visibles = <T extends { hidden: boolean }>(r: T[]) => r.filter((x) => !x.hidden);
	const docs = visibles(source.documents);
	const snapDocs = snapshotDocumentCount(snapshot);

	lines.push('', `Chapitre source ${sourceChapterId} :`);
	lines.push(
		`  ${source.sections.length} section(s), ${docs.length} document(s), ` +
			`${visibles(source.checklistItems).length} objectif(s), ${visibles(source.exercises).length} exercice(s), ` +
			`${visibles(source.worksheets).length} fiche(s), ${visibles(source.series).length} série(s) à copier chez le modèle`
	);
	if (snapDocs !== null && snapDocs !== docs.length) {
		lines.push(
			`  ⚠️ le snapshot du modèle compte ${snapDocs} document(s), le chapitre source ${docs.length} : c'est le chapitre qui fait foi`
		);
	}
	const prefixe = ownerStoragePrefix({ kind: 'template', id: templateId });
	for (const [rang, d] of docs.entries()) {
		const etat = d.published_at ? `publié le ${d.published_at}` : 'non publié';
		lines.push(`  • « ${d.title} » (${d.id}), ${etat}`);
		if (d.source_type === 'upload' && d.storage_path) {
			lines.push(
				`      fichier ${d.storage_path} → COPIE ${prefixe}<horodatage>-${rang}.${extensionOf(d.storage_path)} (original gardé)`
			);
		}
	}
	const caches = source.documents.length - docs.length;
	if (caches > 0) lines.push(`  ${caches} document(s) masqué(s) : restent propres au chapitre`);
	lines.push(
		'  Chaque ligne ADOPTE sa copie : même identifiant, même date de publication, même section.'
	);

	for (const p of plans) {
		lines.push('', `Chapitre lié ${p.chapterId} :`);
		lines.push(`  ${p.fakeLinks.length} faux lien(s) storage:// non publié(s) à supprimer :`);
		for (const d of p.fakeLinks) lines.push(`  • « ${d.title} » (${d.id}) ${d.google_drive_url}`);
		lines.push(
			`  puis relié au modèle : ${source.sections.length} section(s) et ${docs.length} document(s) ` +
				'(et les autres éléments) en liens NON publiés ; sections semées restées vides supprimées'
		);
	}
	if (plans.length === 0) lines.push('', 'Aucun autre chapitre lié.');
}

/** Le nombre de documents du snapshot, `null` s'il n'a pas la forme attendue. */
function snapshotDocumentCount(snapshot: unknown): number | null {
	if (typeof snapshot !== 'object' || snapshot === null) return null;
	const docs = (snapshot as { documents?: unknown }).documents;
	return Array.isArray(docs) ? docs.length : null;
}

/** Copie ratée : le modèle redevient vide (il l'était), fichiers copiés compris. */
async function undoTemplateCopy(
	templateId: string,
	copiedFiles: string[],
	supabase: Client,
	lines: string[]
): Promise<void> {
	for (const table of LINKED_TABLES_SECTIONS_LAST) {
		const { error } = await supabase
			.from(table)
			.delete()
			.eq('template_id', templateId)
			.select('id');
		if (error) {
			logger.error(`[undoTemplateCopy] ${table} :`, error);
			lines.push(`  ⚠️ lignes ${table} du modèle non supprimées : ${error.message}`);
		}
	}
	await removeStoredFiles(copiedFiles, supabase);
	lines.push('  ↩ copie annulée : lignes et fichiers copiés chez le modèle supprimés');
}

/**
 * Un autre chapitre lié : faux liens supprimés (non publiés, vérifié en tête et
 * re-filtré ici), liens du modèle posés, sections semées restées vides retirées.
 */
async function repairOtherChapter(
	plan: OtherChapterPlan,
	templateId: string,
	supabase: Client,
	lines: string[]
): Promise<string | null> {
	const ids = plan.fakeLinks.map((d) => d.id);
	if (ids.length > 0) {
		const { data, error } = await supabase
			.from('chapter_documents')
			.delete()
			.in('id', ids)
			.eq('chapter_id', plan.chapterId)
			.is('published_at', null)
			.is('source_id', null)
			.like('google_drive_url', `${FAKE_LINK_PREFIX}%`)
			.select('id');
		if (error || (data ?? []).length !== ids.length) {
			return (
				`Chapitre ${plan.chapterId} : ${(data ?? []).length}/${ids.length} faux lien(s) supprimé(s) — ` +
				(error?.message ?? 'lignes non rendues')
			);
		}
		lines.push(`  ✓ chapitre ${plan.chapterId} : ${ids.length} faux lien(s) supprimé(s)`);
	}

	const { error: linkError } = await supabase.rpc('link_chapter_to_template', {
		p_chapter_id: plan.chapterId,
		p_template_id: templateId
	});
	if (linkError) {
		return `Chapitre ${plan.chapterId} : lien au modèle impossible — ${linkError.message}`;
	}

	const manquants = await missingLinks(plan.chapterId, templateId, supabase);
	if (manquants.error) return manquants.error;
	if (manquants.count > 0) {
		return `Chapitre ${plan.chapterId} : ${manquants.count} élément(s) du modèle sans lien après link_chapter_to_template`;
	}
	lines.push(`  ✓ chapitre ${plan.chapterId} : relié au modèle (liens non publiés)`);

	const vides = await emptyOwnSections(plan.chapterId, supabase);
	if (vides.error) return vides.error;
	if (vides.ids.length > 0) {
		const { data, error } = await supabase
			.from('chapter_sections')
			.delete()
			.in('id', vides.ids)
			.eq('chapter_id', plan.chapterId)
			.is('source_id', null)
			.select('id');
		if (error || (data ?? []).length !== vides.ids.length) {
			// Pas bloquant : au pire, des sections vides de trop dans le plan du prof.
			lines.push(
				`  ⚠️ chapitre ${plan.chapterId} : ${(data ?? []).length}/${vides.ids.length} section(s) semée(s) supprimée(s)`
			);
		} else {
			lines.push(
				`  ✓ chapitre ${plan.chapterId} : ${vides.ids.length} section(s) semée(s) vide(s) supprimée(s)`
			);
		}
	}
	return null;
}

/**
 * Les sections PROPRES au chapitre (non liées) qui ne rangent rien — les six
 * semées à la création — quand le chapitre a reçu le plan du modèle. Même règle
 * que l'instanciation : sans section liée, on ne retire rien.
 */
async function emptyOwnSections(
	chapterId: string,
	supabase: Client
): Promise<{ ids: string[]; error: string | null }> {
	const { data: sections, error } = await supabase
		.from('chapter_sections')
		.select('id, source_id')
		.eq('chapter_id', chapterId);
	if (error) return { ids: [], error: `Sections de ${chapterId} illisibles : ${error.message}` };
	if (!(sections ?? []).some((s) => s.source_id !== null)) return { ids: [], error: null };

	const utilisees = new Set<string>();
	for (const table of ELEMENT_TABLES) {
		const { data, error: e } = await supabase
			.from(table)
			.select('section_id')
			.eq('chapter_id', chapterId)
			.not('section_id', 'is', null);
		if (e) return { ids: [], error: `${table} de ${chapterId} illisible : ${e.message}` };
		for (const r of data ?? []) if (r.section_id) utilisees.add(r.section_id);
	}
	return {
		ids: (sections ?? [])
			.filter((s) => s.source_id === null && !utilisees.has(s.id))
			.map((s) => s.id),
		error: null
	};
}

/** Éléments actifs du modèle (sections comprises) sans ligne de lien dans ce chapitre. */
async function missingLinks(
	chapterId: string,
	templateId: string,
	supabase: Client
): Promise<{ count: number; error: string | null }> {
	let count = 0;
	for (const table of LINKED_TABLES_SECTIONS_LAST) {
		const base = supabase.from(table).select('id').eq('template_id', templateId);
		const { data: elements, error } =
			table === 'chapter_sections' ? await base : await base.is('retired_at', null);
		if (error) return { count: 0, error: `${table} du modèle illisible : ${error.message}` };
		const ids = (elements ?? []).map((e) => e.id);
		if (ids.length === 0) continue;
		const { data: liens, error: e2 } = await supabase
			.from(table)
			.select('source_id')
			.eq('chapter_id', chapterId)
			.in('source_id', ids);
		if (e2) return { count: 0, error: `${table} de ${chapterId} illisible : ${e2.message}` };
		count += ids.length - (liens ?? []).length;
	}
	return { count, error: null };
}

/** Le fichier existe-t-il, non vide, dans le bucket ? (téléchargement réel) */
async function downloads(path: string, supabase: Client): Promise<boolean> {
	const { data, error } = await supabase.storage.from(CHAPTER_DOCUMENTS_BUCKET).download(path);
	return !error && data !== null && data.size > 0;
}

/** Avant toute écriture : chaque document publié du chapitre source a son fichier. */
async function verifySourceFilesNow(
	source: ChapterContentRows,
	supabase: Client
): Promise<RepriseReport['verification']> {
	const lines: string[] = ['État actuel (avant reprise) :'];
	let ok = true;
	for (const d of source.documents.filter((x) => x.published_at !== null)) {
		const lisible =
			d.source_type !== 'upload' ||
			(!!d.storage_path && (await downloads(d.storage_path, supabase)));
		ok &&= lisible;
		lines.push(
			`  ${lisible ? '✓' : '✗'} « ${d.title} » publié, fichier ${d.storage_path ?? '(aucun)'} ${lisible ? 'téléchargé' : 'ILLISIBLE'}`
		);
	}
	return { ok, lines };
}

/**
 * La reprise a-t-elle tenu ses promesses ? Chaque constat est imprimé.
 *
 * @param publishedBefore - Les documents publiés avant la reprise (`null` : relecture
 *   d'une reprise passée, on vérifie les documents publiés actuels)
 */
async function verifyReprise(
	templateId: string,
	sourceChapterId: string,
	publishedBefore: PublishedBefore[] | null,
	supabase: Client
): Promise<RepriseReport['verification']> {
	const lines: string[] = ['Vérification :'];
	let ok = true;
	const constat = (vrai: boolean, texte: string) => {
		ok &&= vrai;
		lines.push(`  ${vrai ? '✓' : '✗'} ${texte}`);
	};

	const modele = await countTemplateRows(templateId, supabase);
	constat(
		!modele.error && modele.total > 0,
		`le modèle possède ${modele.total} ligne(s) : ` +
			Object.entries(modele.parTable)
				.filter(([, n]) => n > 0)
				.map(([t, n]) => `${n} ${t}`)
				.join(', ')
	);

	const { data: insts, error: instError } = await supabase
		.from('chapter_template_instantiations')
		.select('chapter_id, is_detached')
		.eq('template_id', templateId);
	if (instError) {
		constat(false, `chapitres liés illisibles : ${instError.message}`);
		return { ok, lines };
	}
	const lienSource = (insts ?? []).find((i) => i.chapter_id === sourceChapterId);
	constat(
		!!lienSource && !lienSource.is_detached,
		'le chapitre source est lié au modèle (non détaché)'
	);

	// Le chapitre source : chaque document publié l'est toujours, aux mêmes dates, fichier lisible.
	const { data: docs, error } = await supabase
		.from('chapter_documents')
		.select('*')
		.eq('chapter_id', sourceChapterId);
	if (error) {
		constat(false, `documents du chapitre source illisibles : ${error.message}`);
		return { ok, lines };
	}
	const parId = new Map((docs ?? []).map((d) => [d.id, d]));
	const attendus: PublishedBefore[] =
		publishedBefore ??
		(docs ?? [])
			.filter((d) => d.published_at !== null)
			.map((d) => ({ id: d.id, title: d.title, publishedAt: d.published_at as string }));
	const prefixe = ownerStoragePrefix({ kind: 'template', id: templateId });
	for (const avant of attendus) {
		const d = parId.get(avant.id);
		if (!d) {
			constat(false, `« ${avant.title} » (${avant.id}) a DISPARU du chapitre source`);
			continue;
		}
		const memeDate =
			d.published_at !== null &&
			new Date(d.published_at).getTime() === new Date(avant.publishedAt).getTime();
		const fichier =
			d.source_type !== 'upload' ||
			(!!d.storage_path &&
				d.storage_path.startsWith(prefixe) &&
				(await downloads(d.storage_path, supabase)));
		constat(
			memeDate && d.source_id !== null && fichier,
			`« ${d.title} » (${d.id}) : publié le ${d.published_at ?? 'JAMAIS'}` +
				`${memeDate ? '' : ` (avant : ${avant.publishedAt})`}, ` +
				`${d.source_id ? 'relie le modèle' : 'NON RELIÉ'}, ` +
				`fichier ${d.storage_path ?? '(aucun)'} ${fichier ? 'téléchargé' : 'ILLISIBLE'}`
		);
	}

	// Les autres chapitres liés : tous les éléments du modèle reliés (non publiés juste après).
	const autres = (insts ?? []).filter((i) => !i.is_detached && i.chapter_id !== sourceChapterId);
	for (const autre of autres) {
		const manquants = await missingLinks(autre.chapter_id, templateId, supabase);
		const { data: liens, error: liensError } = await supabase
			.from('chapter_documents')
			.select('id, published_at')
			.eq('chapter_id', autre.chapter_id)
			.not('source_id', 'is', null);
		const publies = (liens ?? []).filter((l) => l.published_at !== null).length;
		constat(
			!manquants.error &&
				!liensError &&
				manquants.count === 0 &&
				(publishedBefore === null || publies === 0),
			`chapitre lié ${autre.chapter_id} : ${(liens ?? []).length} document(s) relié(s), ` +
				`${publies} publié(s), ${manquants.count} élément(s) du modèle sans lien`
		);
	}

	// Plus aucune adresse storage:// dans le modèle ni dans ses chapitres.
	const chapitres = (insts ?? []).map((i) => i.chapter_id);
	const { data: restants, error: e3 } = await supabase
		.from('chapter_documents')
		.select('id')
		.like('google_drive_url', `${FAKE_LINK_PREFIX}%`)
		.or(`template_id.eq.${templateId},chapter_id.in.(${chapitres.join(',')})`);
	constat(
		!e3 && (restants ?? []).length === 0,
		`adresses storage:// restantes : ${e3 ? `illisible (${e3.message})` : (restants ?? []).length}`
	);

	return { ok, lines };
}
