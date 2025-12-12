/**
 * TypeScript types for the Worksheets feature
 * Generated from migration: 20250123000000_worksheets.sql
 */

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

export const WORKSHEET_TYPES = ['worksheet', 'assessment', 'exam', 'quiz', 'homework'] as const;
export type WorksheetType = (typeof WORKSHEET_TYPES)[number];

export const WORKSHEET_STATUSES = ['draft', 'published', 'archived'] as const;
export type WorksheetStatus = (typeof WORKSHEET_STATUSES)[number];

export const VARIANT_MODES = ['none', 'individual', 'n_versions', 'group'] as const;
export type VariantMode = (typeof VARIANT_MODES)[number];

export const INSTANCE_STATUSES = ['generated', 'in_progress', 'submitted', 'graded'] as const;
export type InstanceStatus = (typeof INSTANCE_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const CORRECTION_RELEASE_MODES = ['manual', 'immediate', 'scheduled', 'after_due'] as const;
export type CorrectionReleaseMode = (typeof CORRECTION_RELEASE_MODES)[number];

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
	parameters: Record<string, number | string>;
	statement: string;
	solution: string;
}

export interface InstanceData {
	exercises: ResolvedExercise[];
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
	grade_levels: string[];
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
	accessed_at: string | null;
	submitted_at: string | null;
	time_spent_seconds: number;
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
	due_at: string | null;
	closes_at: string | null;
	correction_release_mode: CorrectionReleaseMode;
	correction_release_at: string | null;
	show_solutions_before_due: boolean;
	show_corrections: boolean;
	allow_late_submission: boolean;
	max_attempts: number;
	time_limit_minutes: number | null;
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
	grade_levels?: number[];
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
}

export interface WorksheetInstanceInsert {
	worksheet_id: string;
	student_id: string;
	instance_data: InstanceData;
	variant_seed: number;
	variant_version?: string | null;
	status?: InstanceStatus;
}

export interface WorksheetAssignmentInsert {
	worksheet_id: string;
	class_id?: string | null;
	title?: string | null;
	instructions?: string | null;
	individualized?: boolean;
	available_from?: string;
	due_at?: string | null;
	closes_at?: string | null;
	correction_release_mode?: CorrectionReleaseMode;
	correction_release_at?: string | null;
	show_solutions_before_due?: boolean;
	show_corrections?: boolean;
	allow_late_submission?: boolean;
	max_attempts?: number;
	time_limit_minutes?: number | null;
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
	grade_levels?: number[];
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
}

export interface WorksheetInstanceUpdate {
	status?: InstanceStatus;
	accessed_at?: string | null;
	submitted_at?: string | null;
	time_spent_seconds?: number;
}

export interface WorksheetAssignmentUpdate {
	title?: string | null;
	instructions?: string | null;
	individualized?: boolean;
	available_from?: string;
	due_at?: string | null;
	closes_at?: string | null;
	correction_release_mode?: CorrectionReleaseMode;
	correction_release_at?: string | null;
	show_solutions_before_due?: boolean;
	show_corrections?: boolean;
	allow_late_submission?: boolean;
	max_attempts?: number;
	time_limit_minutes?: number | null;
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
		statement_md: string;
		solution_md: string | null;
		difficulty: number | null;
		variables: unknown[] | null;
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
	class?: {
		id: string;
		name: string;
	};
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
	position: number;
	points: number | null;
	custom_instructions: string | null;
	statement: string;
	correction: string | null;
	correction_visible: boolean;
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
	due_at: string | null;
	show_corrections: boolean;
	class_name: string | null;
	exercises: StudentExerciseView[];
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
	due_at: string | null;
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
	grade_levels: string[];
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

export interface WorksheetAssignmentFormData {
	class_id: string;
	title: string;
	instructions: string;
	individualized: boolean;
	available_from: Date;
	due_at: Date | null;
	closes_at: Date | null;
	correction_release_mode: CorrectionReleaseMode;
	correction_release_at: Date | null;
	allow_late_submission: boolean;
	max_attempts: number;
	time_limit_minutes: number | null;
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
