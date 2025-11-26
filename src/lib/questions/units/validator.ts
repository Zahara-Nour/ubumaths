/**
 * Unit System - Answer Validation
 * =================================
 *
 * Provides answer validation functionality for quantity answers,
 * comparing user input with expected answers while accounting for:
 * - Unit conversions (e.g., 1 km = 1000 m)
 * - Numeric tolerance (absolute and relative)
 * - Unit match requirements (exact unit, same symbol, compatible only)
 *
 * @module questions/units/validator
 */

import { parseLatexQuantity } from './parser';
import { compareQuantities, type Tolerance } from './ce-integration';
import { unitsAreCompatible } from './operations';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for customizing answer validation behavior
 */
export interface ValidationOptions {
	/**
	 * Require exact unit match (no conversion allowed)
	 *
	 * When true:
	 * - User must provide the exact same unit as expected
	 * - "5 km" will NOT match "5000 m" (even though values are equivalent)
	 * - Useful when testing unit conversion skills
	 *
	 * When false (default):
	 * - Any compatible unit is accepted
	 * - "5 km" will match "5000 m"
	 *
	 * @default false
	 */
	requireExactUnit?: boolean;

	/**
	 * Require matching unit symbols (same representation)
	 *
	 * When true:
	 * - User must use the same unit symbol as expected
	 * - "5 km" will NOT match "5 km" if symbols differ in any way
	 * - Less strict than requireExactUnit (allows coefficient differences)
	 *
	 * When false (default):
	 * - Any compatible unit with correct conversion is accepted
	 *
	 * @default false
	 */
	requireSameSymbol?: boolean;

	/**
	 * Numeric tolerance for value comparison
	 *
	 * Allows for rounding errors and approximate answers.
	 * If not specified, exact equality is required.
	 *
	 * @example Absolute tolerance
	 * { absolute: 0.01 }  // Accept ±0.01 difference
	 *
	 * @example Relative tolerance
	 * { relative: 0.01 }  // Accept ±1% difference
	 *
	 * @example Both
	 * { absolute: 0.1, relative: 0.02 }  // Accept if either tolerance is met
	 */
	tolerance?: Tolerance;

	/**
	 * Custom feedback messages
	 *
	 * Override default French messages with custom ones.
	 */
	messages?: {
		/** Message when unit is wrong (but compatible) */
		incorrectUnit?: string;

		/** Message when units are incompatible (different dimensions) */
		incompatibleUnit?: string;

		/** Message when value is wrong */
		incorrectValue?: string;
	};
}

/**
 * Result of answer validation
 */
export interface ValidationResult {
	/**
	 * Whether the answer is correct
	 */
	isCorrect: boolean;

	/**
	 * Detailed feedback for the user (French)
	 *
	 * - null when answer is correct
	 * - Descriptive message when answer is incorrect
	 */
	feedback: string | null;

	/**
	 * Error type classification
	 *
	 * Helps identify what aspect of the answer was wrong:
	 * - 'invalid_input': Could not parse user's answer
	 * - 'incompatible_units': Units have different dimensions (e.g., m vs kg)
	 * - 'wrong_unit': Unit is incorrect (when requireExactUnit or requireSameSymbol)
	 * - 'wrong_value': Value is incorrect (unit is correct or compatible)
	 * - 'wrong_both': Both value and unit are incorrect
	 */
	errorType?: 'invalid_input' | 'incompatible_units' | 'wrong_unit' | 'wrong_value' | 'wrong_both';

	/**
	 * Parsed user answer details
	 *
	 * Useful for providing specific feedback.
	 * Null if parsing failed.
	 */
	parsed: {
		value: number | null;
		unit: string | null;
	} | null;

	/**
	 * Expected answer details
	 *
	 * Useful for feedback generation.
	 * Null if parsing expected answer failed (configuration error).
	 */
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
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate a quantity answer against an expected answer
 *
 * This is the main entry point for validating student answers.
 * It handles:
 * - Parsing both user and expected answers
 * - Checking unit compatibility
 * - Applying unit match requirements (exact, same symbol, compatible)
 * - Comparing values with tolerance
 * - Generating appropriate feedback
 *
 * @param userAnswer - User's answer in LaTeX format
 * @param expectedAnswer - Expected answer in LaTeX format
 * @param options - Validation options
 * @returns ValidationResult with detailed feedback
 *
 * @example Basic usage (compatible units allowed)
 * ```typescript
 * validateQuantityAnswer('5000\\text{ m }', '5\\text{ km }')
 * // { isCorrect: true, feedback: null, ... }
 * ```
 *
 * @example Require exact unit
 * ```typescript
 * validateQuantityAnswer(
 *   '5000\\text{ m }',
 *   '5\\text{ km }',
 *   { requireExactUnit: true }
 * )
 * // { isCorrect: false, errorType: 'wrong_unit', feedback: 'Unité incorrecte.', ... }
 * ```
 *
 * @example With tolerance
 * ```typescript
 * validateQuantityAnswer(
 *   '3.14\\text{ m }',
 *   '3.15\\text{ m }',
 *   { tolerance: { absolute: 0.1 } }
 * )
 * // { isCorrect: true, feedback: null, ... }
 * ```
 *
 * @example Wrong value
 * ```typescript
 * validateQuantityAnswer('5\\text{ km }', '6\\text{ km }')
 * // { isCorrect: false, errorType: 'wrong_value', feedback: 'Valeur incorrecte.', ... }
 * ```
 *
 * @example Incompatible units
 * ```typescript
 * validateQuantityAnswer('5\\text{ km }', '5\\text{ kg }')
 * // { isCorrect: false, errorType: 'incompatible_units', feedback: 'Les unités ne sont pas compatibles.', ... }
 * ```
 */
export function validateQuantityAnswer(
	userAnswer: string,
	expectedAnswer: string,
	options: ValidationOptions = {}
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
		// Configuration error - expected answer is invalid
		// Still return structured result for debugging
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
			feedback: options.messages?.incompatibleUnit ?? DEFAULT_MESSAGES.incompatibleUnits,
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

	// Check requireExactUnit - units must match exactly (including coefficient)
	if (options.requireExactUnit) {
		const unitsMatch = checkExactUnitMatch(userQuantity.unit, expectedQuantity.unit);
		if (!unitsMatch) {
			return {
				isCorrect: false,
				feedback: options.messages?.incorrectUnit ?? DEFAULT_MESSAGES.incorrectUnit,
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

	// Check requireSameSymbol - unit symbols must match
	if (options.requireSameSymbol) {
		const symbolsMatch = checkSameSymbol(userQuantity.unit, expectedQuantity.unit);
		if (!symbolsMatch) {
			return {
				isCorrect: false,
				feedback: options.messages?.incorrectUnit ?? DEFAULT_MESSAGES.incorrectUnit,
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

	// Use compareQuantities for value comparison with unit conversion
	const comparisonResult = compareQuantities(userAnswer, expectedAnswer, options.tolerance);

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

	// If comparison succeeded, answer is correct
	if (comparisonResult.isEqual) {
		return {
			isCorrect: true,
			feedback: null,
			parsed,
			expected
		};
	}

	// Values don't match - answer is incorrect
	return {
		isCorrect: false,
		feedback: options.messages?.incorrectValue ?? DEFAULT_MESSAGES.incorrectValue,
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
 *
 * @param userUnit - User's unit
 * @param expectedUnit - Expected unit
 * @returns True if units are exactly the same
 */
function checkExactUnitMatch(
	userUnit: { components: Map<string, number>; coefficient: number },
	expectedUnit: { components: Map<string, number>; coefficient: number }
): boolean {
	// Check coefficient match (with small epsilon for floating point)
	const epsilon = 1e-9;
	if (Math.abs(userUnit.coefficient - expectedUnit.coefficient) > epsilon) {
		return false;
	}

	// Check components match
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
 * Check if two units have the same symbol representation
 *
 * This checks if the base unit symbols match, ignoring coefficient differences.
 * For example, "km" and "m" have different symbols (even though compatible).
 *
 * @param userUnit - User's unit
 * @param expectedUnit - Expected unit
 * @returns True if unit symbols are the same
 */
function checkSameSymbol(
	userUnit: { components: Map<string, number> },
	expectedUnit: { components: Map<string, number> }
): boolean {
	// Check components match (ignoring coefficient)
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
 *
 * Creates a simple string representation of the unit for feedback.
 *
 * @param components - Unit components map
 * @returns Formatted string or null for dimensionless
 *
 * @example
 * formatUnitForDisplay(new Map([['m', 1]])) // 'm'
 * formatUnitForDisplay(new Map([['m', 2]])) // 'm^2'
 * formatUnitForDisplay(new Map([['m', 1], ['s', -1]])) // 'm·s^-1'
 * formatUnitForDisplay(new Map()) // null
 */
function formatUnitForDisplay(components: Map<string, number>): string | null {
	// Check if dimensionless
	if (components.size === 0) {
		return null;
	}

	// Format as simple string (base symbols with exponents)
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
