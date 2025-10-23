/**
 * Riddle System Types
 * Types for math riddles/enigmas with automatic and manual validation
 */

// ===========================================================================
// RIDDLE CONFIGURATION
// ===========================================================================

/**
 * Riddle status
 * - draft: Being created, not yet published
 * - published: Active and can be assigned or used as riddle of the day
 */
export type RiddleStatus = 'draft' | 'published';

/**
 * Riddle difficulty level (1-3)
 * Affects gidouilles reward with degressive multiplier:
 * - 1st attempt: difficulty × 3
 * - 2nd attempt: difficulty × 2
 * - 3rd+ attempts: difficulty × 1
 */
export type RiddleDifficulty = 1 | 2 | 3;

/**
 * Answer validation types for automatic validation
 */
export type AnswerType = 'numerical' | 'text' | 'qcm' | 'math';

/**
 * Answer configuration for automatic validation
 * If null, requires manual validation by teacher
 */
export interface AnswerConfig {
	type: AnswerType;
	value: string | number | string[]; // Expected answer(s)
	options?: {
		// For numerical: tolerance, precision
		tolerance?: number;
		precision?: number;
		// For text: case sensitive
		caseSensitive?: boolean;
		// For QCM: choices array
		choices?: string[];
		multipleAnswers?: boolean;
		// For math: evaluation mode
		exactMatch?: boolean;
	};
}

/**
 * Riddle attempt status
 */
export type AttemptStatus = 'pending' | 'correct' | 'incorrect';

// ===========================================================================
// DATABASE TYPES
// ===========================================================================

/**
 * Riddle database row
 * Corresponds to public.riddles table
 */
export interface DbRiddle {
	id: string;
	riddle_number: number;
	title: string;
	genre: string | null;
	difficulty: RiddleDifficulty;
	statement: string; // HTML rich text
	correction: string; // HTML rich text
	image_url: string | null;
	answer: AnswerConfig | null; // null = manual validation required
	created_by: string;
	status: RiddleStatus;
	created_at: string;
	updated_at: string;
}

/**
 * Riddle assignment database row
 * Corresponds to public.riddle_assignments table
 */
export interface DbRiddleAssignment {
	id: string;
	riddle_id: string;
	class_id: string | null;
	student_id: string | null;
	assigned_by: string;
	assigned_at: string;
}

/**
 * Riddle of the day database row
 * Corresponds to public.riddle_of_the_day table
 */
export interface DbRiddleOfTheDay {
	id: string;
	riddle_id: string;
	date: string; // ISO date string
	auto_selected: boolean;
	selected_by: string | null;
	created_at: string;
}

/**
 * Riddle attempt database row
 * Corresponds to public.riddle_attempts table
 */
export interface DbRiddleAttempt {
	id: string;
	riddle_id: string;
	student_id: string;
	attempt_number: number;
	submitted_answer: Record<string, unknown>; // JSONB structure depends on riddle type
	is_correct: boolean | null; // null = awaiting manual validation
	validated_by: string | null;
	validated_at: string | null;
	gidouilles_awarded: number;
	created_at: string;
}

/**
 * Riddle stats database row (from view)
 * Corresponds to public.riddle_stats view
 */
export interface DbRiddleStats {
	riddle_id: string;
	riddle_number: number;
	title: string;
	genre: string | null;
	difficulty: RiddleDifficulty;
	created_by: string;
	unique_students: number;
	total_attempts: number;
	avg_attempts_to_success: number;
	successful_attempts: number;
	success_rate_percent: number;
	first_attempts: number;
	second_attempts: number;
	third_plus_attempts: number;
	pending_validations: number;
	total_gidouilles_awarded: number;
}

/**
 * Riddle progress database row (from view)
 * Corresponds to public.riddle_progress view
 */
export interface DbRiddleProgress {
	student_id: string;
	firstname: string | null;
	lastname: string | null;
	avatar_url: string | null;
	riddles_completed: number;
	total_attempts: number;
	riddles_gidouilles: number;
	last_success_at: string | null;
	rank: number;
}

/**
 * Riddle student history database row (from view)
 * Corresponds to public.riddle_student_history view
 */
export interface DbRiddleStudentHistory {
	student_id: string;
	riddle_id: string;
	riddle_number: number;
	riddle_title: string;
	genre: string | null;
	difficulty: RiddleDifficulty;
	first_attempt_number: number;
	latest_attempt_number: number;
	total_attempts: number;
	ever_succeeded: boolean;
	first_success_at: string | null;
	max_gidouilles_earned: number;
	total_gidouilles_earned: number;
	last_attempt_at: string | null;
}

// ===========================================================================
// ENRICHED TYPES (for UI)
// ===========================================================================

/**
 * Riddle with creator info
 * Used in teacher dashboard
 */
export interface RiddleWithCreator extends DbRiddle {
	creator?: {
		firstname: string | null;
		lastname: string | null;
	};
	stats?: DbRiddleStats;
}

/**
 * Riddle with student attempt info
 * Used in student dashboard
 */
export interface RiddleWithAttempts extends DbRiddle {
	student_attempts: DbRiddleAttempt[];
	best_attempt?: DbRiddleAttempt;
	can_attempt: boolean; // Based on assignment or riddle of the day
	is_riddle_of_the_day: boolean;
}

/**
 * Riddle of the day with riddle details
 */
export interface RiddleOfTheDayWithDetails extends DbRiddleOfTheDay {
	riddle: DbRiddle;
	student_attempt?: DbRiddleAttempt; // Current user's latest attempt
}

/**
 * Attempt with student and riddle info
 * Used in teacher validation page
 */
export interface AttemptWithDetails extends DbRiddleAttempt {
	riddle: DbRiddle;
	student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		avatar_url: string | null;
	};
}

// ===========================================================================
// FORM DATA TYPES
// ===========================================================================

/**
 * Data for creating a new riddle
 */
export interface CreateRiddleData {
	title: string;
	genre?: string;
	difficulty: RiddleDifficulty;
	statement: string;
	correction: string;
	image_url?: string;
	answer?: AnswerConfig;
	status?: RiddleStatus;
}

/**
 * Data for updating a riddle
 */
export interface UpdateRiddleData extends Partial<CreateRiddleData> {
	id: string;
}

/**
 * Data for submitting a riddle attempt
 */
export interface SubmitAttemptData {
	riddle_id: string;
	submitted_answer: Record<string, unknown>;
}

/**
 * Data for validating an attempt (teacher)
 */
export interface ValidateAttemptData {
	attempt_id: string;
	is_correct: boolean;
	feedback?: string; // Optional feedback message
}

/**
 * Data for assigning a riddle
 */
export interface AssignRiddleData {
	riddle_id: string;
	class_id?: string;
	student_id?: string;
}

/**
 * Data for setting riddle of the day
 */
export interface SetRiddleOfTheDayData {
	riddle_id: string;
	date: string; // ISO date string
}

// ===========================================================================
// UTILITY TYPES
// ===========================================================================

/**
 * Riddle list filters
 */
export interface RiddleFilters {
	status?: RiddleStatus;
	difficulty?: RiddleDifficulty;
	genre?: string;
	created_by?: string;
	search?: string;
}

/**
 * Attempt list filters
 */
export interface AttemptFilters {
	riddle_id?: string;
	student_id?: string;
	is_correct?: boolean | null; // null for pending validations
	validated?: boolean;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
	rank: number;
	student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		avatar_url: string | null;
	};
	riddles_completed: number;
	total_gidouilles: number;
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Calculate gidouilles for an attempt
 * Formula: difficulty × multiplier
 * - 1st attempt: multiplier = 3
 * - 2nd attempt: multiplier = 2
 * - 3rd+ attempts: multiplier = 1
 */
export function calculateGidouilles(difficulty: RiddleDifficulty, attemptNumber: number): number {
	const multiplier = attemptNumber === 1 ? 3 : attemptNumber === 2 ? 2 : 1;
	return difficulty * multiplier;
}

/**
 * Get difficulty label in French
 */
export function getDifficultyLabel(difficulty: RiddleDifficulty): string {
	switch (difficulty) {
		case 1:
			return 'Facile';
		case 2:
			return 'Moyen';
		case 3:
			return 'Difficile';
	}
}

/**
 * Get difficulty color class
 */
export function getDifficultyColor(difficulty: RiddleDifficulty): string {
	switch (difficulty) {
		case 1:
			return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
		case 2:
			return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
		case 3:
			return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
	}
}

/**
 * Get status label in French
 */
export function getStatusLabel(status: RiddleStatus): string {
	switch (status) {
		case 'draft':
			return 'Brouillon';
		case 'published':
			return 'Publiée';
	}
}

/**
 * Get status color class
 */
export function getStatusColor(status: RiddleStatus): string {
	switch (status) {
		case 'draft':
			return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
		case 'published':
			return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
	}
}

/**
 * Get attempt status label in French
 */
export function getAttemptStatusLabel(isCorrect: boolean | null): string {
	if (isCorrect === null) return 'En attente de validation';
	return isCorrect ? 'Correct' : 'Incorrect';
}

/**
 * Get attempt status color class
 */
export function getAttemptStatusColor(isCorrect: boolean | null): string {
	if (isCorrect === null)
		return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
	return isCorrect
		? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
		: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}

/**
 * Format attempt number (1er, 2ème, 3ème, etc.)
 */
export function formatAttemptNumber(attemptNumber: number): string {
	if (attemptNumber === 1) return '1ère';
	return `${attemptNumber}ème`;
}

/**
 * Check if answer config is valid
 */
export function isValidAnswerConfig(config: AnswerConfig | null): boolean {
	if (config === null) return true; // Manual validation is valid

	if (!config.type || !config.value) return false;

	switch (config.type) {
		case 'numerical':
			return typeof config.value === 'number';
		case 'text':
			return typeof config.value === 'string';
		case 'qcm':
			return Array.isArray(config.value) && config.options?.choices !== undefined;
		case 'math':
			return typeof config.value === 'string';
		default:
			return false;
	}
}

/**
 * Get answer type label in French
 */
export function getAnswerTypeLabel(type: AnswerType): string {
	switch (type) {
		case 'numerical':
			return 'Numérique';
		case 'text':
			return 'Texte';
		case 'qcm':
			return 'QCM';
		case 'math':
			return 'Expression mathématique';
	}
}
