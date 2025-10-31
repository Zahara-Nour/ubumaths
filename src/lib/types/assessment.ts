/**
 * Assessment System Types
 * Types for teacher-created assessments/evaluations with assignments
 */

import type { CartItem } from '$lib/stores/questionCart.svelte';
import {
	formatDeadline as formatDeadlineUtil,
	isDeadlinePassed as isDeadlinePassedUtil
} from '$lib/utils/dates';

// ===========================================================================
// ASSESSMENT CONFIGURATION
// ===========================================================================

/**
 * Assessment status
 * - draft: Being created, not yet published
 * - published: Active and can be assigned to students
 * - archived: No longer active
 */
export type AssessmentStatus = 'draft' | 'published' | 'archived';

/**
 * Student assessment status (derived)
 * - not_started: Never attempted
 * - in_progress: Started but not completed
 * - completed: At least one attempt completed
 * - expired: Deadline passed without completion
 */
export type StudentAssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';

/**
 * Assessment settings
 * Configurable parameters for an assessment
 */
export interface AssessmentSettings {
	max_attempts: number | null; // null = unlimited attempts
	time_limit: number | null; // Total time limit in seconds, null = no limit
	deadline: string | null; // ISO timestamp, null = no deadline
	shuffle_questions: boolean; // Whether to randomize question order
}

/**
 * Default assessment settings
 */
export const DEFAULT_ASSESSMENT_SETTINGS: AssessmentSettings = {
	max_attempts: null, // Unlimited attempts by default
	time_limit: null, // No time limit by default
	deadline: null, // No deadline by default
	shuffle_questions: true // Randomize by default
};

// ===========================================================================
// DATABASE TYPES
// ===========================================================================

/**
 * Assessment database row
 * Corresponds to public.assessments table
 */
export interface DbAssessment {
	id: string;
	title: string;
	grade: string;
	description: string | null;
	created_by: string;
	academic_period_id: string | null;
	categories: CartItem[]; // Stored as JSONB
	settings: AssessmentSettings; // Stored as JSONB
	status: AssessmentStatus;
	created_at: string;
	updated_at: string;
}

/**
 * Assessment assignment database row
 * Corresponds to public.assessment_assignments table
 */
export interface DbAssessmentAssignment {
	id: string;
	assessment_id: string;
	class_id: string | null;
	student_id: string | null;
	assigned_by: string;
	assigned_at: string;
}

/**
 * Assessment result database row (from view)
 * Corresponds to public.assessment_results view
 */
export interface DbAssessmentResult {
	assignment_id: string;
	assessment_id: string;
	assessment_title: string;
	assessment_grade: string;
	class_id: string | null;
	student_id: string | null;
	student_user_id: string;
	student_firstname: string | null;
	student_lastname: string | null;
	class_name: string | null;
	best_score: number | null;
	attempts_count: number;
	last_attempt_at: string | null;
	status: StudentAssessmentStatus;
	total_questions: number | null;
}

// ===========================================================================
// ENRICHED TYPES (for UI)
// ===========================================================================

/**
 * Assessment with creator info
 * Used in teacher dashboard
 */
export interface AssessmentWithCreator extends DbAssessment {
	creator?: {
		firstname: string | null;
		lastname: string | null;
	};
	assignments_count?: number; // Number of students/classes assigned
}

/**
 * Assignment with assessment details
 * Used in student dashboard
 */
export interface AssignmentWithDetails extends DbAssessmentAssignment {
	assessment: DbAssessment;
	attempts_count: number;
	best_score: number | null;
	last_attempt_at: string | null;
	status: StudentAssessmentStatus;
}

/**
 * Assessment result with full details
 * Used in teacher results page
 */
export interface AssessmentResultWithDetails extends DbAssessmentResult {
	// All fields from DbAssessmentResult plus computed fields
	score_percentage: number | null; // (best_score / 10) * 100
}

// ===========================================================================
// FORM DATA TYPES
// ===========================================================================

/**
 * Data for creating a new assessment
 */
export interface CreateAssessmentData {
	title: string;
	grade: string;
	description?: string;
	categories: CartItem[];
	settings: AssessmentSettings;
	status: 'draft' | 'published'; // Can only create as draft or published
}

/**
 * Data for updating an assessment
 */
export interface UpdateAssessmentData {
	title?: string;
	grade?: string;
	description?: string;
	settings?: Partial<AssessmentSettings>;
	status?: AssessmentStatus;
}

/**
 * Data for assigning an assessment
 */
export interface AssignAssessmentData {
	assessment_id: string;
	class_ids?: string[]; // Assign to classes
	student_ids?: string[]; // Assign to individual students
}

// ===========================================================================
// VALIDATION & ATTEMPT MANAGEMENT
// ===========================================================================

/**
 * Attempt validation result
 * Checks if student can start a new attempt
 */
export interface AttemptValidation {
	can_attempt: boolean;
	reason?: string; // Error message if can_attempt is false
	attempts_remaining: number | null; // null = unlimited
	deadline_passed: boolean;
	current_attempts: number;
}

/**
 * Assignment context for test session
 * Passed to TestInteractive when in assignment mode
 */
export interface AssignmentContext {
	assignment_id: string;
	assessment_id: string;
	assessment_title: string;
	settings: AssessmentSettings;
	attempts_remaining: number | null;
}

// ===========================================================================
// STATISTICS
// ===========================================================================

/**
 * Assessment statistics (for teacher dashboard)
 */
export interface AssessmentStatistics {
	assessment_id: string;
	total_assigned: number; // Total students assigned
	not_started: number;
	in_progress: number;
	completed: number;
	expired: number;
	average_score: number | null; // Average of best scores
	min_score: number | null;
	max_score: number | null;
	completion_rate: number; // Percentage completed
}

/**
 * Class statistics for an assessment
 */
export interface ClassAssessmentStatistics {
	class_id: string;
	class_name: string;
	total_students: number;
	completed: number;
	average_score: number | null;
	completion_rate: number;
}

// ===========================================================================
// HELPER TYPES
// ===========================================================================

/**
 * Grade levels
 */
export const GRADE_LEVELS = ['6ème', '5ème', '4ème', '3ème'] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

/**
 * Assessment list filters
 */
export interface AssessmentFilters {
	status?: AssessmentStatus;
	grade?: string;
	search?: string;
}

/**
 * Results table filters
 */
export interface ResultsFilters {
	class_id?: string;
	status?: StudentAssessmentStatus;
	search?: string; // Search by student name
}

/**
 * Results table sort
 */
export type ResultsSortField = 'name' | 'score' | 'attempts' | 'date';
export type ResultsSortDirection = 'asc' | 'desc';

export interface ResultsSort {
	field: ResultsSortField;
	direction: ResultsSortDirection;
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Calculate attempts remaining
 */
export function getAttemptsRemaining(
	currentAttempts: number,
	maxAttempts: number | null
): number | null {
	if (maxAttempts === null) return null; // Unlimited
	return Math.max(0, maxAttempts - currentAttempts);
}

/**
 * Determine student status for an assignment
 */
export function getStudentStatus(
	attemptsCount: number,
	lastAttemptAt: string | null,
	deadline: string | null
): StudentAssessmentStatus {
	const deadlinePassed = isDeadlinePassedUtil(deadline);

	if (attemptsCount === 0) {
		return deadlinePassed ? 'expired' : 'not_started';
	}

	if (lastAttemptAt === null) {
		// Started but no completed attempt
		return 'in_progress';
	}

	return 'completed';
}

/**
 * Get status badge color
 */
export function getStatusColor(status: StudentAssessmentStatus): string {
	switch (status) {
		case 'not_started':
			return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
		case 'in_progress':
			return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
		case 'completed':
			return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
		case 'expired':
			return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
	}
}

/**
 * Get status label (French)
 */
export function getStatusLabel(status: StudentAssessmentStatus): string {
	switch (status) {
		case 'not_started':
			return 'Non commencé';
		case 'in_progress':
			return 'En cours';
		case 'completed':
			return 'Terminé';
		case 'expired':
			return 'Expiré';
	}
}
