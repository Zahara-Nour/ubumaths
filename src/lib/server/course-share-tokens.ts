/**
 * « Mon cours » partageable — jetons de lecture (ADR 0025).
 *
 * Tous les élèves n'ont pas de compte. Ce module gère le lien qui rend le cours
 * d'une classe — plan des chapitres visibles et contenus publiés — lisible sans
 * authentifier. Calque du lien du cahier (`journal-share-tokens.ts`), avec sa
 * propre table : le jeton du cahier n'ouvre pas le cours, et inversement.
 *
 * ⚠️ À NE JAMAIS CONFONDRE AVEC `classes.join_code`, qui INSCRIT un élève. Ce
 * jeton ne fait que LIRE.
 *
 * Duplication assumée avec `journal-share-tokens.ts` pour la gestion des
 * jetons (lecture, rotation, révocation) : les deux tables ont la même forme,
 * mais le client Supabase typé ne sait pas écrire `from(table)` sur une union de
 * noms de table sans transtypage. Les briques communes
 * (`generateShareTokenString`, `endOfSchoolYear`) sont importées, pas
 * recopiées. Factoriser obligerait à toucher le module du
 * cahier, en production et sans test qui le couvre de bout en bout : un
 * risque sans gain pour trois fonctions de quelques lignes.
 *
 * @module server/course-share-tokens
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { generateShareTokenString } from '$lib/server/exercise-share-tokens';
import {
	endOfSchoolYear,
	type JournalShareToken,
	type PublicWorksheet
} from '$lib/server/journal-share-tokens';
import { buildSeriesLink, seriesCategoriesSchema, totalQuestions } from '$lib/validation/series';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/course-share-tokens');

// Types

type SB = SupabaseClient<Database>;

/** Même forme que le jeton du cahier : les deux tables sont des calques. */
export type CourseShareToken = JournalShareToken;

// Constantes

const TABLE = 'class_course_share_tokens';
const TOKEN_COLUMNS =
	'id, class_id, token, is_active, expires_at, access_count, last_accessed_at, created_at';

/** Même forme que la contrainte SQL : 16 à 64 caractères alphanumériques. */
export const courseShareTokenSchema = z
	.string()
	.min(16)
	.max(64)
	.regex(/^[A-Za-z0-9]+$/);

/** Le message unique : révoqué, expiré, inexistant, classe archivée. */
export const INVALID_COURSE_LINK = 'Ce lien est invalide ou a expiré';

// ---------------------------------------------------------------------------
// Schémas de réponse des fonctions SQL
// ---------------------------------------------------------------------------
// ⚠️ Un schéma Zod RETIRE les clés qu'il ne déclare pas : chaque clé lue par
// la page doit y figurer. Les clés sont celles de la migration
// 20261016100300_class_course_share_tokens.sql.

const placement = {
	section_id: z.string().nullable(),
	section_order: z.number(),
	display_order: z.number()
};

const publicSectionSchema = z.object({
	id: z.string(),
	title: z.string(),
	display_order: z.number()
});

const publicDocumentSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	source_type: z.string(),
	file_name: z.string().nullable(),
	mime_type: z.string().nullable(),
	file_size: z.number().nullable(),
	google_drive_url: z.string().nullable(),
	...placement
});

const publicWorksheetLinkSchema = z.object({
	id: z.string(),
	worksheet_id: z.string(),
	title: z.string(),
	...placement
});

const publicChecklistItemSchema = z.object({
	id: z.string(),
	content: z.string(),
	description: z.string().nullable(),
	...placement
});

const publicSeriesSchema = z.object({
	id: z.string(),
	series_id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	// Validée plus loin, série par série : une composition abîmée ne doit pas
	// rendre tout le cours illisible.
	categories: z.unknown(),
	form: z.enum(['flash', 'interactive']),
	...placement
});

const publicChapterSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	color: z.string().nullable(),
	icon: z.string().nullable(),
	display_order: z.number(),
	sections: z.array(publicSectionSchema),
	documents: z.array(publicDocumentSchema),
	worksheets: z.array(publicWorksheetLinkSchema),
	checklist_items: z.array(publicChecklistItemSchema),
	series: z.array(publicSeriesSchema)
});

const publicCourseSchema = z.object({
	class_name: z.string(),
	class_grade: z.string().nullable(),
	chapters: z.array(publicChapterSchema)
});

/** Même charge utile que la fiche du cahier ; sections et exercices passent tels quels. */
const publicWorksheetSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	type: z.string(),
	config: z.unknown(),
	status: z.string(),
	grades: z.array(z.string()).nullable(),
	translations: z.unknown(),
	total_points: z.number().nullable(),
	estimated_duration_minutes: z.number().nullable(),
	sections: z.array(z.unknown()),
	exercises: z.array(z.unknown()),
	// Le style de la fiche (lot 4a/4b, D11) : sans ces clés, le schéma les retire
	style_id: z.string().uuid().nullable().optional(),
	template_id: z.string().uuid().nullable().optional(),
	template: z
		.object({
			id: z.string().uuid(),
			name: z.string(),
			description: z.string().nullable(),
			style_id: z.string().uuid().nullable(),
			template_content: z.string()
		})
		.nullable()
		.optional()
});

const courseDocumentFileSchema = z.object({
	storage_path: z.string().nullable(),
	file_name: z.string().nullable(),
	mime_type: z.string().nullable(),
	source_type: z.string(),
	google_drive_url: z.string().nullable()
});

export type PublicCourse = z.infer<typeof publicCourseSchema>;
export type PublicCourseChapter = z.infer<typeof publicChapterSchema>;
export type CourseDocumentFile = z.infer<typeof courseDocumentFileSchema>;

// ---------------------------------------------------------------------------
// Vue rendue par la page publique
// ---------------------------------------------------------------------------

/** Un document tel que la page publique l'affiche (sans chemin de stockage). */
export interface PublicCourseDocument {
	id: string;
	title: string;
	description: string | null;
	sourceType: 'upload' | 'google_drive';
	mimeType: string | null;
	fileSize: number | null;
	/** `null` si l'URL n'est pas en `https:` : elle ne devient jamais un lien. */
	googleDriveUrl: string | null;
}

/** Ce que `ChapterSeriesCard` affiche d'une série. */
export interface PublicCourseSeries {
	title: string | null;
	form: 'flash' | 'interactive';
	questionCount: number;
	launchHref: string | null;
}

export type PublicPlanItem =
	| { kind: 'document'; document: PublicCourseDocument }
	| { kind: 'worksheet'; worksheetId: string; title: string }
	| { kind: 'checklist'; items: { id: string; content: string; description: string | null }[] }
	| { kind: 'series'; series: PublicCourseSeries };

export interface PublicPlanSection {
	id: string;
	/** `null` pour « Non classé » : le lecteur voit les ressources, pas l'étiquette. */
	title: string | null;
	items: PublicPlanItem[];
}

export interface PublicCourseChapterView {
	id: string;
	title: string;
	description: string | null;
	color: string | null;
	plan: PublicPlanSection[];
}

export interface PublicCourseView {
	className: string;
	classGrade: string | null;
	chapters: PublicCourseChapterView[];
}

/** Identifiant de la zone des ressources non rangées (comme chez l'élève). */
const UNASSIGNED_SECTION_ID = 'non-classe';

// Functions

/** Une URL tierce ne devient un lien que si elle est en `https:` (pas de `javascript:`). */
export function safeExternalUrl(raw: string | null): string | null {
	if (!raw) return null;
	try {
		return new URL(raw).protocol === 'https:' ? raw : null;
	} catch {
		return null;
	}
}

function toPublicSeries(s: PublicCourseChapter['series'][number]): PublicCourseSeries {
	const categories = seriesCategoriesSchema.safeParse(s.categories);
	if (!categories.success) {
		logger.error('[course-share] Composition illisible pour la série', s.series_id);
	}
	const lisible = categories.success ? categories.data : null;
	return {
		title: s.title,
		form: s.form,
		questionCount: lisible ? totalQuestions(lisible) : 0,
		// Même lien que chez l'élève (`toChapterSeries`) : entraînement libre, sans
		// note, la composition dans l'URL. Relatif : la même page sert tout le monde.
		launchHref: lisible ? buildSeriesLink('', lisible, { mode: s.form }) : null
	};
}

/**
 * Le plan d'un chapitre, rangé comme celui de l'élève (`buildChapterPlan`) :
 * sections dans leur ordre, contenus par `section_order`, les objectifs d'une
 * section groupés en une liste à la place du premier, « Non classé » à la fin.
 *
 * Rien n'est filtré ici : la fonction SQL n'a rendu que les contenus publiés,
 * et seulement les sections qui en portent.
 */
function buildPublicChapterPlan(chapter: PublicCourseChapter): PublicPlanSection[] {
	type Place = { sectionId: string | null; order: number; item: PublicPlanItem };

	// ⚠️ L'ordre d'insertion décide à `section_order` égal (tri stable ; la
	// colonne vaut 0 par défaut) : documents, séries, fiches, puis objectifs —
	// le même que `buildChapterPlan`.

	const places: Place[] = [
		...chapter.documents.map((d) => ({
			sectionId: d.section_id,
			order: d.section_order,
			item: {
				kind: 'document' as const,
				document: {
					id: d.id,
					title: d.title,
					description: d.description,
					sourceType:
						d.source_type === 'google_drive' ? ('google_drive' as const) : ('upload' as const),
					mimeType: d.mime_type,
					fileSize: d.file_size,
					googleDriveUrl: safeExternalUrl(d.google_drive_url)
				}
			}
		})),
		...chapter.series.map((s) => ({
			sectionId: s.section_id,
			order: s.section_order,
			item: { kind: 'series' as const, series: toPublicSeries(s) }
		})),
		...chapter.worksheets.map((w) => ({
			sectionId: w.section_id,
			order: w.section_order,
			// Désignée par `worksheet_id` : c'est ce que la fonction de la fiche attend.
			item: { kind: 'worksheet' as const, worksheetId: w.worksheet_id, title: w.title }
		}))
	];

	// Les objectifs d'une section : une liste, posée à la position du premier.
	const objectifs = new Map<string | null, PublicCourseChapter['checklist_items']>();
	for (const item of chapter.checklist_items) {
		const liste = objectifs.get(item.section_id);
		if (liste) liste.push(item);
		else objectifs.set(item.section_id, [item]);
	}
	for (const [sectionId, liste] of objectifs) {
		const tries = [...liste].sort((a, b) => a.section_order - b.section_order);
		places.push({
			sectionId,
			order: tries[0].section_order,
			item: {
				kind: 'checklist',
				items: tries.map((i) => ({ id: i.id, content: i.content, description: i.description }))
			}
		});
	}

	const parSection = new Map<string | null, Place[]>();
	for (const p of places) {
		const liste = parSection.get(p.sectionId);
		if (liste) liste.push(p);
		else parSection.set(p.sectionId, [p]);
	}
	const ordonner = (liste: Place[]) =>
		[...liste].sort((a, b) => a.order - b.order).map((p) => p.item);

	const plan: PublicPlanSection[] = [];
	for (const section of [...chapter.sections].sort((a, b) => a.display_order - b.display_order)) {
		const items = parSection.get(section.id);
		if (!items || items.length === 0) continue;
		plan.push({ id: section.id, title: section.title, items: ordonner(items) });
	}
	const nonClassees = parSection.get(null);
	if (nonClassees && nonClassees.length > 0) {
		plan.push({ id: UNASSIGNED_SECTION_ID, title: null, items: ordonner(nonClassees) });
	}
	return plan;
}

/** Le cours, prêt à afficher : chapitres dans leur ordre, chacun avec son plan. */
export function buildPublicCourseView(course: PublicCourse): PublicCourseView {
	return {
		className: course.class_name,
		classGrade: course.class_grade,
		chapters: [...course.chapters]
			.sort((a, b) => a.display_order - b.display_order)
			.map((ch) => ({
				id: ch.id,
				title: ch.title,
				description: ch.description,
				color: ch.color,
				plan: buildPublicChapterPlan(ch)
			}))
	};
}

/**
 * Le jeton actif ET NON EXPIRÉ du cours d'une classe, s'il en existe un.
 *
 * Filtrer l'expiration ici évite d'afficher au professeur un lien que la
 * fonction SQL refuse déjà (même raison que pour le cahier).
 */
export async function getActiveCourseShareToken(
	supabase: SB,
	classId: string
): Promise<{ token: CourseShareToken | null; error: string | null }> {
	const { data, error } = await supabase
		.from(TABLE)
		.select(TOKEN_COLUMNS)
		.eq('class_id', classId)
		.eq('is_active', true)
		.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
		.maybeSingle();

	if (error) {
		logger.error('[course-share] lecture du jeton actif impossible:', error.message);
		return { token: null, error: 'Impossible de lire le lien du cours' };
	}

	return { token: data, error: null };
}

/**
 * Désactive TOUS les jetons encore actifs du cours d'une classe (expirés
 * compris : l'index unique partiel les opposerait à toute création).
 *
 * Les lignes désactivées sont RELUES (`.select()`) : la RLS échoue en silence,
 * et zéro ligne n'est un succès que si l'appelant s'y attend (rotation d'une
 * classe sans lien). Les lignes ne sont jamais supprimées.
 */
export async function revokeCourseShareToken(
	supabase: SB,
	classId: string
): Promise<{ revoked: number; error: string | null }> {
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: false })
		.eq('class_id', classId)
		.eq('is_active', true)
		.select('id');

	if (error) {
		logger.error('[course-share] révocation impossible:', error.message);
		return { revoked: 0, error: 'Impossible de révoquer le lien du cours' };
	}

	return { revoked: data?.length ?? 0, error: null };
}

/**
 * Crée un lien pour le cours d'une classe, en révoquant le précédent : un seul
 * lien vivant, un seul secret à révoquer le jour où il fuit.
 *
 * L'insertion relit sa ligne (`.select().single()`) : un refus de la RLS rend
 * une erreur au lieu d'un faux succès.
 */
export async function rotateCourseShareToken(
	supabase: SB,
	classId: string,
	userId: string
): Promise<{ token: CourseShareToken | null; error: string | null }> {
	const { error: revokeError } = await revokeCourseShareToken(supabase, classId);
	if (revokeError) return { token: null, error: revokeError };

	const { data, error } = await supabase
		.from(TABLE)
		.insert({
			class_id: classId,
			// CSPRNG (finding H8, audit d'août).
			token: generateShareTokenString(),
			created_by: userId,
			expires_at: endOfSchoolYear().toISOString()
		})
		.select(TOKEN_COLUMNS)
		.single();

	if (error || !data) {
		logger.error('[course-share] création du jeton impossible:', error?.message);
		return { token: null, error: 'Impossible de créer le lien du cours' };
	}

	return { token: data, error: null };
}

/**
 * Résout un jeton en cours lisible.
 *
 * `null` sans distinguer révoqué, expiré, inexistant, classe archivée — ni une
 * panne ou une forme inattendue, journalisées ici mais rendues comme un lien
 * invalide (même règle que le cahier).
 */
export async function resolveCourseShareToken(
	supabase: SB,
	token: string
): Promise<PublicCourse | null> {
	const { data, error } = await supabase.rpc('get_class_course_by_share_token', {
		p_token: token
	});

	if (error) {
		logger.error('[course-share] résolution impossible:', error.message);
		return null;
	}
	if (data === null) return null;

	const parsed = publicCourseSchema.safeParse(data);
	if (!parsed.success) {
		logger.error('[course-share] cours de forme inattendue:', parsed.error.issues[0]);
		return null;
	}
	return parsed.data;
}

/**
 * La fiche désignée, SI elle est publiée dans un chapitre visible de la classe
 * du jeton ET distribuée à cette classe — décision prise en base.
 */
export async function resolveCourseWorksheetByShareToken(
	supabase: SB,
	token: string,
	worksheetId: string
): Promise<PublicWorksheet | null> {
	const { data, error } = await supabase.rpc('get_course_worksheet_by_share_token', {
		p_token: token,
		p_worksheet_id: worksheetId
	});

	if (error) {
		logger.error('[course-share] fiche illisible:', error.message);
		return null;
	}
	if (data === null) return null;

	const parsed = publicWorksheetSchema.safeParse(data);
	if (!parsed.success) {
		logger.error('[course-share] fiche de forme inattendue:', parsed.error.issues[0]);
		return null;
	}
	return parsed.data;
}

/**
 * Ce qu'il faut pour servir un document du cours.
 *
 * ⚠️ `supabase` doit être le client SERVICE ROLE : la fonction SQL est
 * réservée à ce rôle, pour que `storage_path` n'atteigne jamais un navigateur.
 * La garde par jeton reste dans la fonction.
 */
export async function resolveCourseDocumentByShareToken(
	serviceClient: SB,
	token: string,
	documentId: string
): Promise<CourseDocumentFile | null> {
	const { data, error } = await serviceClient.rpc('get_course_document_by_share_token', {
		p_token: token,
		p_document_id: documentId
	});

	if (error) {
		logger.error('[course-share] document illisible:', error.message);
		return null;
	}
	if (data === null) return null;

	const parsed = courseDocumentFileSchema.safeParse(data);
	if (!parsed.success) {
		logger.error('[course-share] document de forme inattendue:', parsed.error.issues[0]);
		return null;
	}
	return parsed.data;
}
