/**
 * Riddle Answer Validation Utilities
 * Validates student answers for automatic validation
 */

import type { AnswerConfig } from '$lib/types/riddle';

/**
 * Validation result
 */
export interface ValidationResult {
	isCorrect: boolean;
	message?: string;
	details?: unknown;
}

/**
 * Validate a student answer against the riddle's answer configuration
 */
export function validateRiddleAnswer(
	submittedAnswer: unknown,
	answerConfig: AnswerConfig | null
): ValidationResult {
	// No automatic validation configured
	if (!answerConfig) {
		return {
			isCorrect: false,
			message: 'Validation manuelle requise'
		};
	}

	switch (answerConfig.type) {
		case 'numerical':
			return validateNumericalAnswer(submittedAnswer, answerConfig);
		case 'text':
			return validateTextAnswer(submittedAnswer, answerConfig);
		case 'qcm':
			return validateQcmAnswer(submittedAnswer, answerConfig);
		case 'math':
			return validateMathAnswer(submittedAnswer, answerConfig);
		default:
			return {
				isCorrect: false,
				message: 'Type de validation inconnu'
			};
	}
}

/**
 * Validate numerical answer with tolerance
 */
function validateNumericalAnswer(submittedAnswer: unknown, config: AnswerConfig): ValidationResult {
	const submitted = parseFloat(String(submittedAnswer));
	const expected = parseFloat(String(config.value));

	if (isNaN(submitted)) {
		return {
			isCorrect: false,
			message: 'Réponse invalide (nombre attendu)'
		};
	}

	if (isNaN(expected)) {
		return {
			isCorrect: false,
			message: 'Configuration invalide'
		};
	}

	const tolerance = config.options?.tolerance ?? 0.01;
	const difference = Math.abs(submitted - expected);
	const isCorrect = difference <= tolerance;

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		details: {
			submitted,
			expected,
			difference,
			tolerance
		}
	};
}

/**
 * Validate text answer (exact match, optionally case insensitive)
 */
function validateTextAnswer(submittedAnswer: unknown, config: AnswerConfig): ValidationResult {
	const submitted = String(submittedAnswer).trim();
	const expected = String(config.value).trim();
	const caseSensitive = config.options?.caseSensitive ?? false;

	let isCorrect: boolean;
	if (caseSensitive) {
		isCorrect = submitted === expected;
	} else {
		isCorrect = submitted.toLowerCase() === expected.toLowerCase();
	}

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		details: {
			submitted,
			expected,
			caseSensitive
		}
	};
}

/**
 * Validate QCM answer (multiple choice)
 */
function validateQcmAnswer(submittedAnswer: unknown, config: AnswerConfig): ValidationResult {
	const choices = config.options?.choices || [];
	const multipleAnswers = config.options?.multipleAnswers ?? false;

	if (!Array.isArray(choices) || choices.length === 0) {
		return {
			isCorrect: false,
			message: 'Configuration invalide (choix manquants)'
		};
	}

	// Expected answer can be a single index or array of indices
	const expectedIndices = Array.isArray(config.value) ? config.value : [config.value];

	let submittedIndices: number[];
	if (Array.isArray(submittedAnswer)) {
		submittedIndices = submittedAnswer.map((v) => Number(v));
	} else {
		submittedIndices = [Number(submittedAnswer)];
	}

	// Check if all submitted indices are valid
	const allValid = submittedIndices.every((i) => i >= 0 && i < choices.length);
	if (!allValid) {
		return {
			isCorrect: false,
			message: 'Réponse invalide'
		};
	}

	// Compare sets of indices
	const expectedSet = new Set(expectedIndices.map(String));
	const submittedSet = new Set(submittedIndices.map(String));

	const isCorrect =
		expectedSet.size === submittedSet.size && [...expectedSet].every((i) => submittedSet.has(i));

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		details: {
			submitted: submittedIndices,
			expected: expectedIndices,
			multipleAnswers
		}
	};
}

/**
 * Validate mathematical expression
 * This is a simplified version - for production, use a proper math parser
 */
function validateMathAnswer(submittedAnswer: unknown, config: AnswerConfig): ValidationResult {
	const submitted = String(submittedAnswer).trim();
	const expected = String(config.value).trim();
	const exactMatch = config.options?.exactMatch ?? true;

	// Remove all whitespace for comparison
	const normalizeExpression = (expr: string) => expr.replace(/\s+/g, '');

	const submittedNormalized = normalizeExpression(submitted);
	const expectedNormalized = normalizeExpression(expected);

	// For now, just do string comparison
	// In production, use a proper math expression parser/evaluator
	const isCorrect = submittedNormalized === expectedNormalized;

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		details: {
			submitted,
			expected,
			exactMatch
		}
	};
}

/**
 * Format validation result for display
 */
export function formatValidationMessage(result: ValidationResult): string {
	if (result.isCorrect) {
		return '✓ Réponse correcte !';
	}

	return result.message || '✗ Réponse incorrecte';
}

/**
 * Check if answer is complete (not empty)
 */
export function isAnswerComplete(answer: unknown, answerType: string): boolean {
	if (answer === null || answer === undefined) return false;

	switch (answerType) {
		case 'numerical':
			return String(answer).trim().length > 0 && !isNaN(parseFloat(String(answer)));
		case 'text':
			return String(answer).trim().length > 0;
		case 'qcm':
			return Array.isArray(answer) ? answer.length > 0 : answer !== null;
		case 'math':
			return String(answer).trim().length > 0;
		default:
			return false;
	}
}

/**
 * Get placeholder text for answer input based on type
 */
export function getAnswerPlaceholder(answerType: string): string {
	switch (answerType) {
		case 'numerical':
			return 'Entrez un nombre...';
		case 'text':
			return 'Entrez votre réponse...';
		case 'qcm':
			return 'Sélectionnez une ou plusieurs réponses';
		case 'math':
			return 'Entrez une expression mathématique...';
		default:
			return 'Votre réponse...';
	}
}

/**
 * Sanitize user answer before submission
 */
export function sanitizeAnswer(answer: unknown, answerType: string): unknown {
	switch (answerType) {
		case 'numerical':
			return parseFloat(String(answer));
		case 'text':
			return String(answer).trim();
		case 'qcm':
			return Array.isArray(answer) ? answer : [answer];
		case 'math':
			return String(answer).trim();
		default:
			return answer;
	}
}
