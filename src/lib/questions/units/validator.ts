/**
 * Unit System - Answer Validation
 * =================================
 *
 * Provides answer validation functionality for quantity answers,
 * comparing user input with expected answers while accounting for:
 * - Unit conversions (e.g., 1 km = 1000 m)
 * - Numeric precision (PrecisionType from question types)
 * - Required unit enforcement (exact symbol match)
 *
 * @module questions/units/validator
 */

import { parseLatexQuantity } from './parser';
import { compareQuantities, type Tolerance } from './ce-integration';
import { unitsAreCompatible } from './operations';
import type { PrecisionType } from '$lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of answer validation
 */
export interface ValidationResult {
	isCorrect: boolean;
	feedback: string | null;
	errorType?: 'invalid_input' | 'incompatible_units' | 'wrong_unit' | 'wrong_value' | 'wrong_both';
	parsed: {
		value: number | null;
		unit: string | null;
	} | null;
	expected: {
		value: number | null;
		unit: string | null;
	} | null;
}

// ============================================================================
// DEFAULT MESSAGES
// ============================================================================

const DEFAULT_MESSAGES = {
	invalidInput: 'Réponse invalide. Vérifiez le format.',
	incompatibleUnits: 'Les unités ne sont pas compatibles.',
	incorrectUnit: 'Unité incorrecte.',
	incorrectValue: 'Valeur incorrecte.',
	wrongBoth: 'Valeur et unité incorrectes.'
};

// ============================================================================
// PRECISION → TOLERANCE CONVERSION
// ============================================================================

/**
 * Convert PrecisionType to Tolerance for compareQuantities.
 * Only 'tolerance' type maps directly. Other precision types (decimal,
 * significant, magnitude) are not supported for unit quantities and
 * fall back to exact comparison.
 */
function precisionToTolerance(precision?: PrecisionType): Tolerance | undefined {
	if (!precision || precision.type === 'none') return undefined;
	if (precision.type === 'tolerance') {
		return precision.mode === 'absolute'
			? { absolute: precision.tolerance }
			: { relative: precision.tolerance };
	}
	// decimal, significant, magnitude: no tolerance, exact comparison
	return undefined;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate a quantity answer against an expected answer
 *
 * @param userAnswer - User's answer in LaTeX format
 * @param expectedAnswer - Expected answer in LaTeX format
 * @param precision - Optional precision for numeric comparison (PrecisionType)
 * @param requiredUnit - Optional required unit symbol (e.g., "m"). Rejects other units.
 * @returns ValidationResult with detailed feedback
 *
 * @example Basic usage (compatible units allowed)
 * validateQuantityAnswer('5000\\unit{m}', '5\\unit{km}')
 *
 * @example With required unit
 * validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}', undefined, 'm')
 * // rejects: user used km, required m
 *
 * @example With precision
 * validateQuantityAnswer('10.3\\unit{m}', '10\\unit{m}', { type: 'tolerance', tolerance: 0.5, mode: 'absolute' })
 */
export function validateQuantityAnswer(
	userAnswer: string,
	expectedAnswer: string,
	precision?: PrecisionType,
	requiredUnit?: string
): ValidationResult {
	// Parse both answers
	const userQuantity = parseLatexQuantity(userAnswer);
	const expectedQuantity = parseLatexQuantity(expectedAnswer);

	// Check for parse failures
	if (!userQuantity) {
		return {
			isCorrect: false,
			feedback: DEFAULT_MESSAGES.invalidInput,
			errorType: 'invalid_input',
			parsed: null,
			expected: expectedQuantity
				? {
						value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
						unit: formatUnitForDisplay(expectedQuantity.unit.components)
					}
				: null
		};
	}

	if (!expectedQuantity) {
		return {
			isCorrect: false,
			feedback: 'Erreur de configuration : réponse attendue invalide.',
			errorType: 'invalid_input',
			parsed: {
				value: typeof userQuantity.value === 'number' ? userQuantity.value : null,
				unit: formatUnitForDisplay(userQuantity.unit.components)
			},
			expected: null
		};
	}

	// Extract display information
	const userUnitStr = formatUnitForDisplay(userQuantity.unit.components);
	const expectedUnitStr = formatUnitForDisplay(expectedQuantity.unit.components);

	// Check unit compatibility first
	if (!unitsAreCompatible(userQuantity.unit, expectedQuantity.unit)) {
		return {
			isCorrect: false,
			feedback: DEFAULT_MESSAGES.incompatibleUnits,
			errorType: 'incompatible_units',
			parsed: {
				value: typeof userQuantity.value === 'number' ? userQuantity.value : null,
				unit: userUnitStr
			},
			expected: {
				value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
				unit: expectedUnitStr
			}
		};
	}

	// Check requiredUnit — user must use exactly this unit (including prefix)
	// Uses checkExactUnitMatch to distinguish km from m (different coefficient)
	if (requiredUnit) {
		const unitsMatch = checkExactUnitMatch(userQuantity.unit, expectedQuantity.unit);
		if (!unitsMatch) {
			return {
				isCorrect: false,
				feedback: DEFAULT_MESSAGES.incorrectUnit,
				errorType: 'wrong_unit',
				parsed: {
					value: typeof userQuantity.value === 'number' ? userQuantity.value : null,
					unit: userUnitStr
				},
				expected: {
					value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
					unit: expectedUnitStr
				}
			};
		}
	}

	// Convert precision to tolerance for compareQuantities
	const tolerance = precisionToTolerance(precision);

	// Use compareQuantities for value comparison with unit conversion
	const comparisonResult = compareQuantities(userAnswer, expectedAnswer, tolerance);

	// Build parsed details from comparison result
	const parsed = {
		value: comparisonResult.userValue,
		unit: comparisonResult.userUnit
	};

	const expected = {
		value: comparisonResult.expectedValue,
		unit: comparisonResult.expectedUnit
	};

	// Check comparison result
	if (comparisonResult.error === 'evaluation_failed') {
		return {
			isCorrect: false,
			feedback: DEFAULT_MESSAGES.invalidInput,
			errorType: 'invalid_input',
			parsed,
			expected
		};
	}

	if (comparisonResult.isEqual) {
		return {
			isCorrect: true,
			feedback: null,
			parsed,
			expected
		};
	}

	return {
		isCorrect: false,
		feedback: DEFAULT_MESSAGES.incorrectValue,
		errorType: 'wrong_value',
		parsed,
		expected
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if two units match exactly (same components and coefficient)
 */
export function checkExactUnitMatch(
	userUnit: { components: ReadonlyMap<string, number>; coefficient: number },
	expectedUnit: { components: ReadonlyMap<string, number>; coefficient: number }
): boolean {
	const epsilon = 1e-9;
	if (Math.abs(userUnit.coefficient - expectedUnit.coefficient) > epsilon) {
		return false;
	}

	if (userUnit.components.size !== expectedUnit.components.size) {
		return false;
	}

	for (const [symbol, exponent] of userUnit.components) {
		if (expectedUnit.components.get(symbol) !== exponent) {
			return false;
		}
	}

	return true;
}

/**
 * Format unit components for display
 */
function formatUnitForDisplay(components: ReadonlyMap<string, number>): string | null {
	if (components.size === 0) {
		return null;
	}

	const parts: string[] = [];
	for (const [symbol, exponent] of components) {
		if (exponent === 1) {
			parts.push(symbol);
		} else {
			parts.push(`${symbol}^${exponent}`);
		}
	}

	return parts.join('·');
}
