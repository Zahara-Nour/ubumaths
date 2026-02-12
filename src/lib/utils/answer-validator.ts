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
import {
	checkSpaces,
	checkProducts,
	checkBrackets,
	checkZeros,
	checkForm,
	checkNullTerms,
	checkFactorOne,
	checkFactorZero,
	checkSigns,
	checkReducedFractions,
	checkUnit
} from '$lib/questions/constraint-validators';
import { CONSTRAINT_FEEDBACK } from '$lib/questions/feedback';
import { evaluateRule, type EvaluationContext } from '$lib/questions/validation-rule-evaluator';
import { checkRequiredForm, getRequiredFormFeedback } from '$lib/questions/required-form-validator';

// ============================================================================
// CONSTRAINT CHECKING
// ============================================================================

/**
 * Apply constraint checks to a mathematically correct answer
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

	// Define constraint checks
	const checks: Array<{
		id: ConstraintId;
		check: () => number[];
	}> = [
		// Existing text/regex-based validators
		{ id: 'spaces', check: () => checkSpaces(answersLatex) },
		{ id: 'products', check: () => checkProducts(answersLatex) },
		{
			id: 'brackets',
			check: () =>
				checkBrackets(answersLatex, {
					allowFirstNegative: constraints.allowBracketsInFirstNegativeTerm
				})
		},
		{ id: 'zeros', check: () => checkZeros(answers) },
		{
			id: 'form',
			check: () =>
				checkForm(answersLatex, expectedAnswers, { strictForm: constraints.form === 'strict' })
		},
		// New Compute Engine pattern-matching validators
		{ id: 'nullTerms', check: () => checkNullTerms(answersLatex) },
		{ id: 'factorOne', check: () => checkFactorOne(answersLatex) },
		{ id: 'factorZero', check: () => checkFactorZero(answersLatex) },
		{ id: 'signs', check: () => checkSigns(answersLatex) },
		{ id: 'reducedFractions', check: () => checkReducedFractions(answersLatex) },
		// Unit matching (numerical_with_unit questions - no-op for non-unit answers)
		{ id: 'unit', check: () => checkUnit(answersLatex, expectedAnswers) }
	];

	for (const { id, check } of checks) {
		const mode = (constraints[id] as ConstraintMode | undefined) ?? DEFAULT_CONSTRAINT_MODE;

		// Skip if explicitly disabled
		if (mode === 'off') continue;

		const problematic = check();
		if (problematic.length > 0) {
			const isMultiple = answers.length > 1;
			const feedback = CONSTRAINT_FEEDBACK[id][isMultiple ? 'multiple' : 'single'];

			if (mode === 'strict') {
				violations.push({ constraint: id, severity: 'error', feedback });
				worstStatus = 'bad_form';
			} else {
				// mode === 'warn' -> partial credit
				violations.push({ constraint: id, severity: 'warning', feedback });
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
	const { solution } = instance;
	const questionType = getQuestionType(instance);

	try {
		// Check custom validation rules first (for testAnswers-style questions)
		// These are used when the correct answer depends on generated variables
		if (instance.validationRules && instance.validationRules.length > 0) {
			const userAnswerStr = Array.isArray(userAnswer) ? String(userAnswer[0]) : String(userAnswer);
			const ruleResult = evaluateValidationRules(instance.validationRules, userAnswerStr, instance);

			if (ruleResult) {
				// Rule validation failed
				return ruleResult;
			}

			// All rules passed - answer is correct
			return { isCorrect: true };
		}

		// Get validation result based on question type (inferred from structure)
		let result: ValidationResult;

		if (questionType === 'multiple_choice') {
			result = validateChoice(
				userAnswer as number | number[],
				solution as string | string[],
				instance.multipleAnswers
			);
		} else if (questionType === 'fill_in_blanks') {
			if (instance.blanks && instance.blanks.length > 0) {
				const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
				result = validateBlanks(
					answers,
					instance.blanks.map((b) => b.expectedAnswer),
					instance.options?.orderIndependent
				);
			} else {
				result = { isCorrect: false, message: 'Pas de blanks[] définis' };
			}
		} else {
			return {
				isCorrect: false,
				message: `Type de question non supporté: ${questionType}`
			};
		}

		// Apply required form check FIRST if configured (takes precedence over constraints)
		// This validates structural form (product, sum, fraction, etc.)
		if (result.isCorrect && instance.requiredForm && userAnswerLatex) {
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			const formViolations = checkRequiredForm(latex, instance.requiredForm);

			if (formViolations.length > 0) {
				const feedback = getRequiredFormFeedback(instance.requiredForm, latex.length > 1);
				return {
					isCorrect: false,
					status: 'bad_form',
					feedback,
					constraintViolations: [
						{
							constraint: 'form',
							severity: 'error',
							feedback
						}
					]
				};
			}
		}

		// Apply constraint checks if answer is correct and LaTeX input is available.
		// Constraints use DEFAULT_CONSTRAINT_MODE ('warn') when not explicitly set,
		// so we always run checks even without explicit constraints in the template.
		if (result.isCorrect && userAnswerLatex) {
			const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			// For fill_in_blanks: use blanks[].expectedAnswer
			// For multiple_choice: use solution (index-based, constraints less relevant)
			const expected = instance.blanks
				? instance.blanks.map((b) => b.expectedAnswer)
				: Array.isArray(solution)
					? solution
					: solution
						? [solution]
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
				// Keep isCorrect true but add feedback
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
// FILL-IN-BLANKS VALIDATION
// ============================================================================

/**
 * Validate fill-in-blanks answers
 *
 * @param userAnswers - Array of user answers for each blank
 * @param correctAnswers - Array of correct answers
 * @param orderIndependent - When true, answers can be in any order (pool matching)
 * @returns Validation result
 */
export function validateBlanks(
	userAnswers: string[],
	correctAnswers: string[],
	orderIndependent?: boolean
): ValidationResult {
	if (userAnswers.length !== correctAnswers.length) {
		return {
			isCorrect: false,
			message: 'Nombre de réponses incorrect'
		};
	}

	if (orderIndependent) {
		return validateBlanksOrderIndependent(userAnswers, correctAnswers);
	}

	const results = userAnswers.map((userAns, i) => {
		const correctAns = correctAnswers[i];
		return { isCorrect: isAnswerMatch(userAns, correctAns), index: i };
	});

	const allCorrect = results.every((r) => r.isCorrect);
	const incorrectIndexes = results.filter((r) => !r.isCorrect).map((r) => r.index + 1);

	return {
		isCorrect: allCorrect,
		message: allCorrect ? 'Correct !' : 'Incorrect',
		feedback: allCorrect
			? undefined
			: `Les blancs suivants sont incorrects: ${incorrectIndexes.join(', ')}`
	};
}

/** Match a single answer against expected (algebraic equivalence or case-insensitive string) */
function isAnswerMatch(userAns: string, correctAns: string): boolean {
	if (areEquivalent(userAns, correctAns)) return true;
	return userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
}

/** Order-independent matching: each answer is matched against any unused correct answer */
function validateBlanksOrderIndependent(
	userAnswers: string[],
	correctAnswers: string[]
): ValidationResult {
	const used = new Set<number>();

	for (const userAns of userAnswers) {
		let matched = false;
		for (let i = 0; i < correctAnswers.length; i++) {
			if (used.has(i)) continue;
			if (isAnswerMatch(userAns, correctAnswers[i])) {
				used.add(i);
				matched = true;
				break;
			}
		}
		if (!matched) {
			return { isCorrect: false, message: 'Incorrect' };
		}
	}

	return { isCorrect: true, message: 'Correct !' };
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
