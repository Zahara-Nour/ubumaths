/**
 * Answer Validation Utilities
 * ============================
 *
 * Provides validation functions for different question types,
 * integrating with MathLive's Compute Engine for mathematical evaluation.
 *
 * @module utils/answer-validator
 */

import type {
	QuestionInstance,
	InstanceBlank,
	PrecisionType,
	ValidationStatus,
	ConstraintId,
	ConstraintMode,
	ConstraintOptions,
	ValidationRule
} from '$lib/questions/types';
import { DEFAULT_CONSTRAINT_MODE, getQuestionType } from '$lib/questions/types';
import type { ValidationResult } from '$lib/types/question-display';
import { evaluateExpression, areEquivalent } from '$lib/math';
import { checkUnit } from '$lib/questions/constraint-validators';
import {
	checkForm as checkFormUnified,
	type ConstraintSeverity
} from '$lib/mathAST/cosmetic-transforms';
import { CONSTRAINT_FEEDBACK } from '$lib/questions/feedback';
import { evaluateRule, type EvaluationContext } from '$lib/questions/validation-rule-evaluator';
import { checkRequiredForm, getRequiredFormFeedback } from '$lib/questions/required-form-validator';
import { validateQuantityAnswer } from '$lib/questions/units/validator';

// ============================================================================
// CONSTRAINT CHECKING
// ============================================================================

/**
 * Build constraint severity map from ConstraintOptions for the unified checkForm.
 */
function buildConstraintSeverities(
	constraints: ConstraintOptions
): Record<string, ConstraintSeverity> {
	const severities: Record<string, ConstraintSeverity> = {};

	const constraintIds: ConstraintId[] = [
		'spaces',
		'products',
		'brackets',
		'zeros',
		'nullTerms',
		'factorOne',
		'factorZero',
		'signs',
		'reducedFractions'
	];

	for (const id of constraintIds) {
		const mode = (constraints[id] as ConstraintMode | undefined) ?? DEFAULT_CONSTRAINT_MODE;
		severities[id] = mode;
	}

	return severities;
}

/**
 * Apply constraint checks to a mathematically correct answer
 *
 * Uses the unified checkForm pipeline for cosmetic constraints,
 * plus separate unit matching.
 *
 * @param answers - Plain text answers
 * @param answersLatex - LaTeX versions of answers (from MathLive)
 * @param expectedAnswers - Expected answers for form comparison
 * @param constraints - Constraint configuration from question
 * @returns Status and list of violations
 */
function applyConstraints(
	answers: string[],
	answersLatex: string[],
	expectedAnswers: string[],
	constraints: ConstraintOptions
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	const violations: NonNullable<ValidationResult['constraintViolations']> = [];
	let worstStatus: ValidationStatus = 'correct';
	const isMultiple = answers.length > 1;
	const severities = buildConstraintSeverities(constraints);

	// Apply unified checkForm for each answer/expected pair
	for (let i = 0; i < answersLatex.length; i++) {
		const expected = expectedAnswers[i];
		if (!expected) continue;

		const formResult = checkFormUnified(answersLatex[i], expected, severities);

		// Collect violations from checkForm
		for (const v of formResult.violations) {
			const constraintId = v.id as ConstraintId;
			if (CONSTRAINT_FEEDBACK[constraintId]) {
				const feedback = CONSTRAINT_FEEDBACK[constraintId][isMultiple ? 'multiple' : 'single'];

				if (v.severity === 'strict') {
					violations.push({ constraint: constraintId, severity: 'error', feedback });
					worstStatus = 'bad_form';
				} else {
					violations.push({ constraint: constraintId, severity: 'warning', feedback });
					if (worstStatus === 'correct') {
						worstStatus = 'unoptimal_form';
					}
				}
			}
		}

		// Final form mismatch: the answer structure is fundamentally different
		// from expected (e.g. 400+80 vs 480). This is unconditional — no severity mode.
		// Added even when other violations exist (e.g. spaces), since the form
		// mismatch is the primary issue and should override cosmetic warnings.
		if (!formResult.valid && formResult.status === 'bad_form') {
			const feedback = CONSTRAINT_FEEDBACK['form'][isMultiple ? 'multiple' : 'single'];
			violations.push({ constraint: 'form', severity: 'error', feedback });
			worstStatus = 'bad_form';
		}
	}

	// Unit matching (separate — not part of cosmetic transforms)
	const unitMode = (constraints['unit'] as ConstraintMode | undefined) ?? DEFAULT_CONSTRAINT_MODE;
	if (unitMode !== 'off') {
		const unitProblematic = checkUnit(answersLatex, expectedAnswers);
		if (unitProblematic.length > 0) {
			const feedback = CONSTRAINT_FEEDBACK['unit'][isMultiple ? 'multiple' : 'single'];
			if (unitMode === 'strict') {
				violations.push({ constraint: 'unit', severity: 'error', feedback });
				worstStatus = 'bad_form';
			} else {
				violations.push({ constraint: 'unit', severity: 'warning', feedback });
				if (worstStatus === 'correct') {
					worstStatus = 'unoptimal_form';
				}
			}
		}
	}

	return { status: worstStatus, violations };
}

// ============================================================================
// VALIDATION RULES EVALUATION
// ============================================================================

/**
 * Evaluate custom validation rules (testAnswers-style)
 *
 * Used for questions where the correct answer depends on generated variables
 * (e.g., "find a divisor of n other than 1 and n itself")
 *
 * @param rules - Array of validation rules
 * @param userAnswer - User's answer as string
 * @param instance - Question instance with resolved variables
 * @returns Validation result or undefined if all rules pass
 */
function evaluateValidationRules(
	rules: ValidationRule[],
	userAnswer: string,
	instance: QuestionInstance
): ValidationResult | undefined {
	// Build context from resolved variables
	const variables: Record<string, number | string> = {};
	if (instance.resolvedVariables) {
		for (const v of instance.resolvedVariables) {
			// Try to parse as number, otherwise keep as string
			const numValue = Number(v.value);
			variables[v.name] = isNaN(numValue) ? v.value : numValue;
		}
	}

	const ctx: EvaluationContext = {
		variables,
		answer: userAnswer,
		numericAnswer: Number(userAnswer)
	};

	// Evaluate each rule
	for (const rule of rules) {
		const result = evaluateRule(rule, ctx);
		if (!result.valid) {
			return {
				isCorrect: false,
				feedback: result.reason || 'La réponse ne satisfait pas les critères demandés.'
			};
		}
	}

	// All rules passed
	return undefined;
}

// ============================================================================
// FUZZY TEXT MATCHING
// ============================================================================

/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
			}
		}
	}

	return dp[m][n];
}

/**
 * Normalize string for fuzzy comparison: lowercase + strip accents
 */
function normalizeForFuzzy(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

/**
 * Fuzzy text matching: case insensitive, accents ignored, Levenshtein distance <= 1
 */
function isFuzzyTextMatch(userAnswer: string, expected: string): boolean {
	const normalizedUser = normalizeForFuzzy(userAnswer);
	const normalizedExpected = normalizeForFuzzy(expected);

	// Empty answers must match exactly (prevent "" fuzzy-matching "a")
	if (!normalizedUser || !normalizedExpected) {
		return normalizedUser === normalizedExpected;
	}

	if (normalizedUser === normalizedExpected) return true;
	return levenshteinDistance(normalizedUser, normalizedExpected) <= 1;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate user answer against correct answer based on question type
 *
 * @param userAnswer - User's submitted answer
 * @param instance - Question instance with correct answer
 * @param userAnswerLatex - Optional LaTeX version of user answer (for constraint checking)
 * @returns Validation result with correctness and feedback
 */
export function validateAnswer(
	userAnswer: string | string[] | number | number[],
	instance: QuestionInstance,
	userAnswerLatex?: string | string[]
): ValidationResult {
	const questionType = getQuestionType(instance);

	try {
		// ---- FILL_IN_BLANKS: per-blank pipeline (return early) ----
		// Global validationRules and requiredForm are NOT used here;
		// each blank carries its own validation config.
		if (questionType === 'fill_in_blanks') {
			const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
			const latex = userAnswerLatex
				? Array.isArray(userAnswerLatex)
					? userAnswerLatex
					: [userAnswerLatex]
				: undefined;

			if (!instance.blanks || instance.blanks.length === 0) {
				return answers.length === 0
					? { isCorrect: true }
					: { isCorrect: false, message: 'Pas de blanks[] définis' };
			}

			return validateBlanks(answers, instance, latex);
		}

		// ---- MULTIPLE_CHOICE ----
		const { correctChoiceIndex } = instance;

		// Check custom validation rules first (testAnswers-style)
		if (instance.validationRules && instance.validationRules.length > 0) {
			const userAnswerStr = Array.isArray(userAnswer) ? String(userAnswer[0]) : String(userAnswer);
			const ruleResult = evaluateValidationRules(instance.validationRules, userAnswerStr, instance);

			if (ruleResult) return ruleResult;
			return { isCorrect: true };
		}

		const result: ValidationResult = validateChoice(
			userAnswer as number | number[],
			correctChoiceIndex as string | string[],
			instance.multipleAnswers
		);

		// Apply required form check (multiple_choice only; fill_in_blanks uses per-blank)
		if (result.isCorrect && instance.requiredForm && userAnswerLatex) {
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			const formViolations = checkRequiredForm(latex, instance.requiredForm);

			if (formViolations.length > 0) {
				const feedback = getRequiredFormFeedback(instance.requiredForm, latex.length > 1);
				return {
					isCorrect: false,
					status: 'bad_form',
					feedback,
					constraintViolations: [{ constraint: 'form', severity: 'error', feedback }]
				};
			}
		}

		// Apply constraint checks (multiple_choice only)
		if (result.isCorrect && userAnswerLatex) {
			const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			const expected = Array.isArray(correctChoiceIndex)
				? correctChoiceIndex
				: correctChoiceIndex
					? [correctChoiceIndex]
					: [];

			const { status, violations } = applyConstraints(
				answers,
				latex,
				expected,
				instance.options?.constraints ?? {}
			);

			result.status = status;
			result.constraintViolations = violations;

			if (status === 'bad_form') {
				result.isCorrect = false;
				result.feedback = violations[0]?.feedback;
			} else if (status === 'unoptimal_form') {
				result.feedback = violations[0]?.feedback;
			}
		}

		return result;
	} catch (error) {
		return {
			isCorrect: false,
			message: error instanceof Error ? error.message : 'Erreur de validation'
		};
	}
}

// ============================================================================
// NUMERICAL VALIDATION
// ============================================================================

/**
 * Validate numerical answer with precision tolerance
 *
 * @param userAnswer - User's answer (string or number)
 * @param correctAnswer - Correct answer from instance
 * @param precision - Precision specification
 * @returns Validation result
 */
export function validateNumerical(
	userAnswer: string | number,
	correctAnswer: string,
	precision?: PrecisionType
): ValidationResult {
	// Convert to string if number
	const userStr = typeof userAnswer === 'number' ? String(userAnswer) : userAnswer;

	// Evaluate both answers
	const userNum = evaluateExpression(userStr);
	const correctNum = evaluateExpression(correctAnswer);

	// Check if evaluation succeeded
	if (typeof userNum !== 'number') {
		return {
			isCorrect: false,
			message: 'Réponse invalide (non numérique)',
			feedback: 'Vérifiez que vous avez entré un nombre valide'
		};
	}

	if (typeof correctNum !== 'number') {
		return {
			isCorrect: false,
			message: 'Erreur: réponse correcte invalide'
		};
	}

	// Exact match (no precision specified)
	if (!precision || precision.type === 'none') {
		const isCorrect = userNum === correctNum;
		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect ? undefined : `La réponse exacte est ${correctNum}`
		};
	}

	// Decimal precision
	if (precision.type === 'decimal') {
		const userRounded = Number(userNum.toFixed(precision.digits));
		const correctRounded = Number(correctNum.toFixed(precision.digits));
		const isCorrect = userRounded === correctRounded;

		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect
				? undefined
				: `La réponse arrondie à ${precision.digits} décimales est ${correctRounded}`
		};
	}

	// Significant figures
	if (precision.type === 'significant') {
		const userSig = toSignificantFigures(userNum, precision.digits);
		const correctSig = toSignificantFigures(correctNum, precision.digits);
		const isCorrect = userSig === correctSig;

		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect
				? undefined
				: `La réponse avec ${precision.digits} chiffres significatifs est ${correctSig}`
		};
	}

	// Magnitude (order of magnitude)
	if (precision.type === 'magnitude') {
		const userMag = roundToMagnitude(userNum, precision.digits);
		const correctMag = roundToMagnitude(correctNum, precision.digits);
		const isCorrect = userMag === correctMag;

		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect
				? undefined
				: `La réponse arrondie à l'ordre de grandeur 10^${precision.digits} est ${correctMag}`
		};
	}

	// Tolerance (absolute or relative)
	if (precision.type === 'tolerance') {
		const { tolerance, mode } = precision;
		const diff = Math.abs(userNum - correctNum);

		const isCorrect =
			mode === 'absolute' ? diff <= tolerance : diff <= Math.abs(correctNum * tolerance);

		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect
				? undefined
				: mode === 'absolute'
					? `La réponse correcte est ${correctNum} (tolérance ±${tolerance})`
					: `La réponse correcte est ${correctNum} (tolérance ±${tolerance * 100}%)`
		};
	}

	// Fallback: exact match
	const isCorrect = userNum === correctNum;
	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect'
	};
}

/**
 * Round number to significant figures
 *
 * @param num - Number to round
 * @param digits - Number of significant figures
 * @returns Rounded number
 */
function toSignificantFigures(num: number, digits: number): number {
	if (num === 0) return 0;

	const magnitude = Math.floor(Math.log10(Math.abs(num)));
	const scale = Math.pow(10, magnitude - digits + 1);

	return Math.round(num / scale) * scale;
}

/**
 * Round number to order of magnitude
 *
 * @param num - Number to round
 * @param magnitude - Power of 10 (e.g., 1 = nearest 10, 2 = nearest 100)
 * @returns Rounded number
 */
function roundToMagnitude(num: number, magnitude: number): number {
	const scale = Math.pow(10, magnitude);
	return Math.round(num / scale) * scale;
}

// ============================================================================
// ALGEBRAIC VALIDATION
// ============================================================================

/**
 * Validate algebraic expression using equivalence checking
 *
 * @param userAnswer - User's algebraic expression (LaTeX)
 * @param correctAnswer - Correct expression (LaTeX)
 * @returns Validation result
 */
export function validateAlgebraic(userAnswer: string, correctAnswer: string): ValidationResult {
	const isCorrect = areEquivalent(userAnswer, correctAnswer);

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		feedback: isCorrect ? undefined : `Une forme correcte est: $$${correctAnswer}$$`
	};
}

// ============================================================================
// FILL-IN-BLANKS VALIDATION (PER-BLANK PIPELINE)
// ============================================================================

/**
 * Check if a single answer matches a blank's expected value (value only, no form/constraints).
 * Uses inferred validation mode based on blank configuration.
 * Used for order-independent matching.
 */
function validateBlankValue(
	userAnswer: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): boolean {
	// Check validation rules first (pre-condition)
	if (blank.validationRules && blank.validationRules.length > 0) {
		const ruleResult = evaluateValidationRules(blank.validationRules, userAnswer, instance);
		if (ruleResult) return false;
	}

	// Inferred mode
	if (blank.type === 'text') {
		return isFuzzyTextMatch(userAnswer, blank.expectedAnswer);
	}

	if (blank.unit?.expected) {
		const result = validateQuantityAnswer(
			userAnswer,
			blank.expectedAnswer,
			blank.precision,
			blank.unit.required
		);
		return result.isCorrect;
	}

	if (blank.precision) {
		const result = validateNumerical(userAnswer, blank.expectedAnswer, blank.precision);
		return result.isCorrect;
	}

	return isAnswerMatch(userAnswer, blank.expectedAnswer);
}

/**
 * Full per-blank pipeline: validationRules -> inferred mode -> requiredForm -> constraints.
 */
function validateSingleBlank(
	userAnswer: string,
	blank: InstanceBlank,
	userAnswerLatex: string | undefined,
	instance: QuestionInstance
): {
	isCorrect: boolean;
	status?: ValidationStatus;
	feedback?: string;
	constraintViolations?: NonNullable<ValidationResult['constraintViolations']>;
} {
	// 0. Empty answer — skip all checks
	if (!userAnswer.trim()) {
		return { isCorrect: false, status: 'empty' };
	}

	// 1. Validation rules (pre-condition)
	if (blank.validationRules && blank.validationRules.length > 0) {
		const ruleResult = evaluateValidationRules(blank.validationRules, userAnswer, instance);
		if (ruleResult) {
			return { isCorrect: false, feedback: ruleResult.feedback };
		}
	}

	// 2. Inferred mode (value correctness)
	let isCorrect: boolean;

	if (blank.type === 'text') {
		isCorrect = isFuzzyTextMatch(userAnswer, blank.expectedAnswer);
	} else if (blank.unit?.expected) {
		const result = validateQuantityAnswer(
			userAnswer,
			blank.expectedAnswer,
			blank.precision,
			blank.unit.required
		);
		isCorrect = result.isCorrect;
	} else if (blank.precision) {
		const result = validateNumerical(userAnswer, blank.expectedAnswer, blank.precision);
		isCorrect = result.isCorrect;
	} else {
		isCorrect = isAnswerMatch(userAnswer, blank.expectedAnswer);
	}

	if (!isCorrect) {
		return { isCorrect: false };
	}

	// 3. Required form check (per-blank)
	if (blank.requiredForm && userAnswerLatex) {
		const formViolations = checkRequiredForm([userAnswerLatex], blank.requiredForm);
		if (formViolations.length > 0) {
			const feedback = getRequiredFormFeedback(blank.requiredForm, false);
			return {
				isCorrect: false,
				status: 'bad_form',
				feedback,
				constraintViolations: [{ constraint: 'form', severity: 'error', feedback }]
			};
		}
	}

	// 4. Constraints (per-blank, using instance-level constraint config)
	// Use userAnswer as fallback when userAnswerLatex is empty (e.g., prefilled
	// blanks where MathLive never fired an input event).
	const effectiveLatex = userAnswerLatex || userAnswer;
	const { status, violations } = applyConstraints(
		[userAnswer],
		[effectiveLatex],
		[blank.expectedAnswer],
		instance.options?.constraints ?? {}
	);

	return {
		isCorrect: status !== 'bad_form',
		status,
		feedback: status !== 'correct' ? violations[0]?.feedback : undefined,
		constraintViolations: violations
	};
}

/**
 * Validate fill-in-blanks answers using per-blank pipeline
 */
export function validateBlanks(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex?: string[]
): ValidationResult {
	const blanks = instance.blanks!;

	if (userAnswers.length !== blanks.length) {
		return { isCorrect: false, message: 'Nombre de réponses incorrect' };
	}

	if (instance.options?.orderIndependent) {
		return validateBlanksOrderIndependent(userAnswers, instance, userAnswersLatex);
	}

	// Ordered: per-blank pipeline
	let worstStatus: ValidationStatus | undefined;
	const allViolations: NonNullable<ValidationResult['constraintViolations']> = [];
	const incorrectIndexes: number[] = [];
	let hasConstraintResults = false;
	let emptyCount = 0;

	for (let i = 0; i < blanks.length; i++) {
		const result = validateSingleBlank(userAnswers[i], blanks[i], userAnswersLatex?.[i], instance);

		if (result.status === 'empty') {
			emptyCount++;
		}

		if (!result.isCorrect) {
			incorrectIndexes.push(i + 1);
		}

		// Aggregate worst status (priority: bad_form > unoptimal_form > correct)
		// Skip 'empty' — handled separately below
		if (result.status !== undefined && result.status !== 'empty') {
			if (worstStatus === undefined) {
				worstStatus = result.status;
			} else if (result.status === 'bad_form') {
				worstStatus = 'bad_form';
			} else if (result.status === 'unoptimal_form' && worstStatus !== 'bad_form') {
				worstStatus = 'unoptimal_form';
			}
		}

		if (result.constraintViolations) {
			hasConstraintResults = true;
			allViolations.push(...result.constraintViolations);
		}
	}

	// All blanks empty → early return
	if (emptyCount === blanks.length) {
		return { isCorrect: false, status: 'empty', feedback: "Tu n'as rien répondu." };
	}

	// Some blanks empty among multiple: apply old system's ratio logic
	if (emptyCount > 0) {
		if (emptyCount <= blanks.length / 2) {
			// ≤ half empty → unoptimal_form (unless already worse)
			if (worstStatus !== 'bad_form') {
				worstStatus = 'unoptimal_form';
			}
		}
		// > half empty → stays incorrect via incorrectIndexes
	}

	const allCorrect = incorrectIndexes.length === 0;
	const result: ValidationResult = { isCorrect: allCorrect };

	// Include constraint results when constraint checking occurred
	if (hasConstraintResults || worstStatus !== undefined) {
		if (worstStatus === 'bad_form') {
			result.isCorrect = false;
		}
		result.status = worstStatus;
		result.constraintViolations = allViolations;
	}

	if (!allCorrect) {
		if (emptyCount > 0 && blanks.length > 1) {
			result.feedback = "Tu n'as pas tout complété.";
		} else if (worstStatus === 'bad_form') {
			result.feedback = allViolations[0]?.feedback;
		} else {
			result.feedback = `Les blancs suivants sont incorrects: ${incorrectIndexes.join(', ')}`;
		}
	} else if (worstStatus === 'unoptimal_form') {
		result.feedback = allViolations[0]?.feedback;
	}

	return result;
}

/** Match a single answer against expected (algebraic equivalence or case-insensitive string) */
function isAnswerMatch(userAns: string, correctAns: string): boolean {
	if (areEquivalent(userAns, correctAns)) return true;
	return userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
}

/** Order-independent matching: each answer is matched against any unused blank */
function validateBlanksOrderIndependent(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex?: string[]
): ValidationResult {
	const blanks = instance.blanks!;

	// Count empty answers first
	let emptyCount = 0;
	for (const ans of userAnswers) {
		if (!ans.trim()) emptyCount++;
	}

	// All empty → early return
	if (emptyCount === blanks.length) {
		return { isCorrect: false, status: 'empty', feedback: "Tu n'as rien répondu." };
	}

	const used = new Set<number>();
	const matching: number[] = new Array(userAnswers.length).fill(-1);

	for (let a = 0; a < userAnswers.length; a++) {
		// Skip empty answers — they won't match anything
		if (!userAnswers[a].trim()) continue;

		for (let b = 0; b < blanks.length; b++) {
			if (used.has(b)) continue;
			if (validateBlankValue(userAnswers[a], blanks[b], instance)) {
				used.add(b);
				matching[a] = b;
				break;
			}
		}
	}

	// Count unmatched non-empty answers
	const unmatchedNonEmpty = userAnswers.filter((a, i) => a.trim() && matching[i] === -1).length;
	if (unmatchedNonEmpty > 0) {
		if (emptyCount > 0 && blanks.length > 1) {
			return { isCorrect: false, feedback: "Tu n'as pas tout complété." };
		}
		return { isCorrect: false, message: 'Incorrect' };
	}

	// Some blanks empty among multiple: apply ratio logic
	if (emptyCount > 0) {
		if (emptyCount > blanks.length / 2) {
			return { isCorrect: false, feedback: "Tu n'as pas tout complété." };
		}
		// ≤ half empty: matched answers are correct but form is suboptimal
		return {
			isCorrect: false,
			status: 'unoptimal_form',
			feedback: "Tu n'as pas tout complété."
		};
	}

	// All matched, no empty. Apply form/constraints on matched pairs.
	let worstStatus: ValidationStatus = 'correct';
	const allViolations: NonNullable<ValidationResult['constraintViolations']> = [];

	for (let a = 0; a < userAnswers.length; a++) {
		const b = matching[a];
		const blankLatex = userAnswersLatex?.[a];

		if (blanks[b].requiredForm && blankLatex) {
			const formViolations = checkRequiredForm([blankLatex], blanks[b].requiredForm!);
			if (formViolations.length > 0) {
				const feedback = getRequiredFormFeedback(blanks[b].requiredForm!, false);
				allViolations.push({ constraint: 'form', severity: 'error', feedback });
				worstStatus = 'bad_form';
			}
		}

		if (blankLatex) {
			const { status, violations } = applyConstraints(
				[userAnswers[a]],
				[blankLatex],
				[blanks[b].expectedAnswer],
				instance.options?.constraints ?? {}
			);
			if (status === 'bad_form') worstStatus = 'bad_form';
			else if (status === 'unoptimal_form' && worstStatus === 'correct')
				worstStatus = 'unoptimal_form';
			allViolations.push(...violations);
		}
	}

	if (worstStatus === 'correct') {
		return { isCorrect: true, message: 'Correct !' };
	}

	return {
		isCorrect: worstStatus !== 'bad_form',
		status: worstStatus,
		feedback: allViolations[0]?.feedback,
		constraintViolations: allViolations
	};
}

// ============================================================================
// MULTIPLE CHOICE VALIDATION
// ============================================================================

/**
 * Validate multiple choice answer(s)
 *
 * @param userAnswer - Selected choice index(es)
 * @param correctAnswer - Correct choice index(es) from instance
 * @param multipleAnswers - Whether multiple answers are allowed
 * @returns Validation result
 */
export function validateChoice(
	userAnswer: number | number[],
	correctAnswer: string | string[],
	multipleAnswers?: boolean
): ValidationResult {
	// Normalize answers to arrays of numbers
	const userIndexes = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
	const correctIndexes = Array.isArray(correctAnswer)
		? correctAnswer.map(Number)
		: [Number(correctAnswer)];

	// Sort for comparison
	const userSorted = [...userIndexes].sort((a, b) => a - b);
	const correctSorted = [...correctIndexes].sort((a, b) => a - b);

	// Check if arrays are equal
	const isCorrect =
		userSorted.length === correctSorted.length &&
		userSorted.every((val, i) => val === correctSorted[i]);

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		feedback: isCorrect
			? undefined
			: multipleAnswers
				? `Les choix corrects sont: ${correctIndexes.map((i) => String.fromCharCode(65 + i)).join(', ')}`
				: `Le choix correct est: ${String.fromCharCode(65 + correctIndexes[0])}`
	};
}
