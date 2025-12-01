/**
 * Unit System - ComputeEngine Integration
 * ========================================
 *
 * Integration layer between the unit system and MathLive's ComputeEngine
 * for evaluating and comparing quantities (value + unit).
 *
 * Features:
 * - Evaluate quantity numeric values using ComputeEngine
 * - Compare two quantities with unit conversion
 * - Convert quantities between compatible units
 * - Normalize quantities to SI base units
 * - Handle tolerance-based comparison
 *
 * @module questions/units/ce-integration
 */

import { evaluateExpression } from '$lib/questions/compute-engine/wrapper';
import type { Unit, Quantity } from './types';
import { parseLatexQuantity, parseUnitExpression } from './parser';
import { unitsAreCompatible, getConversionFactor, createUnit } from './operations';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of comparing two quantities
 */
export interface ComparisonResult {
	/**
	 * Whether the quantities are equal (within tolerance)
	 */
	isEqual: boolean;

	/**
	 * Evaluated numeric value from user answer (null if evaluation failed)
	 */
	userValue: number | null;

	/**
	 * Evaluated numeric value from expected answer (null if evaluation failed)
	 */
	expectedValue: number | null;

	/**
	 * User's unit symbol (null if no unit found)
	 */
	userUnit: string | null;

	/**
	 * Expected unit symbol (null if no unit found)
	 */
	expectedUnit: string | null;

	/**
	 * Error code if comparison failed
	 * - 'incompatible_units': Units have different dimensions
	 * - 'invalid_user_expression': Could not parse user's answer
	 * - 'invalid_expected_expression': Could not parse expected answer
	 * - 'evaluation_failed': Numeric evaluation failed
	 */
	error?:
		| 'incompatible_units'
		| 'invalid_user_expression'
		| 'invalid_expected_expression'
		| 'evaluation_failed';
}

/**
 * Tolerance specification for numeric comparison
 */
export interface Tolerance {
	/**
	 * Absolute tolerance (|actual - expected| <= absolute)
	 */
	absolute?: number;

	/**
	 * Relative tolerance (|actual - expected| / |expected| <= relative)
	 */
	relative?: number;
}

// ============================================================================
// VALUE EVALUATION
// ============================================================================

/**
 * Evaluate the numeric part of a LaTeX quantity using ComputeEngine
 *
 * Handles expressions like:
 * - Simple numbers: "5", "3.14", "-10"
 * - Fractions: "\frac{1}{2}"
 * - Arithmetic: "3+2", "5 \times 10^3"
 * - Complex expressions: "\sqrt{16}", "2^3"
 *
 * @param latex - LaTeX expression representing a numeric value
 * @returns Evaluated number or null if evaluation fails
 *
 * @example Simple number
 * evaluateQuantityValue('5') // 5
 *
 * @example Fraction
 * evaluateQuantityValue('\\frac{3}{2}') // 1.5
 *
 * @example Arithmetic
 * evaluateQuantityValue('3+2') // 5
 * evaluateQuantityValue('5 \\times 10^3') // 5000
 *
 * @example Invalid expression
 * evaluateQuantityValue('invalid') // null
 */
export function evaluateQuantityValue(latex: string): number | null {
	if (!latex || typeof latex !== 'string') {
		return null;
	}

	try {
		// Remove any whitespace
		const cleaned = latex.trim();

		// Use ComputeEngine to evaluate
		const result = evaluateExpression(cleaned);

		// Check if result is a number
		if (typeof result === 'number') {
			// Verify it's a valid number
			if (!isNaN(result) && isFinite(result)) {
				return result;
			}
		}

		// If result is a string, try parsing it as a number
		if (typeof result === 'string') {
			const num = parseFloat(result);
			if (!isNaN(num) && isFinite(num)) {
				return num;
			}
		}

		return null;
	} catch {
		// Evaluation failed
		return null;
	}
}

// ============================================================================
// QUANTITY COMPARISON
// ============================================================================

/**
 * Compare two LaTeX quantities (value + unit)
 *
 * Returns true if they represent the same physical quantity, accounting for:
 * - Unit conversions (e.g., 1 km = 1000 m)
 * - Numeric tolerance (optional)
 * - Expression evaluation (e.g., "3+2" = "5")
 *
 * @param userAnswer - User's answer in LaTeX format
 * @param expected - Expected answer in LaTeX format
 * @param tolerance - Optional numeric tolerance for comparison
 * @returns ComparisonResult with detailed information
 *
 * @example Exact match
 * compareQuantities('5\\unit{km}', '5\\unit{km}')
 * // { isEqual: true, userValue: 5, expectedValue: 5, ...}
 *
 * @example Unit conversion
 * compareQuantities('5\\unit{km}', '5000\\unit{m}')
 * // { isEqual: true, userValue: 5, expectedValue: 5000, ...}
 *
 * @example With tolerance
 * compareQuantities('3.14\\unit{m}', '3.15\\unit{m}', { absolute: 0.1})
 * // { isEqual: true, ...}
 *
 * @example Incompatible units
 * compareQuantities('5\\unit{km}', '5\\unit{kg}')
 * // { isEqual: false, error: 'incompatible_units', ...}
 *
 * @example Expression evaluation
 * compareQuantities('3+2\\unit{m}', '5\\unit{m}')
 * // { isEqual: true, userValue: 5, expectedValue: 5, ...}
 */
export function compareQuantities(
	userAnswer: string,
	expected: string,
	tolerance?: Tolerance
): ComparisonResult {
	// Parse both quantities
	const userQuantity = parseLatexQuantity(userAnswer);
	const expectedQuantity = parseLatexQuantity(expected);

	// Handle parse failures
	if (!userQuantity) {
		return {
			isEqual: false,
			userValue: null,
			expectedValue: null,
			userUnit: null,
			expectedUnit: null,
			error: 'invalid_user_expression'
		};
	}

	if (!expectedQuantity) {
		return {
			isEqual: false,
			userValue: null,
			expectedValue: null,
			userUnit: null,
			expectedUnit: null,
			error: 'invalid_expected_expression'
		};
	}

	// Extract unit information for result
	const userUnitStr = formatUnitForDisplay(userQuantity.unit);
	const expectedUnitStr = formatUnitForDisplay(expectedQuantity.unit);

	// Evaluate numeric values early (reused in all paths)
	const userValue = evaluateValueFromQuantity(userQuantity);
	const expectedValue = evaluateValueFromQuantity(expectedQuantity);

	// Check unit compatibility
	if (!unitsAreCompatible(userQuantity.unit, expectedQuantity.unit)) {
		return {
			isEqual: false,
			userValue,
			expectedValue,
			userUnit: userUnitStr,
			expectedUnit: expectedUnitStr,
			error: 'incompatible_units'
		};
	}

	// Check if evaluation succeeded
	if (userValue === null || expectedValue === null) {
		return {
			isEqual: false,
			userValue,
			expectedValue,
			userUnit: userUnitStr,
			expectedUnit: expectedUnitStr,
			error: 'evaluation_failed'
		};
	}

	// Convert user value to expected unit for comparison
	const conversionFactor = getConversionFactor(userQuantity.unit, expectedQuantity.unit);
	if (conversionFactor === null) {
		// Should not happen since we checked compatibility above
		return {
			isEqual: false,
			userValue,
			expectedValue,
			userUnit: userUnitStr,
			expectedUnit: expectedUnitStr,
			error: 'incompatible_units'
		};
	}

	const userValueInExpectedUnit = userValue * conversionFactor;

	// Compare values with tolerance
	const isEqual = compareValuesWithTolerance(userValueInExpectedUnit, expectedValue, tolerance);

	return {
		isEqual,
		userValue,
		expectedValue,
		userUnit: userUnitStr,
		expectedUnit: expectedUnitStr
	};
}

/**
 * Evaluate the numeric value from a Quantity object
 *
 * Handles both numeric values and LaTeX expressions.
 *
 * @param quantity - Quantity to evaluate
 * @returns Evaluated number or null
 */
function evaluateValueFromQuantity(quantity: Quantity): number | null {
	if (typeof quantity.value === 'number') {
		return quantity.value;
	}

	if (typeof quantity.value === 'string') {
		return evaluateQuantityValue(quantity.value);
	}

	return null;
}

/**
 * Compare two numeric values with optional tolerance
 *
 * @param actual - Actual value
 * @param expected - Expected value
 * @param tolerance - Optional tolerance specification
 * @returns True if values are equal within tolerance
 */
function compareValuesWithTolerance(
	actual: number,
	expected: number,
	tolerance?: Tolerance
): boolean {
	// Validate inputs are finite numbers
	if (!isFinite(actual) || !isFinite(expected)) {
		return false;
	}

	// Handle exact zero case
	if (expected === 0) {
		if (!tolerance?.absolute) {
			return actual === 0;
		}
		return Math.abs(actual) <= tolerance.absolute;
	}

	// Check absolute tolerance
	if (tolerance?.absolute !== undefined) {
		if (Math.abs(actual - expected) <= tolerance.absolute) {
			return true;
		}
	}

	// Check relative tolerance
	// Use small epsilon to handle floating point precision at boundaries
	if (tolerance?.relative !== undefined) {
		const relativeDiff = Math.abs((actual - expected) / expected);
		const epsilon = 1e-10; // Handle floating point precision
		if (relativeDiff <= tolerance.relative + epsilon) {
			return true;
		}
	}

	// If no tolerance specified, require exact equality
	if (!tolerance?.absolute && !tolerance?.relative) {
		return actual === expected;
	}

	return false;
}

/**
 * Format a unit for display in comparison results
 *
 * @param unit - Unit to format
 * @returns String representation or null for dimensionless
 */
function formatUnitForDisplay(unit: Unit): string | null {
	// Check if dimensionless
	if (unit.components.size === 0) {
		return null;
	}

	// Format as simple string (base symbols with exponents)
	const parts: string[] = [];
	for (const [symbol, exponent] of unit.components) {
		if (exponent === 1) {
			parts.push(symbol);
		} else {
			parts.push(`${symbol}^${exponent}`);
		}
	}

	return parts.join('·');
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

/**
 * Convert a quantity to a different unit
 *
 * Returns null if units are incompatible (different dimensions).
 *
 * @param quantity - LaTeX quantity string (e.g., "5\\unit{km}")
 * @param targetUnit - Target unit symbol (e.g., "m")
 * @returns Quantity in target unit or null if incompatible
 *
 * @example Length conversion
 * convertQuantity('5\\unit{km}', 'm')
 * // { value: 5000, unit: { components: Map{'m' => 1}, coefficient: 1}}
 *
 * @example Time conversion
 * convertQuantity('2\\unit{h}', 'min')
 * // { value: 120, unit: { components: Map{'s' => 1}, coefficient: 60}}
 *
 * @example Incompatible units
 * convertQuantity('5\\unit{km}', 's')
 * // null
 *
 * @example Complex unit conversion
 * convertQuantity('90\\unit{km/h}', 'm/s')
 * // { value: 25, unit: { components: Map{'m' => 1, 's' => -1}, coefficient: 1}}
 */
export function convertQuantity(quantity: string, targetUnit: string): Quantity | null {
	// Parse the input quantity
	const parsedQuantity = parseLatexQuantity(quantity);
	if (!parsedQuantity) {
		return null;
	}

	// Parse the target unit
	const targetUnitParsed = parseUnitExpression(targetUnit);
	if (!targetUnitParsed) {
		// Try creating simple unit
		try {
			const simpleUnit = createUnit(targetUnit);
			return convertQuantityToUnit(parsedQuantity, simpleUnit);
		} catch {
			return null;
		}
	}

	return convertQuantityToUnit(parsedQuantity, targetUnitParsed);
}

/**
 * Convert a Quantity object to a target Unit
 *
 * @param quantity - Source quantity
 * @param targetUnit - Target unit
 * @returns Converted quantity or null
 */
function convertQuantityToUnit(quantity: Quantity, targetUnit: Unit): Quantity | null {
	// Check compatibility
	if (!unitsAreCompatible(quantity.unit, targetUnit)) {
		return null;
	}

	// Get conversion factor
	const conversionFactor = getConversionFactor(quantity.unit, targetUnit);
	if (conversionFactor === null) {
		return null;
	}

	// Evaluate the value
	const numericValue = evaluateValueFromQuantity(quantity);
	if (numericValue === null) {
		return null;
	}

	// Apply conversion
	const convertedValue = numericValue * conversionFactor;

	return {
		value: convertedValue,
		unit: targetUnit
	};
}

// ============================================================================
// BASE UNIT NORMALIZATION
// ============================================================================

/**
 * Normalize a quantity to SI base units
 *
 * Converts both the value and unit to the fundamental SI representation.
 * For example:
 * - 5 km → 5000 m
 * - 2 h → 7200 s
 * - 90 km/h → 25 m/s
 *
 * @param latex - LaTeX quantity string
 * @returns Normalized quantity in base units or null if parsing fails
 *
 * @example Length
 * normalizeToBaseUnits('5\\unit{km}')
 * // { value: 5000, unit: { components: Map{'m' => 1}, coefficient: 1}}
 *
 * @example Time
 * normalizeToBaseUnits('2\\unit{h}')
 * // { value: 7200, unit: { components: Map{'s' => 1}, coefficient: 1}}
 *
 * @example Speed
 * normalizeToBaseUnits('90\\unit{km/h}')
 * // { value: 25, unit: { components: Map{'m' => 1, 's' => -1}, coefficient: 1}}
 *
 * @example Complex unit
 * normalizeToBaseUnits('1.5\\unit{kg·m²/s²}')
 * // { value: 1.5, unit: { components: Map{'kg' => 1, 'm' => 2, 's' => -2}, coefficient: 1}}
 *
 * @example Already in base units
 * normalizeToBaseUnits('10\\unit{m}')
 * // { value: 10, unit: { components: Map{'m' => 1}, coefficient: 1}}
 */
export function normalizeToBaseUnits(latex: string): Quantity | null {
	// Parse the quantity
	const quantity = parseLatexQuantity(latex);
	if (!quantity) {
		return null;
	}

	// Evaluate the numeric value
	const numericValue = evaluateValueFromQuantity(quantity);
	if (numericValue === null) {
		return null;
	}

	// The unit coefficient tells us the conversion to base units
	// For example, km has coefficient 1000, so 5 km = 5 * 1000 = 5000 (in base m)
	const normalizedValue = numericValue * quantity.unit.coefficient;

	// Create base unit (same components but coefficient 1)
	const baseUnit: Unit = {
		components: new Map(quantity.unit.components),
		coefficient: 1
	};

	return {
		value: normalizedValue,
		unit: baseUnit
	};
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a LaTeX string contains a valid quantity
 *
 * Returns true only if the quantity can be parsed AND the value
 * evaluates to a finite number (not Infinity or NaN).
 *
 * @param latex - LaTeX string to check
 * @returns True if string can be parsed as a valid quantity
 *
 * @example
 * isValidQuantity('5\\unit{km}') // true
 * isValidQuantity('\\frac{1}{0}\\unit{m}') // false (division by zero)
 * isValidQuantity('invalid') // false
 */
export function isValidQuantity(latex: string): boolean {
	const quantity = parseLatexQuantity(latex);
	if (!quantity) {
		return false;
	}

	// Check that the value evaluates to a finite number
	const value = evaluateValueFromQuantity(quantity);
	return value !== null && isFinite(value);
}

/**
 * Get the unit from a LaTeX quantity string
 *
 * @param latex - LaTeX quantity string
 * @returns Unit object or null if parsing fails
 *
 * @example
 * getUnitFromQuantity('5\\unit{km}')
 * // { components: Map{'m' => 1}, coefficient: 1000}
 */
export function getUnitFromQuantity(latex: string): Unit | null {
	const quantity = parseLatexQuantity(latex);
	return quantity?.unit ?? null;
}

/**
 * Get the numeric value from a LaTeX quantity string
 *
 * Evaluates the expression and returns the number.
 *
 * @param latex - LaTeX quantity string
 * @returns Evaluated numeric value or null
 *
 * @example
 * getValueFromQuantity('5\\unit{km}') // 5
 * getValueFromQuantity('\\frac{3}{2}\\unit{m}') // 1.5
 */
export function getValueFromQuantity(latex: string): number | null {
	const quantity = parseLatexQuantity(latex);
	if (!quantity) {
		return null;
	}

	return evaluateValueFromQuantity(quantity);
}
