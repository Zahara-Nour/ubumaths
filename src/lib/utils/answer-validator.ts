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
	ConstraintOptions
} from '$lib/questions/types';
import type { ValidationResult } from '$lib/types/question-display';
import { evaluateExpression, areEquivalent } from '$lib/questions/compute-engine/wrapper';
import {
	checkSpaces,
	checkProducts,
	checkBrackets,
	checkZeros,
	checkForm
} from '$lib/questions/constraint-validators';
import { CONSTRAINT_FEEDBACK } from '$lib/questions/feedback';
import { validateQuantityAnswer } from '$lib/questions/units/validator';

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
		}
	];

	for (const { id, check } of checks) {
		const mode = constraints[id] as ConstraintMode | undefined;

		// Skip if off or not configured
		if (!mode || mode === 'off') continue;

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
	const { type, answer, precision } = instance;

	try {
		// Get validation result based on question type
		let result: ValidationResult;

		switch (type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
				result = validateNumerical(userAnswer as string | number, answer as string, precision);
				break;

			case 'numerical_with_unit': {
				const latexAnswer = Array.isArray(userAnswerLatex)
					? userAnswerLatex[0]
					: (userAnswerLatex ?? String(userAnswer));
				result = validateNumericalWithUnit(
					latexAnswer,
					answer as string,
					instance.options?.unitOptions
				);
				break;
			}

			case 'algebraic_transform':
				result = validateAlgebraic(userAnswer as string, answer as string);
				break;

			case 'fill_in_blanks':
				result = validateBlanks(
					userAnswer as string[],
					instance.blanks?.map((b) => b.expectedAnswer) || []
				);
				break;

			case 'multiple_choice':
				result = validateChoice(
					userAnswer as number | number[],
					answer as string | string[],
					instance.multipleAnswers
				);
				break;

			default:
				return {
					isCorrect: false,
					message: `Type de question non supporté: ${type}`
				};
		}

		// Apply constraint checks if answer is correct, constraints are configured,
		// AND LaTeX input is available (required for reliable form checking)
		if (result.isCorrect && instance.options?.constraints && userAnswerLatex) {
			const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			const expected = Array.isArray(answer) ? answer : [answer];

			const { status, violations } = applyConstraints(
				answers,
				latex,
				expected,
				instance.options.constraints
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

// ============================================================================
// NUMERICAL WITH UNIT VALIDATION
// ============================================================================

/**
 * Options for unit validation
 */
export interface UnitValidationOptions {
	/** Require exact unit match (no conversion allowed) */
	requireExactUnit?: boolean;
	/** Require matching unit symbols */
	requireSameSymbol?: boolean;
	/** Numeric tolerance */
	tolerance?: {
		absolute?: number;
		relative?: number;
	};
}

/**
 * Validate numerical answer with physical unit
 *
 * @param userAnswer - User's answer in LaTeX format (from MathLive)
 * @param correctAnswer - Correct answer in LaTeX format
 * @param options - Unit validation options
 * @returns Validation result
 */
export function validateNumericalWithUnit(
	userAnswer: string,
	correctAnswer: string,
	options?: UnitValidationOptions
): ValidationResult {
	const result = validateQuantityAnswer(userAnswer, correctAnswer, {
		requireExactUnit: options?.requireExactUnit,
		requireSameSymbol: options?.requireSameSymbol,
		tolerance: options?.tolerance
	});

	// Map to ValidationResult format
	return {
		isCorrect: result.isCorrect,
		message: result.isCorrect ? 'Correct !' : 'Incorrect',
		feedback: result.feedback ?? undefined
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
 * @returns Validation result
 */
export function validateBlanks(userAnswers: string[], correctAnswers: string[]): ValidationResult {
	if (userAnswers.length !== correctAnswers.length) {
		return {
			isCorrect: false,
			message: 'Nombre de réponses incorrect'
		};
	}

	const results = userAnswers.map((userAns, i) => {
		const correctAns = correctAnswers[i];

		// Try algebraic equivalence first
		if (areEquivalent(userAns, correctAns)) {
			return { isCorrect: true, index: i };
		}

		// Fallback to exact string match (case-insensitive)
		if (userAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
			return { isCorrect: true, index: i };
		}

		return { isCorrect: false, index: i };
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
