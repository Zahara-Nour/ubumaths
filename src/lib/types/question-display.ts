/**
 * Question Display Component - Type Definitions
 * ==============================================
 *
 * Type definitions for the QuestionDisplay component, which supports
 * both flashcard mode (view-only) and interactive mode (answer validation).
 *
 * @module types/question-display
 */

import type { QuestionInstance } from '$lib/questions/types';

// ============================================================================
// DISPLAY MODES
// ============================================================================

/**
 * Display mode for QuestionDisplay component
 *
 * - flashcard: View-only mode, no answer validation
 * - interactive: Answer input and validation mode
 */
export type QuestionDisplayMode = 'flashcard' | 'interactive';

// ============================================================================
// ANSWER DATA
// ============================================================================

/**
 * User answer data
 *
 * Contains the user's submitted answer along with metadata
 * about correctness, time spent, and attempt number.
 */
export interface AnswerData {
	/** User's answer (can be single value or array for multiple answers) */
	value: string | string[] | number | number[];

	/** Whether the answer is correct */
	isCorrect: boolean;

	/** Time spent on this attempt (seconds) */
	timeSpent: number;

	/** Attempt number (1-indexed) */
	attempts: number;

	/** Timestamp when answer was submitted */
	submittedAt: string;
}

// ============================================================================
// QUESTION STATISTICS
// ============================================================================

/**
 * Question completion statistics
 *
 * Tracks user performance metrics for analytics and progress tracking.
 */
export interface QuestionStats {
	/** Template ID this instance was generated from */
	templateId: string;

	/** Total time spent on question (seconds) */
	timeSpent: number;

	/** Total number of attempts made */
	attempts: number;

	/** Whether user eventually got it correct */
	isCorrect: boolean;

	/** Whether user got it correct on first attempt */
	firstAttemptCorrect: boolean;

	/** When question was completed */
	answeredAt: string;

	/** All answer attempts (for review) */
	answerHistory: AnswerData[];
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for QuestionDisplay component
 */
export interface QuestionDisplayProps {
	/** Display mode (flashcard or interactive) */
	mode: QuestionDisplayMode;

	/** Pre-generated question instance */
	instance: QuestionInstance;

	// --- Callbacks ---

	/** Called when user submits an answer (interactive mode only) */
	onAnswerSubmit?: (answer: AnswerData) => void;

	/** Called when user changes their answer (before submit) */
	onAnswerChange?: (value: string | string[]) => void;

	/** Called when question is completed (all attempts finished) */
	onComplete?: (stats: QuestionStats) => void;

	/** Called when card is flipped */
	onFlip?: (isFlipped: boolean) => void;

	// --- Customization ---

	/** Card size variant */
	size?: 'sm' | 'md' | 'lg';

	/** Auto-show correction after wrong answer (interactive mode) */
	showCorrectionOnWrong?: boolean;

	/** Show confetti animation on correct answer */
	showConfetti?: boolean;

	/** Allow multiple attempts (if false, disables input after first submit) */
	allowMultipleAttempts?: boolean;

	/** Maximum number of attempts allowed (0 = unlimited) */
	maxAttempts?: number;
}

// ============================================================================
// ANSWER INPUT STATE
// ============================================================================

/**
 * Internal state for answer inputs
 */
export interface AnswerInputState {
	/** Current user input value */
	value: string | string[] | number | number[];

	/** Whether user has submitted their answer */
	isSubmitted: boolean;

	/** Whether submission is in progress */
	isSubmitting: boolean;

	/** Whether input is disabled */
	isDisabled: boolean;

	/** Validation result (null if not yet validated) */
	validationResult: ValidationResult | null;
}

/**
 * Answer validation result
 */
export interface ValidationResult {
	/** Whether answer is correct */
	isCorrect: boolean;

	/** Validation message (optional) */
	message?: string;

	/** Detailed feedback (optional) */
	feedback?: string;
}

// ============================================================================
// CHOICE-SPECIFIC TYPES (for QCM)
// ============================================================================

/**
 * Choice selection state (for multiple choice questions)
 */
export interface ChoiceState {
	/** Index of selected choice(s) */
	selectedIndexes: number[];

	/** Whether this choice should be highlighted as correct */
	correctIndexes: number[];

	/** Whether choice is disabled */
	isDisabled: boolean;
}

// ============================================================================
// ORDERING-SPECIFIC TYPES
// ============================================================================

/**
 * Ordering item state (for ordering questions)
 */
export interface OrderingItem {
	/** Unique identifier */
	id: string;

	/** Display content */
	content: string;

	/** Original index (before shuffle) */
	originalIndex: number;

	/** Current index (after user reordering) */
	currentIndex: number;
}

/**
 * Drag state for ordering questions
 */
export interface DragState {
	/** Index of item being dragged */
	draggedIndex: number | null;

	/** Index where item will be dropped */
	dropTargetIndex: number | null;
}

// ============================================================================
// FILL-IN-BLANKS-SPECIFIC TYPES
// ============================================================================

/**
 * Blank field state (for fill-in-blanks questions)
 */
export interface BlankState {
	/** Blank position in statement */
	position: number;

	/** User's answer for this blank */
	value: string;

	/** Whether this blank is correct (after validation) */
	isCorrect: boolean | null;

	/** Expected answer for this blank */
	expectedAnswer: string;
}
