/**
 * Test System Types
 * Types for test/assessment functionality (display, interactive, course modes)
 */

import type { CartItem } from '$lib/stores/questionCart.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';

// ===========================================================================
// TEST MODES
// ===========================================================================

/**
 * Test mode type
 * - display: Slideshow mode for revision/memorization (no scoring)
 * - interactive: Quiz mode with answer validation and scoring
 * - course: "Course aux nombres" - all questions displayed at once with time limit
 */
export type TestMode = 'display' | 'interactive' | 'course';

// ===========================================================================
// TEST CONFIGURATION
// ===========================================================================

/**
 * Test configuration passed via URL params
 */
export interface TestConfig {
	mode: TestMode;
	categories: CartItem[];
	timeLimit?: number; // Time limit in seconds (for 'course' mode only)
}

// ===========================================================================
// TEST SESSION (runtime state)
// ===========================================================================

/**
 * Active test session state
 * Used during the test to track progress and answers
 */
export interface TestSession {
	mode: TestMode;
	categories: CartItem[];
	instances: QuestionInstance[];
	userAnswers: Map<number, AnswerData>; // Key = question index
	startTime: number; // Timestamp
	timeLimit?: number; // Time limit in seconds (course mode)
	currentQuestionIndex: number;
	isPaused: boolean;
}

// ===========================================================================
// TEST RESULTS
// ===========================================================================

/**
 * Test results after completion
 * Used for displaying final score and corrections
 */
export interface TestResult {
	sessionId?: string; // UUID from database (if saved)
	mode: TestMode;
	score: number; // Score on 10 scale (e.g., 7.5)
	scorePercentage: number; // Percentage (e.g., 75)
	totalQuestions: number;
	correctAnswers: number;
	timeSpent: number; // Total time in seconds
	averageTime: number; // Average time per question in seconds
	answers: TestAnswerResult[];
	completedAt: string; // ISO timestamp
}

/**
 * Individual answer result
 */
export interface TestAnswerResult {
	index: number; // Question index (for display order)
	instance: QuestionInstance;
	userAnswer?: AnswerData;
	isCorrect: boolean;
	timeSpent?: number; // Time spent on this question (seconds)
	attempts?: number;
}

// ===========================================================================
// DATABASE TYPES
// ===========================================================================

/**
 * Test session database row
 * Corresponds to public.test_sessions table
 */
export interface DbTestSession {
	id: string;
	user_id: string;
	mode: TestMode;
	categories: CartItem[]; // Stored as JSONB
	score: number | null;
	total_questions: number;
	time_spent: number | null;
	time_limit: number | null;
	completed_at: string | null;
	created_at: string;
}

/**
 * Test answer database row
 * Corresponds to public.test_answers table
 */
export interface DbTestAnswer {
	id: string;
	test_session_id: string;
	template_id: string | null;
	question_instance: QuestionInstance; // Stored as JSONB
	user_answer: AnswerData | null; // Stored as JSONB
	is_correct: boolean | null;
	time_spent: number | null;
	attempts: number;
	created_at: string;
}

// ===========================================================================
// HELPER TYPES
// ===========================================================================

/**
 * Timer state for countdown components
 */
export interface TimerState {
	duration: number; // Total duration in seconds
	remaining: number; // Remaining time in seconds
	isPaused: boolean;
	isComplete: boolean;
	startTime: number; // Timestamp when timer started
}

/**
 * Test statistics (for display)
 */
export interface TestStatistics {
	totalTests: number;
	averageScore: number;
	bestScore: number;
	totalTimeSpent: number;
	favoriteMode: TestMode;
	byMode: {
		display: { count: number; avgScore: number };
		interactive: { count: number; avgScore: number };
		course: { count: number; avgScore: number };
	};
}
