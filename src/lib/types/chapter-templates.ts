/**
 * Chapter Templates Types
 * Clean application types for the chapter templates feature.
 *
 * These types use camelCase and are designed for frontend use.
 * Use converter functions to transform between DB (snake_case) and App (camelCase).
 */

import type { ChapterColor, ChapterIcon } from './chapters';

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

/**
 * Template status values
 */
export type TemplateStatus = 'draft' | 'published' | 'archived';

/**
 * Available grade levels
 */
export const GRADE_LEVELS = ['6', '5', '4', '3', '2', '1', 'T'] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

// ===========================================================================
// CONTENT SNAPSHOT TYPES
// ===========================================================================

/**
 * Document reference in template snapshot
 */
export interface TemplateDocumentSnapshot {
	title: string;
	description: string | null;
	documentUrl: string;
	sourceType: 'external_url' | 'google_drive';
	mimeType: string | null;
	displayOrder: number;
}

/**
 * Quiz question reference in template snapshot
 */
export interface TemplateQuizQuestionSnapshot {
	questionTemplateId: string;
	pointsOverride: number | null;
	displayOrder: number;
}

/**
 * Checklist item in template snapshot (copied content)
 */
export interface TemplateChecklistItemSnapshot {
	content: string;
	description: string | null;
	displayOrder: number;
}

/**
 * Exercise reference in template snapshot
 */
export interface TemplateExerciseSnapshot {
	exerciseId: string;
	displayOrder: number;
}

/**
 * Complete template content snapshot
 */
export interface TemplateContentSnapshot {
	documents: TemplateDocumentSnapshot[];
	quizQuestions: TemplateQuizQuestionSnapshot[];
	checklistItems: TemplateChecklistItemSnapshot[];
	exercises: TemplateExerciseSnapshot[];
}

/**
 * Empty content snapshot
 */
export const EMPTY_CONTENT_SNAPSHOT: TemplateContentSnapshot = {
	documents: [],
	quizQuestions: [],
	checklistItems: [],
	exercises: []
};

// ===========================================================================
// DIFF TYPES
// ===========================================================================

/**
 * Diff entry for a single item
 */
export interface DiffEntry<T> {
	type: 'added' | 'removed' | 'modified';
	item: T;
	previousItem?: T; // Only for 'modified'
}

/**
 * Complete diff between two template versions
 */
export interface TemplateDiff {
	documents: DiffEntry<TemplateDocumentSnapshot>[];
	quizQuestions: DiffEntry<TemplateQuizQuestionSnapshot>[];
	checklistItems: DiffEntry<TemplateChecklistItemSnapshot>[];
	exercises: DiffEntry<TemplateExerciseSnapshot>[];
	/** Summary statistics */
	stats: {
		documentsAdded: number;
		documentsRemoved: number;
		documentsModified: number;
		quizQuestionsAdded: number;
		quizQuestionsRemoved: number;
		quizQuestionsModified: number;
		checklistItemsAdded: number;
		checklistItemsRemoved: number;
		checklistItemsModified: number;
		exercisesAdded: number;
		exercisesRemoved: number;
		exercisesModified: number;
	};
}

// ===========================================================================
// APPLICATION TYPES (camelCase)
// ===========================================================================

/**
 * Chapter template - reusable chapter structure
 */
export interface ChapterTemplate {
	id: string;
	createdBy: string;
	status: TemplateStatus;
	isPublic: boolean;
	title: string;
	description: string | null;
	grades: string[];
	color: ChapterColor | null;
	icon: ChapterIcon | null;
	contentSnapshot: TemplateContentSnapshot;
	instantiationCount: number;
	currentVersion: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Chapter template version - snapshot of template at a point in time
 */
export interface ChapterTemplateVersion {
	id: string;
	templateId: string;
	versionNumber: number;
	createdBy: string;
	contentSnapshot: TemplateContentSnapshot;
	changeSummary: string | null;
	diff: TemplateDiff | null;
	createdAt: string;
}

/**
 * Chapter template instantiation - link between template and chapter
 */
export interface ChapterTemplateInstantiation {
	id: string;
	templateId: string | null;
	templateVersion: number;
	chapterId: string;
	currentTemplateVersion: number | null;
	isDetached: boolean;
	instantiatedAt: string;
	lastMigratedAt: string | null;
}

// ===========================================================================
// ENRICHED TYPES
// ===========================================================================

/**
 * Template with creator info
 */
export interface TemplateWithCreator extends ChapterTemplate {
	creator: {
		id: string;
		fullName: string | null;
		avatarUrl: string | null;
	};
}

/**
 * Template summary for list views
 */
export interface TemplateSummary {
	id: string;
	title: string;
	description: string | null;
	grades: string[];
	color: ChapterColor | null;
	icon: ChapterIcon | null;
	status: TemplateStatus;
	isPublic: boolean;
	instantiationCount: number;
	currentVersion: number;
	createdAt: string;
	updatedAt: string;
	creatorName: string | null;
	isOwner: boolean;
	/** Content counts */
	documentCount: number;
	quizQuestionCount: number;
	checklistItemCount: number;
	exerciseCount: number;
}

/**
 * Template instantiation with update status
 */
export interface InstantiationWithStatus extends ChapterTemplateInstantiation {
	/** Whether an update is available */
	hasUpdate: boolean;
	/** Latest available version (if hasUpdate is true) */
	latestVersion: number | null;
	/** Template title (if not deleted) */
	templateTitle: string | null;
}

/**
 * Migration preview - what will change if migrating
 */
export interface MigrationPreview {
	instantiationId: string;
	chapterId: string;
	fromVersion: number;
	toVersion: number;
	diff: TemplateDiff;
	changeSummary: string | null;
}

// ===========================================================================
// DATABASE ROW TYPES (for reference)
// ===========================================================================

/**
 * Database row type for chapter_templates
 */
export interface DbChapterTemplate {
	id: string;
	created_by: string;
	status: string;
	is_public: boolean;
	title: string;
	description: string | null;
	grades: string[];
	color: string | null;
	icon: string | null;
	content_snapshot: Record<string, unknown>;
	instantiation_count: number;
	current_version: number;
	created_at: string;
	updated_at: string;
}

/**
 * Database row type for chapter_template_versions
 */
export interface DbChapterTemplateVersion {
	id: string;
	template_id: string;
	version_number: number;
	created_by: string;
	content_snapshot: Record<string, unknown>;
	change_summary: string | null;
	diff: Record<string, unknown> | null;
	created_at: string;
}

/**
 * Database row type for chapter_template_instantiations
 */
export interface DbChapterTemplateInstantiation {
	id: string;
	template_id: string | null;
	template_version: number;
	chapter_id: string;
	current_template_version: number | null;
	is_detached: boolean;
	instantiated_at: string;
	last_migrated_at: string | null;
}

// ===========================================================================
// CONVERTER FUNCTIONS (DB -> App)
// ===========================================================================

/**
 * Parse content snapshot from JSONB
 */
export function parseContentSnapshot(json: Record<string, unknown>): TemplateContentSnapshot {
	return {
		documents: Array.isArray(json.documents) ? (json.documents as TemplateDocumentSnapshot[]) : [],
		quizQuestions: Array.isArray(json.quizQuestions)
			? (json.quizQuestions as TemplateQuizQuestionSnapshot[])
			: [],
		checklistItems: Array.isArray(json.checklistItems)
			? (json.checklistItems as TemplateChecklistItemSnapshot[])
			: [],
		exercises: Array.isArray(json.exercises) ? (json.exercises as TemplateExerciseSnapshot[]) : []
	};
}

/**
 * Parse diff from JSONB
 */
export function parseDiff(json: Record<string, unknown> | null): TemplateDiff | null {
	if (!json) return null;
	return json as unknown as TemplateDiff;
}

/**
 * Convert database template to app type
 */
export function dbTemplateToApp(db: DbChapterTemplate): ChapterTemplate {
	return {
		id: db.id,
		createdBy: db.created_by,
		status: db.status as TemplateStatus,
		isPublic: db.is_public,
		title: db.title,
		description: db.description,
		grades: db.grades,
		color: db.color as ChapterColor | null,
		icon: db.icon as ChapterIcon | null,
		contentSnapshot: parseContentSnapshot(db.content_snapshot),
		instantiationCount: db.instantiation_count,
		currentVersion: db.current_version,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

/**
 * Convert database template version to app type
 */
export function dbTemplateVersionToApp(db: DbChapterTemplateVersion): ChapterTemplateVersion {
	return {
		id: db.id,
		templateId: db.template_id,
		versionNumber: db.version_number,
		createdBy: db.created_by,
		contentSnapshot: parseContentSnapshot(db.content_snapshot),
		changeSummary: db.change_summary,
		diff: parseDiff(db.diff),
		createdAt: db.created_at
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
		templateVersion: db.template_version,
		chapterId: db.chapter_id,
		currentTemplateVersion: db.current_template_version,
		isDetached: db.is_detached,
		instantiatedAt: db.instantiated_at,
		lastMigratedAt: db.last_migrated_at
	};
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Check if a template has content (for validation before publishing)
 */
export function hasContent(snapshot: TemplateContentSnapshot): boolean {
	return (
		snapshot.documents.length > 0 ||
		snapshot.quizQuestions.length > 0 ||
		snapshot.checklistItems.length > 0 ||
		snapshot.exercises.length > 0
	);
}

/**
 * Get content counts from snapshot
 */
export function getContentCounts(snapshot: TemplateContentSnapshot): {
	documentCount: number;
	quizQuestionCount: number;
	checklistItemCount: number;
	exerciseCount: number;
	totalCount: number;
} {
	return {
		documentCount: snapshot.documents.length,
		quizQuestionCount: snapshot.quizQuestions.length,
		checklistItemCount: snapshot.checklistItems.length,
		exerciseCount: snapshot.exercises.length,
		totalCount:
			snapshot.documents.length +
			snapshot.quizQuestions.length +
			snapshot.checklistItems.length +
			snapshot.exercises.length
	};
}

/**
 * Format grade levels for display
 */
export function formatGrades(grades: string[]): string {
	if (grades.length === 0) return 'Tous niveaux';
	return grades.map((g) => `${g}e`).join(', ');
}

/**
 * Get status label in French
 */
export function getStatusLabel(status: TemplateStatus): string {
	const labels: Record<TemplateStatus, string> = {
		draft: 'Brouillon',
		published: 'Publie',
		archived: 'Archive'
	};
	return labels[status];
}

/**
 * Get status color classes
 */
export function getStatusColorClasses(status: TemplateStatus): {
	bg: string;
	text: string;
	border: string;
} {
	const colors: Record<TemplateStatus, { bg: string; text: string; border: string }> = {
		draft: {
			bg: 'bg-yellow-100 dark:bg-yellow-900/30',
			text: 'text-yellow-700 dark:text-yellow-300',
			border: 'border-yellow-200 dark:border-yellow-800'
		},
		published: {
			bg: 'bg-green-100 dark:bg-green-900/30',
			text: 'text-green-700 dark:text-green-300',
			border: 'border-green-200 dark:border-green-800'
		},
		archived: {
			bg: 'bg-slate-100 dark:bg-slate-800',
			text: 'text-slate-500 dark:text-slate-400',
			border: 'border-slate-200 dark:border-slate-700'
		}
	};
	return colors[status];
}
