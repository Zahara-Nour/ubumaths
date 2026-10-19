/**
 * Comparaison de grandeurs des cases à unité
 * ==========================================
 *
 * Compare la grandeur d'un élève à la grandeur attendue (`valeur\unit{…}`) :
 * conversion d'unités (affine pour °C, °F), tolérance éventuelle.
 *
 * La valeur est lue en arbre par `parseLatexQuantity` (`./parser`, mathAST) ;
 * la comparaison se fait encore en flottants : c'est un calculateur à part du
 * contrat des grandeurs (ADR 0026, chantier correction-cases-unite).
 *
 * @module questions/units/quantity-comparison
 */

import type { Unit } from './types';
import { parseLatexQuantity } from './parser';
import { unitsAreCompatible } from './operations';
import { convertAffine } from '$lib/mathAST/units/conversion';

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
	 */
	error?: 'incompatible_units' | 'invalid_user_expression' | 'invalid_expected_expression';
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
// QUANTITY COMPARISON
// ============================================================================

/**
 * Compare two LaTeX quantities (value + unit)
 *
 * Returns true if they represent the same physical quantity, accounting for:
 * - Unit conversions (e.g., 1 km = 1000 m)
 * - Numeric tolerance (optional)
 * - Expression evaluation (e.g., "3+2" = "5", lue en arbre par `parseLatexQuantity`)
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

	const userValue = userQuantity.value;
	const expectedValue = expectedQuantity.value;

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

	// Convert user value to expected unit for comparison.
	// Conversion affine (°C, °F) comprise : un simple facteur multiplicatif est
	// nul pour une unité à décalage, et TOUTE réponse en °C était refusée.
	const userValueInExpectedUnit = convertAffine(
		userValue,
		userQuantity.unit,
		expectedQuantity.unit
	);
	if (userValueInExpectedUnit === null) {
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
 * Bruit relatif des flottants toléré quand aucune tolérance n'est demandée.
 * Une conversion laisse ~1e-15 en relatif (20.000000000000057) ; 1e-12 en laisse
 * passer, mais pas 0,5 m sur 10⁹ m (5e-10). Relatif pur : aucun plancher absolu,
 * sinon 0 m était accepté pour 5·10⁻¹⁰ m. (`expected === 0` est traité à part.)
 */
const FLOAT_NOISE = 1e-12;

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

	// Sans tolérance : égalité, au bruit des flottants près. Une conversion
	// (1000 cm³ → L, 68 °F → °C) rend 1.0000000000000002 ou 20.000000000000057 ;
	// l'égalité stricte refusait ces réponses justes. La marge relative (FLOAT_NOISE)
	// n'absorbe que ce bruit : 20,001 °C contre 20 °C reste faux.
	if (!tolerance?.absolute && !tolerance?.relative) {
		return Math.abs(actual - expected) <= FLOAT_NOISE * Math.abs(expected);
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
