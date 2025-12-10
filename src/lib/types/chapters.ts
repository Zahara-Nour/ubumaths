/**
 * Chapter System Types
 * Clean application types for the class chapters feature.
 *
 * These types use camelCase and are designed for frontend use.
 * Use converter functions to transform between DB (snake_case) and App (camelCase).
 */

import type { Database } from './database';

// ===========================================================================
// DATABASE ROW TYPES (snake_case, from database.ts)
// ===========================================================================

export type DbClassChapter = Database['public']['Tables']['class_chapters']['Row'];
export type DbChapterDocument = Database['public']['Tables']['chapter_documents']['Row'];
export type DbChapterQuizQuestion = Database['public']['Tables']['chapter_quiz_questions']['Row'];
export type DbChapterQuizResult = Database['public']['Tables']['chapter_quiz_results']['Row'];
export type DbChapterChecklistItem = Database['public']['Tables']['chapter_checklist_items']['Row'];
export type DbStudentChecklistProgress =
	Database['public']['Tables']['student_checklist_progress']['Row'];
export type DbChapterExercise = Database['public']['Tables']['chapter_exercises']['Row'];
export type DbOrphanedDocument = Database['public']['Tables']['orphaned_documents']['Row'];

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

/**
 * Document source types
 */
export type DocumentSourceType = 'upload' | 'google_drive';

/**
 * Available chapter icons (Lucide icon names)
 * Tuple type required for Zod enum compatibility
 */
export const CHAPTER_ICONS: readonly [string, ...string[]] = [
	'book',
	'calculator',
	'compass',
	'lightbulb',
	'target',
	'star',
	'trophy',
	'flag',
	'rocket',
	'puzzle',
	'brain',
	'chart-bar',
	'chart-line',
	'percent',
	'sigma',
	'pi',
	'square-root',
	'ruler',
	'shapes',
	'cube'
];

export type ChapterIcon =
	| 'book'
	| 'calculator'
	| 'compass'
	| 'lightbulb'
	| 'target'
	| 'star'
	| 'trophy'
	| 'flag'
	| 'rocket'
	| 'puzzle'
	| 'brain'
	| 'chart-bar'
	| 'chart-line'
	| 'percent'
	| 'sigma'
	| 'pi'
	| 'square-root'
	| 'ruler'
	| 'shapes'
	| 'cube';

/**
 * Available chapter colors (Tailwind-compatible)
 * Tuple type required for Zod enum compatibility
 */
export const CHAPTER_COLORS: readonly [string, ...string[]] = [
	'slate',
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose'
];

export type ChapterColor =
	| 'slate'
	| 'red'
	| 'orange'
	| 'amber'
	| 'yellow'
	| 'lime'
	| 'green'
	| 'emerald'
	| 'teal'
	| 'cyan'
	| 'sky'
	| 'blue'
	| 'indigo'
	| 'violet'
	| 'purple'
	| 'fuchsia'
	| 'pink'
	| 'rose';

// ===========================================================================
// APPLICATION TYPES (camelCase)
// ===========================================================================

/**
 * Class chapter - main container for course content
 */
export interface ClassChapter {
	id: string;
	classId: string;
	teacherId: string;
	title: string;
	description: string | null;
	displayOrder: number;
	isVisible: boolean;
	color: ChapterColor | null;
	icon: ChapterIcon | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Chapter document - file attached to a chapter
 */
export interface ChapterDocument {
	id: string;
	chapterId: string;
	title: string;
	description: string | null;
	sourceType: DocumentSourceType;
	/** Storage path for uploaded files */
	storagePath: string | null;
	/** Original file name */
	fileName: string | null;
	/** MIME type (e.g., 'application/pdf') */
	mimeType: string | null;
	/** File size in bytes */
	fileSize: number | null;
	/** Google Drive file ID for linked files */
	googleFileId: string | null;
	/** Google Drive URL for direct access */
	googleDriveUrl: string | null;
	/** Thumbnail URL for preview */
	thumbnailUrl: string | null;
	displayOrder: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Chapter quiz question - links a question template to a chapter
 */
export interface ChapterQuizQuestion {
	id: string;
	chapterId: string;
	questionTemplateId: string;
	/** Optional points override (null = use default) */
	pointsOverride: number | null;
	displayOrder: number;
	createdAt: string;
}

/**
 * Chapter quiz result - student's answer to a quiz question
 */
export interface ChapterQuizResult {
	id: string;
	studentId: string;
	chapterQuizQuestionId: string;
	attemptNumber: number;
	isCorrect: boolean;
	submittedAnswer: string;
	pointsEarned: number;
	submittedAt: string;
	timeSpentSeconds: number | null;
}

/**
 * Chapter checklist item - an item students can check off
 */
export interface ChapterChecklistItem {
	id: string;
	chapterId: string;
	content: string;
	description: string | null;
	displayOrder: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Student checklist progress - tracks completion of checklist items
 */
export interface StudentChecklistProgress {
	id: string;
	studentId: string;
	checklistItemId: string;
	isCompleted: boolean;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Chapter exercise - links an exercise to a chapter
 */
export interface ChapterExercise {
	id: string;
	chapterId: string;
	exerciseId: string;
	displayOrder: number;
	createdAt: string;
}

/**
 * Orphaned document - document from a deleted chapter
 */
export interface OrphanedDocument {
	id: string;
	teacherId: string;
	originalDocumentId: string;
	originalChapterId: string;
	originalClassId: string;
	originalCreatedAt: string | null;
	title: string;
	fileName: string;
	orphanedStoragePath: string;
	mimeType: string | null;
	fileSize: number | null;
	orphanedAt: string;
}

// ===========================================================================
// ENRICHED TYPES (with nested content)
// ===========================================================================

/**
 * Chapter with all its content loaded
 */
export interface ChapterWithContent extends ClassChapter {
	documents: ChapterDocument[];
	quizQuestions: ChapterQuizQuestion[];
	checklistItems: ChapterChecklistItem[];
	exercises: ChapterExercise[];
}

/**
 * Chapter progress statistics for a student
 */
export interface ChapterProgress {
	chapterId: string;
	studentId: string;
	/** Total checklist items in chapter */
	totalChecklistItems: number;
	/** Completed checklist items */
	completedChecklistItems: number;
	/** Checklist completion percentage (0-100) */
	checklistProgress: number;
	/** Total quiz questions in chapter */
	totalQuizQuestions: number;
	/** Correctly answered quiz questions (best attempt) */
	correctQuizQuestions: number;
	/** Quiz score percentage (0-100) */
	quizScore: number;
	/** Total points earned from quiz */
	totalPointsEarned: number;
	/** Maximum possible points from quiz */
	maxPossiblePoints: number;
	/** Last activity timestamp */
	lastActivityAt: string | null;
}

/**
 * Chapter summary for list views
 */
export interface ChapterSummary extends ClassChapter {
	/** Number of documents */
	documentCount: number;
	/** Number of quiz questions */
	quizQuestionCount: number;
	/** Number of checklist items */
	checklistItemCount: number;
	/** Number of exercises */
	exerciseCount: number;
}

/**
 * Student view of a chapter with their progress
 */
export interface StudentChapterView extends ChapterWithContent {
	progress: ChapterProgress;
	/** Checklist items with completion status */
	checklistItemsWithProgress: (ChapterChecklistItem & {
		isCompleted: boolean;
		completedAt: string | null;
	})[];
	/** Quiz questions with student's best result */
	quizQuestionsWithResults: (ChapterQuizQuestion & {
		bestResult: ChapterQuizResult | null;
		attemptsCount: number;
	})[];
}

// ===========================================================================
// CONVERTER FUNCTIONS (DB -> App)
// ===========================================================================

/**
 * Convert database chapter to app type
 */
export function dbChapterToApp(db: DbClassChapter): ClassChapter {
	return {
		id: db.id,
		classId: db.class_id,
		teacherId: db.teacher_id,
		title: db.title,
		description: db.description,
		displayOrder: db.display_order,
		isVisible: db.is_visible,
		color: db.color as ChapterColor | null,
		icon: db.icon as ChapterIcon | null,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

/**
 * Convert database document to app type
 */
export function dbDocumentToApp(db: DbChapterDocument): ChapterDocument {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		title: db.title,
		description: db.description,
		sourceType: db.source_type as DocumentSourceType,
		storagePath: db.storage_path,
		fileName: db.file_name,
		mimeType: db.mime_type,
		fileSize: db.file_size,
		googleFileId: db.google_file_id,
		googleDriveUrl: db.google_drive_url,
		thumbnailUrl: db.thumbnail_url,
		displayOrder: db.display_order,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

/**
 * Convert database quiz question to app type
 */
export function dbQuizQuestionToApp(db: DbChapterQuizQuestion): ChapterQuizQuestion {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		questionTemplateId: db.question_template_id,
		pointsOverride: db.points_override,
		displayOrder: db.display_order,
		createdAt: db.created_at
	};
}

/**
 * Convert database quiz result to app type
 */
export function dbQuizResultToApp(db: DbChapterQuizResult): ChapterQuizResult {
	return {
		id: db.id,
		studentId: db.student_id,
		chapterQuizQuestionId: db.chapter_quiz_question_id,
		attemptNumber: db.attempt_number,
		isCorrect: db.is_correct,
		submittedAnswer: db.submitted_answer,
		pointsEarned: db.points_earned,
		submittedAt: db.submitted_at,
		timeSpentSeconds: db.time_spent_seconds
	};
}

/**
 * Convert database checklist item to app type
 */
export function dbChecklistItemToApp(db: DbChapterChecklistItem): ChapterChecklistItem {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		content: db.content,
		description: db.description,
		displayOrder: db.display_order,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

/**
 * Convert database checklist progress to app type
 */
export function dbChecklistProgressToApp(db: DbStudentChecklistProgress): StudentChecklistProgress {
	return {
		id: db.id,
		studentId: db.student_id,
		checklistItemId: db.checklist_item_id,
		isCompleted: db.is_completed,
		completedAt: db.completed_at,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

/**
 * Convert database chapter exercise to app type
 */
export function dbExerciseToApp(db: DbChapterExercise): ChapterExercise {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		exerciseId: db.exercise_id,
		displayOrder: db.display_order,
		createdAt: db.created_at
	};
}

/**
 * Convert database orphaned document to app type
 */
export function dbOrphanedDocumentToApp(db: DbOrphanedDocument): OrphanedDocument {
	return {
		id: db.id,
		teacherId: db.teacher_id,
		originalDocumentId: db.original_document_id,
		originalChapterId: db.original_chapter_id,
		originalClassId: db.original_class_id,
		originalCreatedAt: db.original_created_at,
		title: db.title,
		fileName: db.file_name,
		orphanedStoragePath: db.orphaned_storage_path,
		mimeType: db.mime_type,
		fileSize: db.file_size,
		orphanedAt: db.orphaned_at
	};
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(completed: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((completed / total) * 100);
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentage: number): string {
	if (percentage >= 80) return 'text-green-600 dark:text-green-400';
	if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
	if (percentage >= 20) return 'text-orange-600 dark:text-orange-400';
	return 'text-red-600 dark:text-red-400';
}

/**
 * Get chapter color classes for styling
 */
export function getChapterColorClasses(color: ChapterColor | null): {
	bg: string;
	border: string;
	text: string;
} {
	if (!color) {
		return {
			bg: 'bg-slate-100 dark:bg-slate-800',
			border: 'border-slate-200 dark:border-slate-700',
			text: 'text-slate-700 dark:text-slate-300'
		};
	}

	return {
		bg: `bg-${color}-100 dark:bg-${color}-900/30`,
		border: `border-${color}-200 dark:border-${color}-800`,
		text: `text-${color}-700 dark:text-${color}-300`
	};
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
	if (bytes === null || bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Get file type label from MIME type
 */
export function getFileTypeLabel(mimeType: string | null): string {
	if (!mimeType) return 'Fichier';

	const mimeToLabel: Record<string, string> = {
		'application/pdf': 'PDF',
		'image/png': 'Image PNG',
		'image/jpeg': 'Image JPEG',
		'image/gif': 'Image GIF',
		'image/webp': 'Image WebP',
		'video/mp4': 'Video MP4',
		'video/webm': 'Video WebM',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
		'application/vnd.google-apps.document': 'Google Docs',
		'application/vnd.google-apps.spreadsheet': 'Google Sheets',
		'application/vnd.google-apps.presentation': 'Google Slides'
	};

	return mimeToLabel[mimeType] || 'Fichier';
}
