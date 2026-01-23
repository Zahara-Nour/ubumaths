/**
 * TypeScript types for the Worksheets feature
 * Generated from migration: 20250123000000_worksheets.sql
 */

import type { Variable, DocumentNode } from '$lib/ubumark';
import type {
	ExerciseVariation,
	SharedExerciseDefaults,
	ExerciseHint,
	ExerciseResource
} from '$lib/exercises/types';
import type { GradeCode } from '$lib/types/grades';

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

export const WORKSHEET_TYPES = ['worksheet', 'assessment', 'exam', 'quiz', 'homework'] as const;
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
	exercise_position: number;
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

export interface WorksheetConfig {
	show_title?: boolean;
	show_date?: boolean;
	show_student_name?: boolean;
	show_class?: boolean;
	show_points?: boolean;
	numbering_style?: NumberingStyle;
	shuffle_exercises?: boolean;
	shuffle_within_sections?: boolean;
	page_layout?: 'A4' | 'Letter';
	font_size?: number;
	margins?: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
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
	/** Optional title for the exercise */
	title?: string | null;
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
	is_public: boolean;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface WorksheetRow {
	id: string;
	title: string;
	description: string | null;
	type: WorksheetType;
	config: WorksheetConfig;
	status: WorksheetStatus;
	version: number;
	published_at: string | null;
	archived_at: string | null;
	template_id: string | null;
	estimated_duration_minutes: number | null;
	total_points: number | null;
	grades: string[];
	tags: string[];
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
	class_id: string | null;
	title: string | null;
	instructions: string | null;
	individualized: boolean;
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
	is_public?: boolean;
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
	is_public?: boolean;
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
		/** @deprecated Use variations array instead - kept for backward compatibility */
		statement_md?: string;
		/** @deprecated Use variations array instead - kept for backward compatibility */
		solution_md?: string | null;
		/** @deprecated Use shared.variables instead - kept for backward compatibility */
		variables?: Variable[] | null;
		/** Shared defaults for variations (recommended) */
		shared?: SharedExerciseDefaults | null;
		/** Exercise variations for different guidance levels (recommended) */
		variations?: ExerciseVariation[] | null;
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
	/** @deprecated Use classes instead */
	class?: {
		id: string;
		name: string;
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
	description: string | null;
	type: WorksheetType;
	instructions: string | null;
	available_from: string;
	closes_at: string | null;
	show_corrections: boolean;
	class_name: string | null;
	exercises: StudentExerciseView[];
	/** Sections for grouping exercises */
	sections: StudentSectionView[];
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
	available_from: string;
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
	show_title: true,
	show_date: true,
	show_student_name: true,
	show_class: true,
	show_points: true,
	numbering_style: 'numeric',
	shuffle_exercises: false,
	shuffle_within_sections: false,
	page_layout: 'A4',
	font_size: 12,
	margins: { top: 20, bottom: 20, left: 15, right: 15 }
};

export const DEFAULT_VARIANT_CONFIG: VariantConfig = {
	mode: 'none'
};
