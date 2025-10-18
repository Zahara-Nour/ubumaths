/**
 * Geometry Auto-Grading Service
 *
 * This service handles automatic grading of geometry exercises, including:
 * - Raw score calculation based on validation results
 * - Penalty application (hints, time, attempts)
 * - Letter grade assignment (A-F)
 * - Feedback generation
 * - Performance analytics and statistics
 *
 * @module geometry-grader
 * @see {@link GEOMETRY_API_DOCS.md} for comprehensive API documentation
 *
 * @example Basic Usage
 * ```typescript
 * import { calculateGrade } from '$lib/services/geometry-grader';
 *
 * const gradeResult = calculateGrade(exercise, validationResults, {
 *   hintsUsed: [{ level: 'specific', penalty: 5 }],
 *   timeSpent: 900, // 15 minutes in seconds
 *   attemptNumber: 2
 * });
 *
 * console.log(`Grade: ${gradeResult.grade} (${gradeResult.percentage}%)`);
 * console.log(`Passed: ${gradeResult.passed}`);
 * ```
 */

import type {
	GeometryExercise,
	GeometryExerciseAttempt,
	ValidationResults,
	HintLevel
} from '$lib/types/geometry';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Grading criteria configuration for an exercise
 *
 * Defines the scoring parameters and rubric for grade calculation.
 *
 * @interface GradingCriteria
 */
export interface GradingCriteria {
	/** Maximum possible score for the exercise */
	maxScore: number;

	/** Minimum score required to pass (default: 50% of maxScore) */
	passingScore?: number;

	/** Whether partial credit is allowed for incomplete work */
	partialCreditEnabled?: boolean;

	/** Optional custom rubric with weights for different aspects */
	rubric?: GradingRubric;
}

/**
 * Grading rubric with weighted scoring categories
 *
 * Defines how different aspects of the solution contribute to the final score.
 * Default weights: correctness (70%), completeness (20%), efficiency (10%).
 *
 * @interface GradingRubric
 */
export interface GradingRubric {
	/** Weight for correctness (default: 0.7) - How accurate is the solution? */
	correctness?: number;

	/** Weight for completeness (default: 0.2) - Are all required elements present? */
	completeness?: number;

	/** Weight for efficiency (default: 0.1) - Is the solution optimal? */
	efficiency?: number;
}

/**
 * Detailed breakdown of hint penalties
 *
 * Tracks which hints were used and calculates the total penalty.
 * - General hints: 0% penalty (free)
 * - Specific hints: -5% penalty
 * - Step-by-step hints: -10% penalty
 *
 * @interface HintPenalty
 */
export interface HintPenalty {
	/** Number of hints used */
	hintsUsed: number;

	/** Total penalty in points (converted from percentage) */
	totalPenalty: number;

	/** Breakdown showing penalty for each hint level */
	breakdown: Array<{
		hintLevel: HintLevel;
		penalty: number;
	}>;
}

/**
 * Time penalty calculation result
 *
 * Calculates penalty for exceeding time limit.
 * Penalty: -1% per minute overtime, capped at -20%.
 *
 * @interface TimePenalty
 */
export interface TimePenalty {
	/** Actual time spent on the exercise (in seconds) */
	timeSpent: number;

	/** Time limit for the exercise (in seconds), if set */
	timeLimit?: number;

	/** Penalty in points (0 if within time limit) */
	penalty: number;
}

/**
 * Complete grade calculation result
 *
 * Contains all scoring information, penalties, and feedback for a graded attempt.
 *
 * @interface GradeResult
 *
 * @example
 * ```typescript
 * const result: GradeResult = {
 *   rawScore: 90,
 *   finalScore: 78,
 *   maxScore: 100,
 *   percentage: 78,
 *   passed: true,
 *   grade: 'C',
 *   penalties: {
 *     hints: { hintsUsed: 1, totalPenalty: 5, breakdown: [...] },
 *     time: { timeSpent: 1080, timeLimit: 900, penalty: 3 },
 *     attempts: 4,
 *     total: 12
 *   },
 *   feedback: ['✓ Bien!', 'Score brut: 90/100 (90%)', ...]
 * };
 * ```
 */
export interface GradeResult {
	/** Score before applying any penalties */
	rawScore: number;

	/** Final score after applying all penalties */
	finalScore: number;

	/** Maximum possible score */
	maxScore: number;

	/** Final score as percentage (0-100) */
	percentage: number;

	/** Whether the student passed (score >= passingScore) */
	passed: boolean;

	/** Letter grade (A, B, C, D, or F) */
	grade: string;

	/** Detailed breakdown of all penalties applied */
	penalties: {
		/** Hint penalties (undefined if no hints used) */
		hints?: HintPenalty;

		/** Time penalties (undefined if no time limit or within limit) */
		time?: TimePenalty;

		/** Attempt penalty in points (0 for first attempt) */
		attempts?: number;

		/** Total penalty in points (sum of all penalties) */
		total: number;
	};

	/** Array of feedback messages in French */
	feedback: string[];
}

/**
 * Partial credit configuration
 *
 * Defines point values for partially correct work in construction exercises.
 *
 * @interface PartialCreditConfig
 */
export interface PartialCreditConfig {
	/** Points awarded per correctly constructed object */
	pointsPerCorrectObject: number;

	/** Points awarded per correct measurement */
	pointsPerCorrectMeasurement: number;

	/** Points awarded per correct proof step */
	pointsPerCorrectStep: number;

	/** Bonus points for perfect completion */
	bonusForPerfection?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RUBRIC: GradingRubric = {
	correctness: 0.7,
	completeness: 0.2,
	efficiency: 0.1
};

const LETTER_GRADES = {
	A: { min: 90, max: 100 },
	B: { min: 80, max: 89 },
	C: { min: 70, max: 79 },
	D: { min: 60, max: 69 },
	F: { min: 0, max: 59 }
};

const HINT_PENALTIES: Record<HintLevel, number> = {
	general: 0,
	specific: 5,
	step_by_step: 10
};

// ============================================================================
// CORE GRADING FUNCTIONS
// ============================================================================

/**
 * Calculate final grade for an exercise attempt
 *
 * This is the main grading function that:
 * 1. Takes the raw validation score
 * 2. Applies penalties for hints, time, and attempts
 * 3. Calculates percentage and letter grade
 * 4. Determines pass/fail status
 * 5. Generates detailed feedback
 *
 * @param {GeometryExercise} exercise - The exercise being graded
 * @param {ValidationResults} validationResults - Results from exercise validation
 * @param {Object} options - Grading options
 * @param {Array<{level: HintLevel, penalty: number}>} [options.hintsUsed] - Hints used by student
 * @param {number} [options.timeSpent] - Time spent in seconds
 * @param {number} [options.attemptNumber=1] - Attempt number (1st, 2nd, etc.)
 *
 * @returns {GradeResult} Complete grading result with score, grade, penalties, and feedback
 *
 * @example
 * ```typescript
 * const gradeResult = calculateGrade(exercise, validationResults, {
 *   hintsUsed: [
 *     { level: 'specific', penalty: 5 },
 *     { level: 'step_by_step', penalty: 10 }
 *   ],
 *   timeSpent: 1200, // 20 minutes
 *   attemptNumber: 3
 * });
 *
 * // Result: rawScore 95, penalties: -15 (hints) -5 (time) -4 (attempts) = 71/100 (C)
 * console.log(`${gradeResult.grade}: ${gradeResult.finalScore}/${gradeResult.maxScore}`);
 * ```
 *
 * @example Penalties Calculation
 * ```typescript
 * // Exercise: maxScore = 100, timeLimit = 15 minutes
 * // Student: scored 95/100, used 1 specific hint, took 18 minutes, 3rd attempt
 *
 * const result = calculateGrade(exercise, validationResults, {
 *   hintsUsed: [{ level: 'specific', penalty: 5 }],
 *   timeSpent: 1080,
 *   attemptNumber: 3
 * });
 *
 * // Calculations:
 * // - Raw score: 95/100
 * // - Hint penalty: -5 points (5% of 100)
 * // - Time penalty: -3 points (3 minutes over × 1% = 3%)
 * // - Attempt penalty: -4 points ((3-1) × 2% = 4%)
 * // - Total penalties: -12 points
 * // - Final score: 95 - 12 = 83/100 = 83% = B
 * ```
 */
export function calculateGrade(
	exercise: GeometryExercise,
	validationResults: ValidationResults,
	options: {
		hintsUsed?: Array<{ level: HintLevel; penalty: number }>;
		timeSpent?: number;
		attemptNumber?: number;
	} = {}
): GradeResult {
	// Extract grading criteria from exercise configuration
	const criteria = getGradingCriteria(exercise);
	const { hintsUsed = [], timeSpent, attemptNumber = 1 } = options;

	// Step 1: Start with the raw score from validation
	// This is what the student earned based on correctness alone
	const rawScore = validationResults.score;
	const maxScore = validationResults.maxScore || criteria.maxScore;

	// Step 2: Calculate all penalties

	// Hint penalty: -0% (general), -5% (specific), -10% (step-by-step)
	const hintPenalty = calculateHintPenalty(hintsUsed, maxScore);

	// Time penalty: -1% per minute over limit, capped at -20%
	// Convert time_limit_minutes to seconds for comparison
	const timePenalty = calculateTimePenalty(
		timeSpent,
		exercise.time_limit_minutes ? exercise.time_limit_minutes * 60 : undefined,
		maxScore
	);

	// Attempt penalty: -2% per additional attempt (after 1st), capped at -10%
	const attemptPenalty = calculateAttemptPenalty(attemptNumber, maxScore);

	// Sum all penalty points (not percentages - already converted to points)
	const totalPenaltyPoints = hintPenalty.totalPenalty + timePenalty.penalty + attemptPenalty;

	// Step 3: Apply penalties to get final score
	// Ensure score never goes below 0
	const finalScore = Math.max(0, rawScore - totalPenaltyPoints);
	const percentage = (finalScore / maxScore) * 100;

	// Step 4: Determine pass/fail status
	// Default passing score is 50% unless specified otherwise
	const passingScore = criteria.passingScore ?? maxScore * 0.5;
	const passed = finalScore >= passingScore;

	// Step 5: Convert percentage to letter grade (A-F)
	const grade = getLetterGrade(percentage);

	// Step 6: Generate detailed French feedback messages
	const feedback = generateGradeFeedback({
		rawScore,
		finalScore,
		maxScore,
		percentage,
		passed,
		hintPenalty,
		timePenalty,
		attemptPenalty,
		validationResults
	});

	// Return complete grading result
	return {
		rawScore,
		finalScore,
		maxScore,
		percentage,
		passed,
		grade,
		penalties: {
			// Only include penalty objects if they were actually applied
			hints: hintsUsed.length > 0 ? hintPenalty : undefined,
			time: timeSpent && timePenalty.penalty > 0 ? timePenalty : undefined,
			attempts: attemptPenalty,
			total: totalPenaltyPoints
		},
		feedback
	};
}

/**
 * Calculate partial credit for construction exercises
 */
export function calculatePartialCredit(
	validationResults: ValidationResults,
	config: PartialCreditConfig
): number {
	let score = 0;

	// Points for correct objects
	const correctObjects = validationResults.objectsCreated.length;
	score += correctObjects * config.pointsPerCorrectObject;

	// Points for correct measurements
	const correctMeasurements = Object.keys(validationResults.measurements).filter((key) => {
		// Check if measurement is within tolerance
		return true; // Simplified - actual implementation would check tolerance
	}).length;
	score += correctMeasurements * config.pointsPerCorrectMeasurement;

	// Bonus for perfection
	if (
		validationResults.isValid &&
		validationResults.errors.length === 0 &&
		config.bonusForPerfection
	) {
		score += config.bonusForPerfection;
	}

	return score;
}

/**
 * Calculate weighted score based on rubric
 */
export function calculateWeightedScore(
	scores: {
		correctness: number; // 0-100
		completeness: number; // 0-100
		efficiency: number; // 0-100
	},
	rubric: GradingRubric = DEFAULT_RUBRIC
): number {
	const correctnessWeight = rubric.correctness ?? DEFAULT_RUBRIC.correctness!;
	const completenessWeight = rubric.completeness ?? DEFAULT_RUBRIC.completeness!;
	const efficiencyWeight = rubric.efficiency ?? DEFAULT_RUBRIC.efficiency!;

	const weightedScore =
		scores.correctness * correctnessWeight +
		scores.completeness * completenessWeight +
		scores.efficiency * efficiencyWeight;

	return Math.round(weightedScore);
}

// ============================================================================
// PENALTY CALCULATIONS
// ============================================================================

/**
 * Calculate hint penalty from hints used
 *
 * Converts hint penalties from percentages to point values and provides a breakdown.
 *
 * Penalty rates:
 * - General hint: 0% (free - course reminder)
 * - Specific hint: -5% (suggests strategy)
 * - Step-by-step hint: -10% (complete solution)
 *
 * @param {Array<{level: HintLevel, penalty: number}>} hintsUsed - Array of hints used with their penalty percentages
 * @param {number} maxScore - Maximum score for the exercise
 *
 * @returns {HintPenalty} Detailed hint penalty breakdown
 *
 * @example
 * ```typescript
 * const hints = [
 *   { level: 'general', penalty: 0 },
 *   { level: 'specific', penalty: 5 }
 * ];
 *
 * const penalty = calculateHintPenalty(hints, 100);
 * // Result: { hintsUsed: 2, totalPenalty: 5, breakdown: [...] }
 * ```
 */
export function calculateHintPenalty(
	hintsUsed: Array<{ level: HintLevel; penalty: number }>,
	maxScore: number
): HintPenalty {
	// Early return if no hints were used
	if (hintsUsed.length === 0) {
		return {
			hintsUsed: 0,
			totalPenalty: 0,
			breakdown: []
		};
	}

	// Sum up all hint penalties (they're stored as percentages: 0, 5, 10)
	// Example: [{ level: 'specific', penalty: 5 }, { level: 'step_by_step', penalty: 10 }]
	// Results in: 5 + 10 = 15% total penalty
	const totalPercentagePenalty = hintsUsed.reduce((sum, hint) => sum + hint.penalty, 0);

	// Convert percentage penalty to actual point penalty
	// Example: 15% of 100 points = (15 / 100) * 100 = 15 points
	const totalPenalty = (totalPercentagePenalty / 100) * maxScore;

	// Create detailed breakdown showing penalty per hint level
	// This allows UI to show: "Indice spécifique: -5 points, Indice pas-à-pas: -10 points"
	const breakdown = hintsUsed.map((hint) => ({
		hintLevel: hint.level,
		penalty: (hint.penalty / 100) * maxScore // Convert each to points
	}));

	return {
		hintsUsed: hintsUsed.length,
		totalPenalty,
		breakdown
	};
}

/**
 * Calculate time penalty for exceeding time limit
 *
 * Applies a penalty when the student exceeds the time limit.
 * Penalty rate: -1% per minute over the limit, capped at -20%.
 *
 * @param {number | undefined} timeSpent - Actual time spent in seconds
 * @param {number | undefined} timeLimit - Time limit in seconds (undefined if no limit)
 * @param {number} maxScore - Maximum score for the exercise
 *
 * @returns {TimePenalty} Time penalty details
 *
 * @example No time limit
 * ```typescript
 * const penalty = calculateTimePenalty(1200, undefined, 100);
 * // Result: { timeSpent: 1200, timeLimit: undefined, penalty: 0 }
 * ```
 *
 * @example Within time limit
 * ```typescript
 * const penalty = calculateTimePenalty(600, 900, 100);
 * // Result: { timeSpent: 600, timeLimit: 900, penalty: 0 }
 * ```
 *
 * @example Exceeds time limit
 * ```typescript
 * const penalty = calculateTimePenalty(1200, 900, 100);
 * // 300 seconds over = 5 minutes over
 * // Penalty: 5 minutes × 1% = 5% = 5 points
 * // Result: { timeSpent: 1200, timeLimit: 900, penalty: 5 }
 * ```
 *
 * @example Max penalty reached
 * ```typescript
 * const penalty = calculateTimePenalty(3600, 900, 100);
 * // 2700 seconds over = 45 minutes over
 * // Penalty: capped at 20% = 20 points
 * // Result: { timeSpent: 3600, timeLimit: 900, penalty: 20 }
 * ```
 */
export function calculateTimePenalty(
	timeSpent: number | undefined,
	timeLimit: number | undefined,
	maxScore: number
): TimePenalty {
	// No penalty if no time was tracked or no limit was set
	if (!timeSpent || !timeLimit) {
		return {
			timeSpent: timeSpent ?? 0,
			timeLimit,
			penalty: 0
		};
	}

	// No penalty if student finished within the time limit
	if (timeSpent <= timeLimit) {
		return {
			timeSpent,
			timeLimit,
			penalty: 0
		};
	}

	// Calculate how much time was exceeded
	// Example: timeSpent = 1200s (20 min), timeLimit = 900s (15 min)
	// overtime = 300s (5 minutes over)
	const overtime = timeSpent - timeLimit;

	// Convert overtime to minutes, rounding up
	// Example: 300s / 60 = 5.0 minutes
	// If overtime was 301s, Math.ceil(5.016) = 6 minutes
	const overtimeMinutes = Math.ceil(overtime / 60);

	// Apply penalty: -1% per minute over, capped at -20%
	// Example: 5 minutes over = 5%, but if 25 minutes over, capped at 20%
	const percentagePenalty = Math.min(overtimeMinutes, 20);

	// Convert percentage to points
	// Example: 5% of 100 points = 5 points penalty
	const penalty = (percentagePenalty / 100) * maxScore;

	return {
		timeSpent,
		timeLimit,
		penalty
	};
}

/**
 * Calculate penalty for multiple attempts
 *
 * Applies a small penalty for each attempt after the first to encourage
 * careful work and discourage trial-and-error.
 *
 * Penalty rate: -2% per additional attempt, capped at -10% (6+ attempts).
 *
 * @param {number} attemptNumber - Which attempt this is (1st, 2nd, 3rd, etc.)
 * @param {number} maxScore - Maximum score for the exercise
 *
 * @returns {number} Attempt penalty in points
 *
 * @example First attempt
 * ```typescript
 * const penalty = calculateAttemptPenalty(1, 100);
 * // Result: 0 (no penalty for first attempt)
 * ```
 *
 * @example Third attempt
 * ```typescript
 * const penalty = calculateAttemptPenalty(3, 100);
 * // (3 - 1) × 2% = 4% = 4 points
 * // Result: 4
 * ```
 *
 * @example Seventh attempt (max penalty)
 * ```typescript
 * const penalty = calculateAttemptPenalty(7, 100);
 * // (7 - 1) × 2% = 12%, but capped at 10% = 10 points
 * // Result: 10
 * ```
 */
export function calculateAttemptPenalty(attemptNumber: number, maxScore: number): number {
	if (attemptNumber <= 1) return 0;

	// Small penalty for each additional attempt: 2% per attempt, max 10%
	const percentagePenalty = Math.min((attemptNumber - 1) * 2, 10);
	return (percentagePenalty / 100) * maxScore;
}

// ============================================================================
// SCORING UTILITIES
// ============================================================================

/**
 * Get letter grade from percentage
 */
export function getLetterGrade(percentage: number): string {
	for (const [grade, range] of Object.entries(LETTER_GRADES)) {
		if (percentage >= range.min && percentage <= range.max) {
			return grade;
		}
	}
	return 'F';
}

/**
 * Get grading criteria from exercise
 */
export function getGradingCriteria(exercise: GeometryExercise): GradingCriteria {
	const maxScore = exercise.max_score ?? 100;
	const passingScore = exercise.passing_score ?? maxScore * 0.5;

	return {
		maxScore,
		passingScore,
		partialCreditEnabled: exercise.validation_mode === 'automatic',
		rubric: exercise.grading_rubric as GradingRubric | undefined
	};
}

/**
 * Calculate correctness score (0-100)
 */
export function calculateCorrectnessScore(validationResults: ValidationResults): number {
	if (validationResults.maxScore === 0) return 0;
	return (validationResults.score / validationResults.maxScore) * 100;
}

/**
 * Calculate completeness score (0-100)
 */
export function calculateCompletenessScore(validationResults: ValidationResults): number {
	const totalObjects =
		validationResults.objectsCreated.length +
		validationResults.objectsMissing.length +
		validationResults.objectsIncorrect.length;

	if (totalObjects === 0) return 100;

	const createdObjects = validationResults.objectsCreated.length;
	return (createdObjects / totalObjects) * 100;
}

/**
 * Calculate efficiency score (0-100)
 */
export function calculateEfficiencyScore(
	validationResults: ValidationResults,
	expectedObjectCount: number
): number {
	const actualObjectCount = validationResults.objectsCreated.length;

	if (actualObjectCount === 0) return 0;

	// Perfect efficiency if exactly the expected number of objects
	if (actualObjectCount === expectedObjectCount) return 100;

	// Penalize for extra objects (inefficiency)
	if (actualObjectCount > expectedObjectCount) {
		const extraObjects = actualObjectCount - expectedObjectCount;
		const penalty = (extraObjects / actualObjectCount) * 100;
		return Math.max(0, 100 - penalty);
	}

	// Penalize for missing objects
	return (actualObjectCount / expectedObjectCount) * 100;
}

// ============================================================================
// FEEDBACK GENERATION
// ============================================================================

/**
 * Generate grade feedback messages
 */
export function generateGradeFeedback(data: {
	rawScore: number;
	finalScore: number;
	maxScore: number;
	percentage: number;
	passed: boolean;
	hintPenalty: HintPenalty;
	timePenalty: TimePenalty;
	attemptPenalty: number;
	validationResults: ValidationResults;
}): string[] {
	const feedback: string[] = [];

	// Overall result
	if (data.passed) {
		if (data.percentage >= 90) {
			feedback.push('🎉 Excellent travail!');
		} else if (data.percentage >= 80) {
			feedback.push('✓ Très bien!');
		} else if (data.percentage >= 70) {
			feedback.push('✓ Bien!');
		} else {
			feedback.push('✓ Exercice réussi.');
		}
	} else {
		feedback.push('✗ Exercice non réussi. Réessayez!');
	}

	// Score breakdown
	feedback.push(
		`Score brut: ${Math.round(data.rawScore)}/${data.maxScore} (${Math.round((data.rawScore / data.maxScore) * 100)}%)`
	);

	// Penalties
	if (data.hintPenalty.hintsUsed > 0) {
		feedback.push(
			`Pénalité indices: -${Math.round(data.hintPenalty.totalPenalty)} points (${data.hintPenalty.hintsUsed} indice(s) utilisé(s))`
		);
	}

	if (data.timePenalty.penalty > 0) {
		const overtime = data.timePenalty.timeSpent - (data.timePenalty.timeLimit ?? 0);
		const overtimeMinutes = Math.ceil(overtime / 60);
		feedback.push(
			`Pénalité temps: -${Math.round(data.timePenalty.penalty)} points (${overtimeMinutes} minute(s) de dépassement)`
		);
	}

	if (data.attemptPenalty > 0) {
		feedback.push(`Pénalité tentatives: -${Math.round(data.attemptPenalty)} points`);
	}

	// Final score
	if (data.finalScore !== data.rawScore) {
		feedback.push(
			`Score final: ${Math.round(data.finalScore)}/${data.maxScore} (${Math.round(data.percentage)}%)`
		);
	}

	// Add validation feedback
	feedback.push(...data.validationResults.feedback);

	return feedback;
}

/**
 * Generate detailed performance report
 */
export function generatePerformanceReport(
	exercise: GeometryExercise,
	attempt: GeometryExerciseAttempt,
	gradeResult: GradeResult
): string {
	const lines: string[] = [];

	lines.push('='.repeat(50));
	lines.push(`RAPPORT DE PERFORMANCE`);
	lines.push('='.repeat(50));
	lines.push('');

	// Exercise info
	lines.push(`Exercice: ${exercise.title}`);
	lines.push(`Type: ${exercise.exercise_type}`);
	lines.push('');

	// Attempt info
	lines.push(`Tentative: #${attempt.attempts_count}`);
	lines.push(`Date: ${new Date(attempt.created_at).toLocaleString('fr-FR')}`);
	if (attempt.time_spent_seconds) {
		const minutes = Math.floor(attempt.time_spent_seconds / 60);
		const seconds = attempt.time_spent_seconds % 60;
		lines.push(`Temps passé: ${minutes}m ${seconds}s`);
	}
	lines.push('');

	// Grade
	lines.push(`Note: ${gradeResult.grade} (${Math.round(gradeResult.percentage)}%)`);
	lines.push(`Score: ${Math.round(gradeResult.finalScore)}/${gradeResult.maxScore}`);
	lines.push(`Statut: ${gradeResult.passed ? 'RÉUSSI ✓' : 'NON RÉUSSI ✗'}`);
	lines.push('');

	// Penalties
	if (gradeResult.penalties.total > 0) {
		lines.push('Pénalités:');
		if (gradeResult.penalties.hints) {
			lines.push(`  - Indices: -${Math.round(gradeResult.penalties.hints.totalPenalty)} points`);
		}
		if (gradeResult.penalties.time) {
			lines.push(`  - Temps: -${Math.round(gradeResult.penalties.time.penalty)} points`);
		}
		if (gradeResult.penalties.attempts) {
			lines.push(`  - Tentatives: -${Math.round(gradeResult.penalties.attempts)} points`);
		}
		lines.push('');
	}

	// Feedback
	if (gradeResult.feedback.length > 0) {
		lines.push('Commentaires:');
		gradeResult.feedback.forEach((comment) => {
			lines.push(`  - ${comment}`);
		});
		lines.push('');
	}

	lines.push('='.repeat(50));

	return lines.join('\n');
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Calculate average score from multiple attempts
 */
export function calculateAverageScore(attempts: GeometryExerciseAttempt[]): number {
	if (attempts.length === 0) return 0;

	const total = attempts.reduce((sum, attempt) => sum + (attempt.score_earned ?? 0), 0);
	return total / attempts.length;
}

/**
 * Get best score from multiple attempts
 */
export function getBestScore(attempts: GeometryExerciseAttempt[]): number {
	if (attempts.length === 0) return 0;

	return Math.max(...attempts.map((attempt) => attempt.score_earned ?? 0));
}

/**
 * Calculate improvement rate
 */
export function calculateImprovement(attempts: GeometryExerciseAttempt[]): number {
	if (attempts.length < 2) return 0;

	const sortedAttempts = [...attempts].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);

	const firstScore = sortedAttempts[0].score_earned ?? 0;
	const lastScore = sortedAttempts[sortedAttempts.length - 1].score_earned ?? 0;

	if (firstScore === 0) return 0;

	return ((lastScore - firstScore) / firstScore) * 100;
}

/**
 * Get performance tier
 */
export function getPerformanceTier(percentage: number): {
	tier: string;
	color: string;
	message: string;
} {
	if (percentage >= 90) {
		return {
			tier: 'Excellent',
			color: 'green',
			message: 'Vous maîtrisez parfaitement cette notion!'
		};
	} else if (percentage >= 80) {
		return {
			tier: 'Très bien',
			color: 'blue',
			message: 'Très bonne compréhension!'
		};
	} else if (percentage >= 70) {
		return {
			tier: 'Bien',
			color: 'cyan',
			message: 'Bonne compréhension, continuez!'
		};
	} else if (percentage >= 60) {
		return {
			tier: 'Satisfaisant',
			color: 'yellow',
			message: 'Compréhension acceptable, mais peut être améliorée.'
		};
	} else if (percentage >= 50) {
		return {
			tier: 'Passable',
			color: 'orange',
			message: 'Notion acquise mais nécessite plus de pratique.'
		};
	} else {
		return {
			tier: 'Insuffisant',
			color: 'red',
			message: 'Cette notion nécessite davantage de travail.'
		};
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GeometryGrader = {
	calculateGrade,
	calculatePartialCredit,
	calculateWeightedScore,
	calculateHintPenalty,
	calculateTimePenalty,
	calculateAttemptPenalty,
	getLetterGrade,
	getGradingCriteria,
	calculateCorrectnessScore,
	calculateCompletenessScore,
	calculateEfficiencyScore,
	generateGradeFeedback,
	generatePerformanceReport,
	calculateAverageScore,
	getBestScore,
	calculateImprovement,
	getPerformanceTier
};
