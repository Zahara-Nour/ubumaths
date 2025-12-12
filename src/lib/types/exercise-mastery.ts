/**
 * Exercise Mastery Types
 * ======================
 * Types for student exercise mastery tracking system.
 * Students can mark exercises as mastered, needs review, or not worked.
 */

// Mastery status values
export const MASTERY_STATUSES = ['not_worked', 'mastered', 'needs_review'] as const;
export type MasteryStatus = (typeof MASTERY_STATUSES)[number];

// Database row type (matches student_exercise_mastery table)
export interface StudentExerciseMasteryRow {
	id: string;
	student_id: string;
	exercise_id: string;
	status: MasteryStatus;
	updated_at: string;
}

// Map type for UI consumption: exercise_id -> status
export type MasteryStatusMap = Map<string, MasteryStatus>;

// API response types
export interface ExerciseMasteryListResponse {
	mastery: Array<{
		exercise_id: string;
		status: MasteryStatus;
	}>;
}

export interface ExerciseMasteryUpdateResponse {
	success: true;
	exercise_id: string;
	status: MasteryStatus;
}

// UI labels for display
export const MASTERY_LABELS: Record<MasteryStatus, string> = {
	not_worked: 'Non travaillé',
	mastered: 'Maîtrisé',
	needs_review: 'À retravailler'
};

// UI colors for styling
export const MASTERY_COLORS: Record<MasteryStatus, { bg: string; text: string; border: string }> = {
	not_worked: {
		bg: 'bg-muted',
		text: 'text-muted-foreground',
		border: 'border-muted'
	},
	mastered: {
		bg: 'bg-green-100 dark:bg-green-950/50',
		text: 'text-green-700 dark:text-green-300',
		border: 'border-green-300 dark:border-green-800'
	},
	needs_review: {
		bg: 'bg-orange-100 dark:bg-orange-950/50',
		text: 'text-orange-700 dark:text-orange-300',
		border: 'border-orange-300 dark:border-orange-800'
	}
};
