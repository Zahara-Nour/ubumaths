/**
 * Answer Validation Utilities
 * ============================
 *
 * Provides validation functions for different question types,
 * integrating with MathLive's Compute Engine for mathematical evaluation.
 *
 * @module utils/answer-validator
 */

import type { QuestionInstance, PrecisionType } from '$lib/questions/types';
import type { ValidationResult } from '$lib/types/question-display';
import { evaluateExpression, areEquivalent } from '$lib/questions/compute-engine/wrapper';

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate user answer against correct answer based on question type
 *
 * @param userAnswer - User's submitted answer
 * @param instance - Question instance with correct answer
 * @returns Validation result with correctness and feedback
 */
export function validateAnswer(
	userAnswer: string | string[] | number | number[],
	instance: QuestionInstance
): ValidationResult {
	const { type, answer, precision } = instance;

	try {
		switch (type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
				return validateNumerical(userAnswer as string | number, answer as string, precision);

			case 'algebraic_transform':
				return validateAlgebraic(userAnswer as string, answer as string);

			case 'fill_in_blanks':
				return validateBlanks(
					userAnswer as string[],
					instance.blanks?.map((b) => b.expectedAnswer) || []
				);

			case 'multiple_choice':
				return validateChoice(
					userAnswer as number | number[],
					answer as string | string[],
					instance.multipleAnswers
				);

			default:
				return {
					isCorrect: false,
					message: `Type de question non supporté: ${type}`
				};
		}
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if two values are approximately equal (for floating point comparison)
 *
 * @param a - First value
 * @param b - Second value
 * @param epsilon - Tolerance (default: 1e-10)
 * @returns Whether values are approximately equal
 */
export function approximatelyEqual(a: number, b: number, epsilon: number = 1e-10): boolean {
	return Math.abs(a - b) < epsilon;
}

/**
 * Normalize whitespace in string
 *
 * @param str - Input string
 * @returns String with normalized whitespace
 */
export function normalizeWhitespace(str: string): string {
	return str.trim().replace(/\s+/g, ' ');
}
