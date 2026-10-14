/**
 * Chapter Templates Types
 * Clean application types for the chapter templates feature.
 *
 * These types use camelCase and are designed for frontend use.
 * Use converter functions to transform between DB (snake_case) and App (camelCase).
 */

import type {
	ChapterChecklistItem,
	ChapterColor,
	ChapterDocument,
	ChapterExercise,
	ChapterIcon,
	ChapterSection,
	ChapterSeries,
	ChapterWorksheet
} from './chapters';
import type { GradeCode } from './grades';

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

/**
 * Template status values
 */
export type TemplateStatus = 'draft' | 'published' | 'archived';

// ===========================================================================
// APPLICATION TYPES (camelCase)
// ===========================================================================

// ---------------------------------------------------------------------------
// Contenu POSSÉDÉ par le modèle (ADR 0029)
// ---------------------------------------------------------------------------
//
// Mêmes formes que les éléments d'un chapitre, sans ce qui n'appartient qu'à la
// classe : ni publication, ni masquage, ni lien (un élément du modèle n'est
// jamais publié, et c'est le chapitre qui le relie). Le propriétaire est
// `templateId`.

type ChapterOnly = 'chapterId' | 'publishedAt' | 'sourceId' | 'hidden';

export type TemplateSection = Omit<ChapterSection, 'chapterId' | 'sourceId' | 'hidden'> & {
	templateId: string;
};
export type TemplateDocument = Omit<ChapterDocument, ChapterOnly> & { templateId: string };
export type TemplateChecklistItem = Omit<ChapterChecklistItem, ChapterOnly> & {
	templateId: string;
};
export type TemplateExercise = Omit<ChapterExercise, ChapterOnly> & { templateId: string };
export type TemplateWorksheet = Omit<ChapterWorksheet, ChapterOnly> & { templateId: string };
/** La série d'un modèle, sans son titre relu (l'éditeur l'enrichit au chargement). */
export type TemplateSeries = Omit<
	ChapterSeries,
	ChapterOnly | 'title' | 'questionCount' | 'launchHref'
> & { templateId: string };

/** Le contenu non retiré d'un modèle, chaque liste dans l'ordre du professeur. */
export interface TemplateContent {
	sections: TemplateSection[];
	documents: TemplateDocument[];
	checklistItems: TemplateChecklistItem[];
	exercises: TemplateExercise[];
	worksheets: TemplateWorksheet[];
	series: TemplateSeries[];
}

/**
 * Modèle de chapitre. Son contenu vit dans les tables du chapitre, rangé sous
 * `template_id` (ADR 0029) : il n'est plus porté par le modèle lui-même.
 */
export interface ChapterTemplate {
	id: string;
	createdBy: string;
	status: TemplateStatus;
	title: string;
	description: string | null;
	grades: GradeCode[];
	color: ChapterColor | null;
	icon: ChapterIcon | null;
	instantiationCount: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Rattachement d'un chapitre à un modèle : lié, ou détaché (il garde alors sa
 * propre copie). `templateId` vaut `null` quand le modèle a été supprimé.
 */
export interface ChapterTemplateInstantiation {
	id: string;
	templateId: string | null;
	chapterId: string;
	isDetached: boolean;
	instantiatedAt: string;
}

// ===========================================================================
// ENRICHED TYPES
// ===========================================================================

/**
 * Template summary for list views
 */
export interface TemplateSummary {
	id: string;
	title: string;
	description: string | null;
	grades: GradeCode[];
	color: ChapterColor | null;
	icon: ChapterIcon | null;
	status: TemplateStatus;
	instantiationCount: number;
	createdAt: string;
	updatedAt: string;
	creatorName: string | null;
	isOwner: boolean;
	/** Content counts */
	documentCount: number;
	checklistItemCount: number;
	exerciseCount: number;
	worksheetCount: number;
	/** Séries du modèle (contenu réel, ADR 0029). */
	seriesCount: number;
}

/**
 * Le rattachement d'un chapitre, tel que l'écran le montre : avec le titre du
 * modèle (`null` s'il a été supprimé).
 */
export interface InstantiationWithStatus extends ChapterTemplateInstantiation {
	templateTitle: string | null;
}

// ===========================================================================
// DATABASE ROW TYPES (for reference)
// ===========================================================================

/**
 * Les colonnes de `chapter_templates` que le code lit. La table porte encore
 * `content_snapshot` et `current_version` (ancien système de versions), que
 * plus rien ne lit.
 */
export interface DbChapterTemplate {
	id: string;
	created_by: string;
	status: string;
	title: string;
	description: string | null;
	grades: string[];
	color: string | null;
	icon: string | null;
	instantiation_count: number;
	created_at: string;
	updated_at: string;
}

/**
 * Les colonnes de `chapter_template_instantiations` que le code lit. Les
 * colonnes de version (`template_version`, `current_template_version`,
 * `last_migrated_at`) restent en base, sans lecteur.
 */
export interface DbChapterTemplateInstantiation {
	id: string;
	template_id: string | null;
	chapter_id: string;
	is_detached: boolean;
	instantiated_at: string;
}

// ===========================================================================
// CONVERTER FUNCTIONS (DB -> App)
// ===========================================================================

/**
 * Convert database template to app type
 */
export function dbTemplateToApp(db: DbChapterTemplate): ChapterTemplate {
	return {
		id: db.id,
		createdBy: db.created_by,
		status: db.status as TemplateStatus,
		title: db.title,
		description: db.description,
		grades: db.grades as GradeCode[],
		color: db.color as ChapterColor | null,
		icon: db.icon as ChapterIcon | null,
		instantiationCount: db.instantiation_count,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

/**
 * Convert database instantiation to app type
 */
export function dbInstantiationToApp(
	db: DbChapterTemplateInstantiation
): ChapterTemplateInstantiation {
	return {
		id: db.id,
		templateId: db.template_id,
		chapterId: db.chapter_id,
		isDetached: db.is_detached,
		instantiatedAt: db.instantiated_at
	};
}
