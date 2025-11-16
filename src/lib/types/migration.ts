/**
 * TypeScript types for the TinyMath to UbuMaths v2 question migration
 * These types support the migration tracking and state management system
 */

/**
 * Migration status for individual questions
 */
export type MigrationStatus =
	| 'pending' // Not yet processed
	| 'converted' // Syntax converted successfully
	| 'imported' // Imported to new database
	| 'validated' // Validation tests passed
	| 'failed'; // Migration failed, needs manual review

/**
 * Migration phase (1-4)
 */
export type MigrationPhase = 1 | 2 | 3 | 4;

/**
 * Phase status in the overall migration
 */
export type PhaseStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Database row type for migration_tracking table
 */
export interface MigrationTracking {
	id: string;
	old_question_hash: string;
	old_question_index: number;
	old_description: string;
	migration_status: MigrationStatus;
	phase: MigrationPhase | null;
	new_template_id: string | null;
	conversion_errors: ConversionError[];
	conversion_notes: string | null;
	converted_at: string | null;
	imported_at: string | null;
	validated_at: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Database row type for migration_images table
 */
export interface MigrationImage {
	id: string;
	old_path: string;
	new_path: string;
	migrated_at: string | null;
	file_size: number | null;
	migration_status: 'pending' | 'migrated' | 'failed';
	error_message: string | null;
	created_at: string;
}

/**
 * Structured error information for conversion failures
 */
export interface ConversionError {
	code: string; // Error code for categorization
	message: string; // Human-readable message
	field?: string; // Which field caused the error
	originalValue?: unknown; // Original value that failed
	attemptedFix?: string; // What we tried to fix it
	canRetry: boolean; // Whether automated retry is possible
}

/**
 * Individual phase state in migration
 */
export interface PhaseState {
	status: PhaseStatus;
	questionsProcessed: number;
	startDate: string | null;
	endDate: string | null;
	questionsTarget?: number;
	questionsSuccessful?: number;
	questionsFailed?: number;
	lastProcessedIndex?: number;
	lastCheckpoint?: string;
	currentBatch?: number;
	commitHash?: string;
	notes?: string;
	successRate?: number;
}

/**
 * Overall migration state
 */
export interface MigrationState {
	version: string;
	currentPhase: MigrationPhase;
	lastUpdated: string | null;
	phases: {
		'1': PhaseState;
		'2': PhaseState;
		'3': PhaseState;
		'4': PhaseState;
	};
	totalQuestions: number;
	lastProcessedIndex: number;
	failedQuestionIndices: number[];
}

/**
 * Failed question tracking
 */
export interface FailedQuestion {
	id: number;
	phase: MigrationPhase;
	reason: string;
	retryInPhase?: MigrationPhase;
	requiresManualReview?: boolean;
}

/**
 * Question to be migrated (input format)
 */
export interface QuestionToMigrate {
	id: number;
	type: 'Choice' | 'Choices' | 'FillIn' | 'ResultOrRewrite' | 'AnswerField';
	statement: string;
	answer?: string | string[];
	correction?: {
		text?: string;
		details?: string;
		steps?: string[];
		hints?: string[];
	};
	image?: string;
	difficulty?: number;
	tags?: string[];
	theme?: string;
	domain?: string;
	subdomain?: string;
	grade?: string;
	options?: Record<string, unknown>;
	seed?: number;
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Result of state validation
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	suggestions: string[];
}

/**
 * Resume point information
 */
export interface ResumePoint {
	phase: MigrationPhase;
	lastProcessedIndex: number;
	questionsProcessed: number;
	lastCheckpoint: string | null;
}

/**
 * Phase completion statistics
 */
export interface PhaseCompletionStats {
	questionsProcessed: number;
	questionsSuccessful: number;
	questionsFailed: number;
	successRate: number;
	duration: number; // in milliseconds
	errors: ConversionError[];
}
