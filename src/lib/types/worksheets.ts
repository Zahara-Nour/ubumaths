/**
 * TypeScript types for the Worksheets feature
 * Generated from migration: 20250123000000_worksheets.sql
 */

import type { DocumentNode } from '$lib/ubumark';
import type {
	ExerciseVariation,
	SharedExerciseDefaults,
	ExerciseHint,
	ExerciseResource
} from '$lib/exercises/types';
import type { GradeCode } from '$lib/types/grades';
import type { CapitalPairs } from '$lib/mathAST/parser/types';
import type { GuidanceLevel } from '$lib/worksheets/student-copy';
import {
	DEFAULT_CONTENT_LOCALE,
	isContentLocale,
	type ContentLocale,
	type TranslatedLocale
} from '$lib/types/locale';

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

/**
 * Les quatre types de fiche (ADR 0030) : le type décide de l'en-tête du PDF
 * (`worksheet-header.ts`). « quiz » est retiré du code ; la contrainte CHECK de
 * la base l'accepte encore, mais aucune ligne ne le porte.
 */
export const WORKSHEET_TYPES = ['worksheet', 'assessment', 'homework', 'exam'] as const;
export type WorksheetType = (typeof WORKSHEET_TYPES)[number];

export const WORKSHEET_STATUSES = ['draft', 'published', 'archived'] as const;
export type WorksheetStatus = (typeof WORKSHEET_STATUSES)[number];

export const VARIANT_MODES = ['none', 'individual', 'n_versions', 'group'] as const;
export type VariantMode = (typeof VARIANT_MODES)[number];

export const INSTANCE_STATUSES = ['generated'] as const;
export type InstanceStatus = (typeof INSTANCE_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const CORRECTION_RELEASE_MODES = ['manual', 'immediate', 'scheduled', 'after_due'] as const;
export type CorrectionReleaseMode = (typeof CORRECTION_RELEASE_MODES)[number];

export const ERROR_REPORT_STATUSES = ['pending', 'fixed', 'rejected'] as const;
export type ErrorReportStatus = (typeof ERROR_REPORT_STATUSES)[number];

// =============================================================================
// WORKSHEET ERROR REPORTS - Database Row Types
// =============================================================================

export interface WorksheetErrorReportRow {
	id: string;
	assignment_id: string;
	worksheet_exercise_id: string;
	student_id: string;
	description: string;
	status: ErrorReportStatus;
	reviewed_by: string | null;
	reviewed_at: string | null;
	response: string | null;
	/** Index of the variation the student saw (0-based). NULL for legacy reports. */
	variation_index: number | null;
	/** Seed used to generate the student instance. Allows preview of what student saw. */
	seed: number | null;
	created_at: string;
	updated_at: string;
}

export interface WorksheetErrorReportInsert {
	assignment_id: string;
	worksheet_exercise_id: string;
	student_id: string;
	description: string;
	/** Index of the variation the student saw (0-based). Optional for backwards compatibility. */
	variation_index?: number | null;
	/** Seed used to generate the student instance. Optional for backwards compatibility. */
	seed?: number | null;
}

export interface WorksheetErrorReportUpdate {
	status?: ErrorReportStatus;
	reviewed_by?: string | null;
	reviewed_at?: string | null;
	response?: string | null;
}

/**
 * Student can only update description of pending reports.
 * @see updateStudentErrorReportSchema for validation rules (10-1000 chars)
 */
export interface StudentErrorReportUpdate {
	description: string;
}

// =============================================================================
// WORKSHEET ERROR REPORTS - View Types
// =============================================================================

/**
 * Error report as seen by the student who submitted it
 */
export interface StudentErrorReportView {
	id: string;
	worksheet_exercise_id: string;
	/**
	 * Numéro de l'exercice dans la copie de l'élève (ordre mélangé compris,
	 * D6) ; `null` s'il est inconnu (fiche illisible) — jamais un numéro faux.
	 */
	exercise_position: number | null;
	description: string;
	status: ErrorReportStatus;
	response: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Extended error report view for student reports list API
 * Includes display information from related tables
 */
export interface StudentErrorReportWithDisplay extends StudentErrorReportView {
	assignment_id: string;
	worksheet_id: string;
	worksheet_title: string;
	assignment_title: string | null;
}

/**
 * Error report as seen by the teacher
 */
export interface TeacherErrorReportView {
	id: string;
	assignment_id: string;
	worksheet_exercise_id: string;
	exercise_position: number;
	student_id: string;
	student_first_name: string | null;
	student_last_name: string | null;
	description: string;
	status: ErrorReportStatus;
	response: string | null;
	/** Index of the variation the student saw (0-based). NULL for legacy reports. */
	variation_index: number | null;
	/** Seed used to generate the student instance. NULL for legacy reports. */
	seed: number | null;
	created_at: string;
	updated_at: string;
}

export const NUMBERING_STYLES = ['numeric', 'alphabetic', 'roman'] as const;
export type NumberingStyle = (typeof NUMBERING_STYLES)[number];

// =============================================================================
// CONFIG TYPES (JSONB structures)
// =============================================================================

/** Corrigé concis ou détaillé : ancien réglage de la fiche, plus lu (ADR 0030 : toujours détaillé) */
export type CorrectionDetail = 'concise' | 'detailed';

/** Calculatrice autorisée ou interdite : option de l'évaluation écrite et de l'examen blanc */
export const CALCULATOR_RULES = ['allowed', 'forbidden'] as const;
export type CalculatorRule = (typeof CALCULATOR_RULES)[number];

/**
 * Réponses sur le sujet (ADR 0030, lot 3) : un cadre après chaque question
 * (défaut) ou un seul après l'exercice
 */
export const ANSWER_FRAME_MODES = ['question', 'exercise'] as const;
export type AnswerFrameMode = (typeof ANSWER_FRAME_MODES)[number];

/** Taille d'un cadre de réponse (hauteurs : `worksheets/document/answer-frames.ts`) */
export const ANSWER_FRAME_SIZES = ['small', 'medium', 'large'] as const;
export type AnswerFrameSize = (typeof ANSWER_FRAME_SIZES)[number];

/**
 * Cadres d'un exercice, estimés d'après le corrigé de la variante imprimée
 * (`estimateAnswerFrames`) :
 * - `questions` : une taille par question de l'énoncé, dans l'ordre ;
 * - `exercise_cm` : hauteur du cadre unique (après l'exercice, ou énoncé sans
 *   question numérotée).
 */
export interface AnswerFrameEstimate {
	questions: AnswerFrameSize[];
	exercise_cm: number;
}

/**
 * Réglages d'une fiche (colonne `config`, jsonb).
 *
 * ADR 0030 : le type décide de l'en-tête ; seules restent les options du type
 * (`TYPE_OPTION_KEYS` dans `worksheet-header.ts`). Les anciennes clés
 * d'affichage (`show_title`, `show_date`, `show_class`,
 * `numbering_style`, `page_layout`, `font_size`, `margins`,
 * `correction_detail`) peuvent rester en base : plus aucun code ne les lit,
 * et les retirer des données est une étape à part, avec l'accord de David.
 */
export interface WorksheetConfig {
	/**
	 * Language the whole worksheet is rendered in: exercise content and PDF
	 * chrome alike. Absent means French.
	 */
	language?: ContentLocale;
	/** Fiche d'exercices : ligne « Nom » (groupes de niveaux) ; absent : non */
	show_student_name?: boolean;
	/** Évaluation écrite : points par exercice et total imprimés ; absent : non */
	show_points?: boolean;
	/** Évaluation écrite, examen blanc : calculatrice ; absent : rien d'imprimé */
	calculator?: CalculatorRule;
	/** Évaluation écrite, examen blanc : l'élève répond sur le sujet (cadres) ; absent : non */
	answers_on_sheet?: boolean;
	/** Avec réponses sur le sujet : cadre après chaque question ou après l'exercice ; absent : question */
	answer_frames?: AnswerFrameMode;
	/** Devoir maison : date de rendu, `AAAA-MM-JJ` ; absente : ligne à remplir */
	due_date?: string;
	shuffle_exercises?: boolean;
	/**
	 * @deprecated Case « Mélanger dans les sections » retirée (D6, 2026-10-13) :
	 * « mélanger les exercices » mélange déjà dans chaque section. La clé peut
	 * rester en base (anciennes fiches) ; plus aucun code ne la lit.
	 */
	shuffle_within_sections?: boolean;
}

/**
 * Date de calendrier `AAAA-MM-JJ` qui existe (`2026-02-30` refusée) : la date
 * de rendu d'un devoir maison. Lue en UTC, pour ne pas glisser d'un jour.
 */
export function isIsoDate(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export interface VariantConfig {
	mode?: VariantMode;
	n_versions?: number;
	group_size?: number;
	seed_base?: number;
	parameter_overrides?: Record<string, unknown>;
}

export interface TemplatePlaceholder {
	key: string;
	type: 'text' | 'date' | 'dynamic';
	label?: string;
	default_value?: string;
}

export interface ResolvedExercise {
	exercise_id: string;
	position: number;
	/** Section ID if exercise belongs to a section */
	section_id?: string | null;
	parameters: Record<string, number | string>;
	statement: string;
	solution: string;
	/**
	 * Réponses seules, sans détail (PDF « Réponses »). Absent ou vide : le PDF
	 * renvoie au corrigé. Les instances stockées avant l'ajout du champ ne l'ont pas.
	 */
	answers?: string;
	/** Optional title for the exercise */
	title?: string | null;
	/** Points awarded for this exercise, as set on the worksheet */
	points?: number | null;
	/** Teacher instructions specific to this exercise */
	custom_instructions?: string | null;
	/** Parsed AST for the statement (for rich rendering) */
	statement_ast?: DocumentNode;
	/** Parsed AST for the solution (for rich rendering) */
	solution_ast?: DocumentNode;
	/** Index of the selected variation (if exercise uses variations) */
	selectedVariationIndex?: number;
	/** Label of the selected variation (e.g., 'guided', 'autonomous') */
	selectedVariationLabel?: string;
	/** Hints from the selected variation */
	hints?: ExerciseHint[];
	/**
	 * Lettres que l'exercice déclare comme fonctions (`exercises.generic_functions`).
	 * Absent : défauts du parseur. Sans elles, `C'(x)` s'imprime en erreur dans le PDF.
	 * Les instances stockées avant l'ajout du champ ne l'ont pas.
	 */
	generic_functions?: string[] | null;
	/**
	 * Sens de deux majuscules collées (`AB`) dans les formules `~…~` de l'exercice :
	 * longueur ou produit, résolu à la génération depuis son thème (lot 6 des
	 * longueurs, Q-J). Absent (instance stockée avant) : produit, l'écriture d'avant.
	 */
	capital_pairs?: CapitalPairs;
}

/** Section data for PDF generation */
export interface InstanceSection {
	id: string;
	title: string;
	instructions: string | null;
	position: number;
}

export interface InstanceData {
	exercises: ResolvedExercise[];
	/** Sections for grouping exercises in PDF */
	sections?: InstanceSection[];
	exercise_order?: number[];
	variant_info?: {
		seed: number;
		version?: string;
		group_id?: string;
	};
}

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

export interface WorksheetTemplateRow {
	id: string;
	name: string;
	description: string | null;
	template_content: string;
	placeholders: TemplatePlaceholder[];
	created_by: string | null;
	/** Le style dont ce gabarit est une forme (lot 3) */
	style_id?: string | null;
	created_at: string;
	updated_at: string;
}

export interface WorksheetRow {
	id: string;
	title: string;
	description: string | null;
	/** Translations of title/description. NULL when the worksheet is French only. */
	translations?: RowTranslations | null;
	type: WorksheetType;
	config: WorksheetConfig;
	status: WorksheetStatus;
	version: number;
	published_at: string | null;
	archived_at: string | null;
	template_id: string | null;
	/**
	 * Le style de la fiche (`worksheet_styles`, lot 3). Vide pour les fiches
	 * d'avant : `template_id` désigne alors le style (`styleIdOf`). Optionnel :
	 * les fiches construites hors de la base (scripts, tests) n'en ont pas.
	 */
	style_id?: string | null;
	estimated_duration_minutes: number | null;
	total_points: number | null;
	grades: string[];
	/**
	 * ⚠️ Optionnel, et ça n'est pas un oubli : `tags` n'est plus une colonne de
	 * `worksheets` depuis 20260908180000. Les étiquettes vivent dans
	 * `resource_tags` et sont chargées séparément — les chemins qui n'en ont pas
	 * besoin (génération PDF, correction) ne les lisent pas du tout.
	 */
	tags?: string[];
	created_by: string;
	school_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface WorksheetSectionRow {
	id: string;
	worksheet_id: string;
	title: string;
	instructions: string | null;
	/** Translations of title/instructions. NULL when the section is French only. */
	translations?: RowTranslations | null;
	position: number;
	points_total: number | null;
	created_at: string;
	updated_at: string;
}

export interface WorksheetExerciseRow {
	id: string;
	worksheet_id: string;
	exercise_id: string;
	section_id: string | null;
	position: number;
	points: number | null;
	variant_mode: VariantMode;
	variant_config: VariantConfig;
	custom_instructions: string | null;
	/** Translations of custom_instructions. NULL when French only. */
	translations?: RowTranslations | null;
	correction_visible: boolean;
	/**
	 * Optional: Force a specific variation index (0-based).
	 * NULL = seed-based selection (default behavior).
	 * When set, this variation is used for all students regardless of seed.
	 */
	variation_index: number | null;
	/**
	 * Indicates if this exercise is essential/priority for students.
	 * Displayed with a star icon in student view.
	 */
	is_essential: boolean;
	created_at: string;
	updated_at: string;
}

export interface WorksheetInstanceRow {
	id: string;
	worksheet_id: string;
	student_id: string;
	instance_data: InstanceData;
	variant_seed: number;
	variant_version: string | null;
	status: InstanceStatus;
	generated_at: string;
	created_at: string;
	updated_at: string;
}

export interface WorksheetAssignmentRow {
	id: string;
	worksheet_id: string;
	title: string | null;
	instructions: string | null;
	individualized: boolean;
	/** Niveau de guidage des versions distribuées (ADR 0023) ; `GuidanceLevel` attendu */
	guidance_level: string;
	assigned_at: string;
	available_from: string;
	closes_at: string | null;
	correction_release_mode: CorrectionReleaseMode;
	correction_release_at: string | null;
	show_corrections: boolean;
	status: AssignmentStatus;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface WorksheetAssignmentStudentRow {
	id: string;
	assignment_id: string;
	student_id: string;
	created_at: string;
}

export interface WorksheetAssignmentClassRow {
	id: string;
	assignment_id: string;
	class_id: string;
	created_at: string;
}

export interface WorksheetAssignmentExerciseSettingsRow {
	id: string;
	assignment_id: string;
	worksheet_exercise_id: string;
	show_correction: boolean;
	created_at: string;
	updated_at: string;
}

// =============================================================================
// INSERT TYPES (for creating new records)
// =============================================================================

export interface WorksheetTemplateInsert {
	name: string;
	description?: string | null;
	template_content: string;
	placeholders?: TemplatePlaceholder[];
	created_by?: string | null;
}

export interface WorksheetInsert {
	title: string;
	description?: string | null;
	type?: WorksheetType;
	config?: WorksheetConfig;
	status?: WorksheetStatus;
	version?: number;
	template_id?: string | null;
	style_id?: string | null;
	estimated_duration_minutes?: number | null;
	total_points?: number | null;
	grades?: number[];
	tags?: string[];
	created_by: string;
	school_id?: string | null;
}

export interface WorksheetSectionInsert {
	worksheet_id: string;
	title: string;
	instructions?: string | null;
	position: number;
	points_total?: number | null;
}

export interface WorksheetExerciseInsert {
	worksheet_id: string;
	exercise_id: string;
	section_id?: string | null;
	position: number;
	points?: number | null;
	variant_mode?: VariantMode;
	variant_config?: VariantConfig;
	custom_instructions?: string | null;
	/** Optional: Force a specific variation index (0-based). NULL = seed-based. */
	variation_index?: number | null;
	/** Mark as essential/priority exercise. Defaults to false. */
	is_essential?: boolean;
}

export interface WorksheetInstanceInsert {
	worksheet_id: string;
	student_id: string;
	instance_data: InstanceData;
	variant_seed: number;
	variant_version?: string | null;
	status?: string | null;
}

/**
 * Data required to create a worksheet assignment.
 * Constraint: At least one of class_ids or student_ids must be non-empty.
 */
export interface WorksheetAssignmentInsert {
	worksheet_id: string;
	/**
	 * @deprecated Use class_ids instead.
	 * Migration: { class_id: 'uuid' } -> { class_ids: ['uuid'] }
	 * Maintained for backward compatibility only.
	 */
	class_id?: string | null;
	/**
	 * Classes to assign the worksheet to.
	 * All class members automatically receive this assignment.
	 * Required if student_ids is empty. Can coexist with student_ids.
	 */
	class_ids?: string[];
	/**
	 * Individual students to assign (in addition to class members).
	 * Allows targeting specific students outside their class.
	 * Can be empty if class_ids is provided. Can coexist with class_ids.
	 */
	student_ids?: string[];
	title?: string | null;
	instructions?: string | null;
	individualized?: boolean;
	/** Niveau de guidage (ADR 0023) : guidé si absent */
	guidance_level?: GuidanceLevel;
	available_from?: string;
	closes_at?: string | null;
	correction_release_mode?: CorrectionReleaseMode;
	correction_release_at?: string | null;
	show_corrections?: boolean;
	status?: AssignmentStatus;
	created_by: string;
}

export interface WorksheetAssignmentStudentInsert {
	assignment_id: string;
	student_id: string;
}

export interface WorksheetAssignmentExerciseSettingsInsert {
	assignment_id: string;
	worksheet_exercise_id: string;
	show_correction: boolean;
}

// =============================================================================
// UPDATE TYPES (for updating existing records)
// =============================================================================

export interface WorksheetTemplateUpdate {
	name?: string;
	description?: string | null;
	template_content?: string;
	placeholders?: TemplatePlaceholder[];
}

export interface WorksheetUpdate {
	title?: string;
	description?: string | null;
	type?: WorksheetType;
	config?: WorksheetConfig;
	status?: WorksheetStatus;
	version?: number;
	published_at?: string | null;
	archived_at?: string | null;
	template_id?: string | null;
	style_id?: string | null;
	estimated_duration_minutes?: number | null;
	total_points?: number | null;
	grades?: number[];
	tags?: string[];
	school_id?: string | null;
}

export interface WorksheetSectionUpdate {
	title?: string;
	instructions?: string | null;
	position?: number;
	points_total?: number | null;
}

export interface WorksheetExerciseUpdate {
	section_id?: string | null;
	position?: number;
	points?: number | null;
	variant_mode?: VariantMode;
	variant_config?: VariantConfig;
	custom_instructions?: string | null;
	/** Optional: Force a specific variation index (0-based). NULL = seed-based. */
	variation_index?: number | null;
	/** Mark as essential/priority exercise. */
	is_essential?: boolean;
}

export interface WorksheetInstanceUpdate {
	status?: InstanceStatus;
}

export interface WorksheetAssignmentUpdate {
	title?: string | null;
	instructions?: string | null;
	individualized?: boolean;
	available_from?: string;
	closes_at?: string | null;
	correction_release_mode?: CorrectionReleaseMode;
	correction_release_at?: string | null;
	show_corrections?: boolean;
	status?: AssignmentStatus;
}

export interface WorksheetAssignmentExerciseSettingsUpdate {
	show_correction?: boolean;
}

// =============================================================================
// EXTENDED TYPES (with relations)
// =============================================================================

export interface WorksheetWithRelations extends WorksheetRow {
	template?: WorksheetTemplateRow | null;
	sections?: WorksheetSectionRow[];
	exercises?: WorksheetExerciseWithExercise[];
	creator?: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
}

export interface WorksheetExerciseWithExercise extends WorksheetExerciseRow {
	exercise?: {
		id: string;
		title: string;
		/** Exercise category (automatisme, application, etc.) */
		category?: string;
		/** Shared defaults for variations */
		shared?: SharedExerciseDefaults | null;
		/** Exercise variations for different guidance levels */
		variations?: ExerciseVariation[] | null;
		/** Lettres déclarées comme fonctions (`C'(x)`, `u(x)`…) ; absent = défauts du parseur */
		generic_functions?: string[] | null;
		/** Thème de l'exercice : décide du sens de `AB` (longueur ou produit, Q-J) */
		topic?: string | null;
	};
}

export interface WorksheetInstanceWithStudent extends WorksheetInstanceRow {
	student?: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
	worksheet?: {
		id: string;
		title: string;
	};
}

export interface WorksheetAssignmentWithRelations extends WorksheetAssignmentRow {
	worksheet?: {
		id: string;
		title: string;
		type: WorksheetType;
	};
	/** All classes assigned to this worksheet (multi-class support) */
	classes?: Array<{
		id: string;
		name: string;
	}>;
	/** Individual students assigned (not through class membership) */
	assigned_students?: Array<{
		id: string;
		first_name: string | null;
		last_name: string | null;
	}>;
	creator?: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
}

// =============================================================================
// STUDENT VIEW TYPES (for online consultation mode)
// =============================================================================

/**
 * Exercise data as seen by students in online mode
 */
export interface StudentExerciseView {
	id: string;
	exercise_id: string;
	position: number;
	points: number | null;
	custom_instructions: string | null;
	statement: string;
	correction: string | null;
	correction_visible: boolean;
	/**
	 * Réponses seules : transmises EXACTEMENT quand la correction l'est
	 * (`correction_visible`), jamais avant. Absent ou `null` : rien à montrer.
	 */
	answers?: string | null;
	/** Section ID if exercise belongs to a section */
	section_id: string | null;
	/** Optional title for the exercise */
	title?: string | null;
	/** Tags associated with the exercise */
	tags?: string[];
	/** Hints from the selected variation (for guided exercises) */
	hints?: ExerciseHint[];
	/** Supplementary resources (videos, PDFs, links) */
	resources?: ExerciseResource[];
	/** Indicates if this exercise is essential/priority */
	is_essential?: boolean;
	/** Lettres déclarées comme fonctions par l'exercice ; absent = défauts du parseur */
	generic_functions?: string[] | null;
	/**
	 * Sens de deux majuscules collées (`AB`) : longueur ou produit, résolu par le
	 * serveur depuis le thème de l'exercice (Q-J) ; le thème lui-même n'est pas
	 * transmis. Absent : produit, l'écriture d'avant.
	 */
	capital_pairs?: CapitalPairs;
	/**
	 * Cadres de réponse (réponses sur le sujet, ADR 0030 lot 3) : tailles
	 * estimées par le serveur d'après le corrigé de la copie de l'élève, envoyées
	 * même si la correction est masquée (le texte, lui, ne l'est jamais) : le
	 * PDF de l'élève a les mêmes cadres que celui du prof. Absent : sans cadres.
	 */
	answer_frame_estimate?: AnswerFrameEstimate;
}

/**
 * Section data as seen by students
 */
export interface StudentSectionView {
	id: string;
	title: string;
	instructions: string | null;
	position: number;
}

/**
 * Worksheet assignment as seen by students
 */
export interface StudentWorksheetView {
	assignment_id: string;
	worksheet_id: string;
	title: string;
	/** Language of the worksheet, driving both content and PDF chrome. */
	language?: ContentLocale;
	/**
	 * Les options du type de la fiche (ADR 0030), telles que la config les porte :
	 * l'en-tête du PDF de l'élève les lit par la même règle que celui du prof
	 * (`worksheetHeader`). Absentes : comme absentes de la config.
	 */
	show_student_name?: boolean;
	show_points?: boolean;
	calculator?: CalculatorRule;
	answers_on_sheet?: boolean;
	answer_frames?: AnswerFrameMode;
	due_date?: string;
	description: string | null;
	type: WorksheetType;
	instructions: string | null;
	/**
	 * `NULL` means available immediately: the column is nullable in Postgres,
	 * and the assignment form only sends a date when the teacher sets one.
	 */
	available_from: string | null;
	closes_at: string | null;
	show_corrections: boolean;
	class_name: string | null;
	/**
	 * Consultation seule : l'élève relit une fiche d'une classe qu'il a quittée.
	 * Il n'a alors aucun droit d'écriture — ni réponse, ni signalement d'erreur.
	 * Le serveur refuse déjà ces écritures ; ce drapeau sert à ne pas les
	 * proposer.
	 */
	read_only: boolean;
	/**
	 * Ordre tiré (option « mélanger les exercices », copie d'une affectation) :
	 * `exercises` arrive dans l'ordre de la copie, à NE PAS retrier par
	 * `position`. Absent : ordre des positions, comme avant.
	 */
	shuffled?: boolean;
	exercises: StudentExerciseView[];
	/** Sections for grouping exercises */
	sections: StudentSectionView[];
	/**
	 * Le style de la fiche (lot 4b) : `style_id`, sinon `template_id` (fiches
	 * d'avant le lot 3). Absents : « Fiche élève ».
	 */
	style_id?: string | null;
	template_id?: string | null;
	/**
	 * La mise en page (forme « fiche ») d'un style du prof auteur de la fiche,
	 * fournie par le serveur (D11) ; `null` pour un style de Chiphre (Typst
	 * dans le code) ou un style illisible. Son Typst seul, rien d'autre.
	 */
	template?: { template_content: string } | null;
	/** Cartouche du gabarit, comme le PDF du prof (lot 4b) : total, durée */
	total_points?: number | null;
	estimated_duration_minutes?: number | null;
}

/**
 * List item for student worksheet list
 */
export interface StudentWorksheetListItem {
	assignment_id: string;
	worksheet_id: string;
	title: string;
	type: WorksheetType;
	class_id: string | null;
	class_name: string | null;
	/** `NULL` = disponible immédiatement, comme pour {@link StudentWorksheetView}. */
	available_from: string | null;
	closes_at: string | null;
	show_corrections: boolean;
	exercise_count: number;
}

// =============================================================================
// FORM TYPES (for UI forms)
// =============================================================================

export interface WorksheetFormData {
	title: string;
	description: string;
	type: WorksheetType;
	config: WorksheetConfig;
	estimated_duration_minutes: number | null;
	grades: GradeCode[];
	tags: string[];
	template_id: string | null;
}

export interface WorksheetExerciseFormData {
	exercise_id: string;
	section_id: string | null;
	position: number;
	points: number | null;
	variant_mode: VariantMode;
	variant_config: VariantConfig;
	custom_instructions: string;
}

/**
 * Form data for creating/editing worksheet assignments.
 * Constraint: At least one of class_ids or student_ids must be non-empty.
 */
export interface WorksheetAssignmentFormData {
	/**
	 * Classes to assign the worksheet to.
	 * Required if student_ids is empty.
	 */
	class_ids: string[];
	/**
	 * Individual students to assign (in addition to class members).
	 * Optional if class_ids is provided.
	 */
	student_ids: string[];
	title: string;
	instructions: string;
	individualized: boolean;
	available_from: Date;
	closes_at: Date | null;
	correction_release_mode: CorrectionReleaseMode;
	correction_release_at: Date | null;
	show_corrections: boolean;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates that at least one recipient is specified for an assignment.
 * Returns true if class_ids OR student_ids is non-empty.
 */
export function hasValidAssignmentRecipients(
	data: Pick<WorksheetAssignmentFormData, 'class_ids' | 'student_ids'>
): boolean {
	return data.class_ids.length > 0 || data.student_ids.length > 0;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_WORKSHEET_CONFIG: WorksheetConfig = {
	shuffle_exercises: false
};

export const DEFAULT_VARIANT_CONFIG: VariantConfig = {
	mode: 'none'
};

// =============================================================================
// TRANSLATIONS (worksheet title, sections, per-exercise instructions)
// =============================================================================

/**
 * Translatable texts of a worksheet row.
 *
 * One shape covers the three tables that carry translatable columns —
 * `worksheets` (title, description), `worksheet_sections` (title,
 * instructions) and `worksheet_exercises` (custom_instructions) — so a single
 * helper serves them all.
 */
export interface WorksheetTextTranslation {
	title?: string;
	description?: string;
	instructions?: string;
	custom_instructions?: string;
}

/** Translations of a row, keyed by locale. French is never a key. */
export type RowTranslations = Partial<Record<TranslatedLocale, WorksheetTextTranslation>>;

/**
 * Narrows the `placeholders` jsonb column to {@link TemplatePlaceholder}[].
 *
 * Entries missing the two fields the editor always reads — `key` and `type` —
 * are dropped: an unnamed placeholder cannot be substituted, and would appear
 * in the palette as a blank chip.
 */
export function asTemplatePlaceholders(value: unknown): TemplatePlaceholder[] {
	if (!Array.isArray(value)) return [];

	return value.filter((p): p is TemplatePlaceholder => {
		if (typeof p !== 'object' || p === null || Array.isArray(p)) return false;
		const item = p as Record<string, unknown>;
		return (
			typeof item.key === 'string' &&
			(item.type === 'text' || item.type === 'date' || item.type === 'dynamic')
		);
	});
}

/**
 * Narrows a `worksheets` row to {@link WorksheetRow}.
 *
 * `type`, `status`, `config` and `translations` are all looser in Postgres —
 * plain text or jsonb — and `grades` is a nullable array. `tags` is passed
 * separately: it is no longer a column.
 *
 * The fallbacks are the feature's own defaults: a worksheet of unknown type
 * renders as a plain worksheet, and an unknown status is treated as a draft —
 * the direction that never publishes something by accident.
 */
export function toWorksheetRow(
	row: {
		type: string;
		status: string;
		config: unknown;
		translations?: unknown;
		grades: string[] | null;
		[k: string]: unknown;
	},
	// `tags` n'est plus une colonne de `worksheets` : les étiquettes vivent dans
	// `resource_tags` depuis 20260908180000. Le domaine les garde sur la fiche,
	// mais l'appelant doit les fournir — il les a lues séparément.
	tags: string[] = []
): WorksheetRow {
	return {
		...row,
		type: (WORKSHEET_TYPES.find((t) => t === row.type) ?? 'worksheet') as WorksheetType,
		status: (WORKSHEET_STATUSES.find((s) => s === row.status) ?? 'draft') as WorksheetStatus,
		config: asWorksheetConfig(row.config),
		translations: asRowTranslations(row.translations),
		grades: row.grades ?? [],
		tags
	} as unknown as WorksheetRow;
}

/**
 * Narrows a `worksheet_exercises` row to {@link WorksheetExerciseRow}.
 *
 * Three columns are looser in Postgres than in the domain: `variant_mode` is
 * plain text, `variant_config` and `translations` are jsonb, and
 * `correction_visible` is nullable.
 *
 * The fallbacks are the documented defaults of the feature: no variant, an
 * empty config, and a correction hidden until the teacher releases it — the
 * safe direction for a graded document.
 */
export function toWorksheetExerciseRow(row: {
	variant_mode: string | null;
	variant_config: unknown;
	translations?: unknown;
	correction_visible: boolean | null;
	[k: string]: unknown;
}): WorksheetExerciseRow {
	const mode = VARIANT_MODES.find((m) => m === row.variant_mode) ?? 'none';
	const config =
		typeof row.variant_config === 'object' &&
		row.variant_config !== null &&
		!Array.isArray(row.variant_config)
			? (row.variant_config as VariantConfig)
			: {};

	return {
		...row,
		variant_mode: mode,
		variant_config: config,
		translations: asRowTranslations(row.translations),
		correction_visible: row.correction_visible ?? false
	} as unknown as WorksheetExerciseRow;
}

/**
 * Narrows the `instance_data` jsonb column to {@link InstanceData}.
 *
 * A worksheet instance holds the exercises actually drawn for one student. Its
 * generated type is `Json`, so the three PDF routes cast it — an assertion on
 * the entire content of a graded document, never checked.
 *
 * Returns `null` when the exercise list is missing, so the caller can fall
 * back to regenerating an instance rather than emitting a blank worksheet
 * under a student's name.
 */
export function asInstanceData(value: unknown): InstanceData | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const data = value as Record<string, unknown>;
	if (!Array.isArray(data.exercises)) return null;
	return data as unknown as InstanceData;
}

/**
 * Narrows the `config` jsonb column to {@link WorksheetConfig}.
 *
 * Every field is optional and every consumer already has a default, so an
 * unreadable value degrades to an empty config rather than throwing: a
 * worksheet with a corrupted config must still generate.
 *
 * Only the fields actually used for rendering are carried over; anything of
 * the wrong runtime type is dropped, which is what the old `as` cast silently
 * let through.
 */
export function asWorksheetConfig(value: unknown): WorksheetConfig {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
	const raw = value as Record<string, unknown>;
	const config: WorksheetConfig = {};

	if (isContentLocale(raw.language)) config.language = raw.language;
	for (const flag of [
		'show_student_name',
		'show_points',
		'answers_on_sheet',
		'shuffle_exercises'
	] as const) {
		if (typeof raw[flag] === 'boolean') config[flag] = raw[flag];
	}
	const calculator = CALCULATOR_RULES.find((rule) => rule === raw.calculator);
	if (calculator) config.calculator = calculator;
	const answerFrames = ANSWER_FRAME_MODES.find((mode) => mode === raw.answer_frames);
	if (answerFrames) config.answer_frames = answerFrames;
	if (isIsoDate(raw.due_date)) config.due_date = raw.due_date;

	return config;
}

/**
 * Narrows the `translations` jsonb column to {@link RowTranslations}.
 *
 * The generated type of a jsonb column is `Json`, a union that carries no
 * keys, so callers could not read `translations.en.title` without a cast. A
 * cast would also have hidden genuinely malformed rows.
 *
 * Anything that is not an object of objects is treated as absent: a corrupted
 * row must degrade to the French column rather than break the render.
 */
export function asRowTranslations(value: unknown): RowTranslations | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

	const result: RowTranslations = {};
	for (const [locale, texts] of Object.entries(value)) {
		if (!isContentLocale(locale) || locale === 'fr') continue;
		if (typeof texts !== 'object' || texts === null || Array.isArray(texts)) continue;

		const entry: WorksheetTextTranslation = {};
		for (const field of ['title', 'description', 'instructions', 'custom_instructions'] as const) {
			const text = (texts as Record<string, unknown>)[field];
			if (typeof text === 'string') entry[field] = text;
		}
		result[locale] = entry;
	}
	return result;
}

/**
 * Language a worksheet renders in, defaulting to French.
 *
 * An unknown value falls back to French rather than throwing: a worksheet with
 * a corrupted config must still generate.
 */
/**
 * Les options du type de la fiche (ADR 0030), pour la vue de l'élève : le PDF
 * de l'élève les interprète par la même règle que celui du prof
 * (`worksheetHeader`). Lues depuis la colonne `config` brute.
 */
export function viewTypeOptions(
	value: unknown
): Pick<
	StudentWorksheetView,
	| 'show_student_name'
	| 'show_points'
	| 'calculator'
	| 'answers_on_sheet'
	| 'answer_frames'
	| 'due_date'
> {
	const config = asWorksheetConfig(value);
	return {
		show_student_name: config.show_student_name,
		show_points: config.show_points,
		calculator: config.calculator,
		answers_on_sheet: config.answers_on_sheet,
		answer_frames: config.answer_frames,
		due_date: config.due_date
	};
}

export function worksheetLocale(config: WorksheetConfig | null | undefined): ContentLocale {
	const language = config?.language;
	return isContentLocale(language) ? language : DEFAULT_CONTENT_LOCALE;
}

/**
 * Text of a row in the requested locale, falling back to the French column.
 *
 * An empty translation counts as absent, mirroring the exercise content rules.
 * A null base stays null so callers can still tell "no instructions" from "an
 * empty string".
 */
export function localizedText(
	base: string | null | undefined,
	translations: RowTranslations | null | undefined,
	field: keyof WorksheetTextTranslation,
	locale: ContentLocale
): string | null {
	if (locale !== 'fr') {
		const translated = translations?.[locale]?.[field];
		if (translated) return translated;
	}
	return base ?? null;
}

/**
 * Ce que la garde a pu établir sur une fiche.
 *
 * `verifie: false` n'est PAS « aucune séance » : le cahier n'a pas pu être lu.
 * Les deux états rendaient le même écran vide — donc, pour une garde, le même
 * silence rassurant au moment précis où le professeur s'apprête à réordonner.
 */
export interface WorksheetCitationsReport {
	citations: WorksheetCitation[];
	verifie: boolean;
}

/**
 * Une séance du cahier de texte qui cite une fiche PAR NUMÉRO d'exercice.
 *
 * Vit ici, et non dans `$lib/server/worksheets/citations`, parce que le panneau
 * d'avertissement qui l'affiche est un composant : rien de ce qu'importe le
 * client ne doit venir de `$lib/server`.
 */
export interface WorksheetCitation {
	entryId: string;
	classId: string;
	className: string;
	/** Date de la séance, `YYYY-MM-DD` — telle que la route du cahier l'attend. */
	entryDate: string;
	/**
	 * Les sélections citées, déjà lisibles : `['ex. 3 et 5 à 7']`.
	 *
	 * Plusieurs quand la séance cite la fiche deux fois — en classe et en devoirs,
	 * typiquement, avec des exercices différents.
	 */
	selections: string[];
}
