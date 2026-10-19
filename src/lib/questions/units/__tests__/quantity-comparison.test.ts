/**
 * Comparaison de grandeurs des cases à unité — tests
 * ===================================================
 *
 * 1. Valeur d'une écriture — lue en arbre par `parseLatexQuantity` (mathAST)
 * 2. compareQuantities — comparaison avec conversion d'unités et tolérance
 * 3. Cas limites — zéro, négatifs, très grands / très petits, sans dimension
 */

import { describe, test, expect } from 'vitest';
import { compareQuantities, type ComparisonResult, type Tolerance } from '../quantity-comparison';
import { parseLatexQuantity } from '../parser';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Helper to check if a ComparisonResult is equal (convenience for tests)
 */
function isComparisonEqual(result: ComparisonResult): boolean {
	return result.isEqual === true;
}

/**
 * Helper to check if a ComparisonResult has a specific error
 */
function hasComparisonError(result: ComparisonResult, error: string): boolean {
	return result.error === error;
}

/** Valeur d'une écriture sans unité, lue comme `parseLatexQuantity` la lit ; null si illisible */
function evaluateQuantityValue(latex: string): number | null {
	return parseLatexQuantity(latex)?.value ?? null;
}

// ============================================================================
// Valeur d'une écriture (parseLatexQuantity)
// ============================================================================

describe('valeur lue en arbre', () => {
	describe('Simple numbers', () => {
		test('should evaluate positive integer', () => {
			expect(evaluateQuantityValue('5')).toBe(5);
		});

		test('should evaluate negative integer', () => {
			expect(evaluateQuantityValue('-10')).toBe(-10);
		});

		test('should evaluate positive decimal', () => {
			expect(evaluateQuantityValue('3.14')).toBe(3.14);
		});

		test('should evaluate negative decimal', () => {
			expect(evaluateQuantityValue('-2.5')).toBe(-2.5);
		});

		test('should evaluate zero', () => {
			expect(evaluateQuantityValue('0')).toBe(0);
		});

		test('should handle whitespace', () => {
			expect(evaluateQuantityValue('  5  ')).toBe(5);
		});
	});

	describe('Fractions', () => {
		test('should evaluate simple fraction', () => {
			expect(evaluateQuantityValue('\\frac{1}{2}')).toBe(0.5);
		});

		test('should evaluate fraction reducing to integer', () => {
			expect(evaluateQuantityValue('\\frac{4}{2}')).toBe(2);
		});

		test('should evaluate complex fraction', () => {
			expect(evaluateQuantityValue('\\frac{3}{4}')).toBe(0.75);
		});

		test('should evaluate negative fraction', () => {
			expect(evaluateQuantityValue('\\frac{-3}{2}')).toBe(-1.5);
		});

		test('should evaluate fraction with decimals', () => {
			const result = evaluateQuantityValue('\\frac{1}{3}');
			expect(result).toBeCloseTo(0.3333, 4);
		});
	});

	describe('Arithmetic expressions', () => {
		test('should evaluate addition', () => {
			expect(evaluateQuantityValue('3+2')).toBe(5);
		});

		test('should evaluate subtraction', () => {
			expect(evaluateQuantityValue('10-3')).toBe(7);
		});

		test('should evaluate multiplication', () => {
			expect(evaluateQuantityValue('2*4')).toBe(8);
		});

		test('should evaluate division', () => {
			expect(evaluateQuantityValue('10/2')).toBe(5);
		});

		test('should respect operator precedence', () => {
			expect(evaluateQuantityValue('2+3*4')).toBe(14);
		});

		test('should evaluate with parentheses', () => {
			expect(evaluateQuantityValue('(2+3)*4')).toBe(20);
		});
	});

	describe('Powers and exponentials', () => {
		test('should evaluate simple power', () => {
			expect(evaluateQuantityValue('2^3')).toBe(8);
		});

		test('should evaluate power of ten', () => {
			expect(evaluateQuantityValue('10^3')).toBe(1000);
		});

		test('should evaluate negative exponent', () => {
			// L'exposant négatif s'écrit entre accolades
			expect(evaluateQuantityValue('2^{-1}')).toBe(0.5);
		});

		test('should evaluate square', () => {
			expect(evaluateQuantityValue('5^2')).toBe(25);
		});

		test('exposant décimal : illisible (tidy ne le réduit pas)', () => {
			// Refus honnête : aucune saisie élève ni aucun attendu publié ne l'écrit
			expect(evaluateQuantityValue('9^{0.5}')).toBeNull();
		});
	});

	describe('Scientific notation', () => {
		test('should evaluate scientific with \\times', () => {
			expect(evaluateQuantityValue('5\\times 10^3')).toBe(5000);
		});

		test('should evaluate scientific with \\cdot', () => {
			expect(evaluateQuantityValue('2\\cdot 10^2')).toBe(200);
		});

		test('should evaluate small scientific notation', () => {
			// L'exposant négatif s'écrit entre accolades
			expect(evaluateQuantityValue('5\\times 10^{-2}')).toBe(0.05);
		});

		test('should evaluate negative mantissa', () => {
			expect(evaluateQuantityValue('-3\\times 10^2')).toBe(-300);
		});
	});

	describe('Complex expressions', () => {
		test('should evaluate square root', () => {
			expect(evaluateQuantityValue('\\sqrt{16}')).toBe(4);
		});

		test('should evaluate nested expression', () => {
			expect(evaluateQuantityValue('2*(3+\\sqrt{1})')).toBe(8);
		});
	});

	describe('Invalid inputs', () => {
		test('should return null for non-string empty', () => {
			expect(evaluateQuantityValue('')).toBeNull();
		});

		test('should return null for null', () => {
			// @ts-expect-error - Testing runtime behavior with invalid input
			expect(evaluateQuantityValue(null)).toBeNull();
		});

		test('should return null for undefined', () => {
			// @ts-expect-error - Testing runtime behavior with invalid input
			expect(evaluateQuantityValue(undefined)).toBeNull();
		});

		test('should return null for invalid expression', () => {
			expect(evaluateQuantityValue('abc')).toBeNull();
		});

		test('should return null for malformed fraction', () => {
			expect(evaluateQuantityValue('\\frac{1}{0}')).toBeNull();
		});

		test('should return null for NaN result', () => {
			expect(evaluateQuantityValue('0/0')).toBeNull();
		});

		test('should return null for Infinity', () => {
			expect(evaluateQuantityValue('1/0')).toBeNull();
		});

		test('should return null for truly invalid expression', () => {
			// Note : '3+' pourrait être lu comme '3'
			// Test with clearly invalid LaTeX instead
			expect(evaluateQuantityValue('\\invalid')).toBeNull();
		});
	});
});

// ============================================================================
// compareQuantities - Basic Comparison
// ============================================================================

describe('compareQuantities - exact match', () => {
	describe('Same value and unit', () => {
		test('should match identical quantities', () => {
			const result = compareQuantities('5\\unit{m}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(5);
			expect(result.expectedValue).toBe(5);
			expect(result.userUnit).toBe('m');
			expect(result.expectedUnit).toBe('m');
		});

		test('should match with multiple spaces', () => {
			const result = compareQuantities('5\\unit{ m }', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should match different numeric formats', () => {
			const result = compareQuantities('5.0\\unit{m}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Different values, same unit', () => {
		test('should not match different values', () => {
			const result = compareQuantities('5\\unit{m}', '6\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(result.userValue).toBe(5);
			expect(result.expectedValue).toBe(6);
		});

		test('should not match off by one', () => {
			const result = compareQuantities('4\\unit{m}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
		});
	});

	describe('Unit conversion', () => {
		test('should convert km to m', () => {
			const result = compareQuantities('1\\unit{km}', '1000\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(1);
			expect(result.expectedValue).toBe(1000);
		});

		test('should convert m to km', () => {
			const result = compareQuantities('1000\\unit{m}', '1\\unit{km}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert cm to m', () => {
			const result = compareQuantities('50\\unit{cm}', '0.5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert mm to m', () => {
			const result = compareQuantities('1500\\unit{mm}', '1.5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert kg to g', () => {
			const result = compareQuantities('2\\unit{kg}', '2000\\unit{g}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert hours to minutes', () => {
			const result = compareQuantities('2\\unit{h}', '120\\unit{min}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert hours to seconds', () => {
			const result = compareQuantities('1\\unit{h}', '3600\\unit{s}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert minutes to seconds', () => {
			const result = compareQuantities('5\\unit{min}', '300\\unit{s}');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Composite unit conversion', () => {
		test('should convert km/h to m/s', () => {
			const result = compareQuantities('90\\unit{km/h}', '25\\unit{m/s}');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert m/s to km/h', () => {
			const result = compareQuantities('10\\unit{m/s}', '36\\unit{km/h}');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Incompatible units', () => {
		test('should fail for meters vs seconds', () => {
			const result = compareQuantities('5\\unit{m}', '5\\unit{s}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'incompatible_units')).toBe(true);
		});

		test('should fail for kg vs m', () => {
			const result = compareQuantities('5\\unit{kg}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'incompatible_units')).toBe(true);
		});

		test('should fail for hours vs meters', () => {
			const result = compareQuantities('2\\unit{h}', '2\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'incompatible_units')).toBe(true);
		});
	});

	describe('Expression evaluation in quantities', () => {
		test('should evaluate arithmetic in value', () => {
			const result = compareQuantities('3+2\\unit{m}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(5);
		});

		test('should evaluate fraction in value', () => {
			const result = compareQuantities('\\frac{3}{2}\\unit{m}', '1.5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(1.5);
		});

		test('should evaluate scientific notation in value', () => {
			const result = compareQuantities('5\\times 10^2\\unit{m}', '500\\unit{m}');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Invalid input handling', () => {
		test('should return error for invalid user expression', () => {
			const result = compareQuantities('invalid\\unit{m}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'invalid_user_expression')).toBe(true);
			expect(result.userValue).toBeNull();
		});

		test('should return error for invalid expected expression', () => {
			const result = compareQuantities('5\\unit{m}', 'invalid\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'invalid_expected_expression')).toBe(true);
			expect(result.expectedValue).toBeNull();
		});

		test('should return error for invalid unit in user answer', () => {
			const result = compareQuantities('5\\unit{xyz}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
		});

		test('division par zéro : valeur illisible', () => {
			const result = compareQuantities('\\frac{1}{0}\\unit{m}', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'invalid_user_expression')).toBe(true);
		});

		test('should handle empty user answer', () => {
			const result = compareQuantities('', '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
			expect(result.error).toBeDefined();
		});

		test('should handle null values gracefully', () => {
			// @ts-expect-error Testing invalid input
			const result = compareQuantities(null, '5\\unit{m}');
			expect(isComparisonEqual(result)).toBe(false);
		});
	});
});

// ============================================================================
// compareQuantities - With Absolute Tolerance
// ============================================================================

describe('compareQuantities - absolute tolerance', () => {
	test('should match within absolute tolerance', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('5.01\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should not match outside absolute tolerance', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('5.2\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(false);
	});

	test('should match exactly at tolerance boundary', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('5.1\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should work with zero expected value', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('0.05\\unit{m}', '0\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should work with negative values', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('-5.05\\unit{m}', '-5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should apply tolerance after unit conversion', () => {
		const tolerance: Tolerance = { absolute: 100 };
		const result = compareQuantities('1.05\\unit{km}', '1000\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});
});

// ============================================================================
// compareQuantities - With Relative Tolerance
// ============================================================================

describe('compareQuantities - relative tolerance', () => {
	test('should match within relative tolerance', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('5.05\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should not match outside relative tolerance', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('5.1\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(false);
	});

	test('should match exactly at tolerance boundary', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('5.05\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should use relative tolerance for large values', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('1010\\unit{m}', '1000\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should handle relative tolerance with small values', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('0.505\\unit{m}', '0.5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});
});

// ============================================================================
// compareQuantities - With Both Tolerances
// ============================================================================

describe('compareQuantities - absolute and relative tolerance', () => {
	test('should match if either tolerance is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.1, relative: 0.001 };
		const result = compareQuantities('5.05\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should match if only absolute is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.2, relative: 0.001 };
		const result = compareQuantities('5.1\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should match if only relative is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.001, relative: 0.02 };
		const result = compareQuantities('5.1\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should not match if neither is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.01, relative: 0.001 };
		const result = compareQuantities('5.2\\unit{m}', '5\\unit{m}', tolerance);
		expect(isComparisonEqual(result)).toBe(false);
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases - zero values', () => {
	test('should handle zero in comparison', () => {
		const result = compareQuantities('0\\unit{m}', '0\\unit{m}');
		expect(isComparisonEqual(result)).toBe(true);
		expect(result.userValue).toBe(0);
	});

	test('should evaluate zero quantity value', () => {
		expect(evaluateQuantityValue('0')).toBe(0);
	});
});

describe('Edge cases - negative values', () => {
	test('should handle negative in comparison', () => {
		const result = compareQuantities('-5\\unit{m}', '-5\\unit{m}');
		expect(isComparisonEqual(result)).toBe(true);
		expect(result.userValue).toBe(-5);
	});

	test('should evaluate negative with unit conversion', () => {
		const result = compareQuantities('-5\\unit{km}', '-5000\\unit{m}');
		expect(isComparisonEqual(result)).toBe(true);
	});
});

describe('Edge cases - very large/small values', () => {
	test('should handle very large values', () => {
		expect(evaluateQuantityValue('999999999')).toBe(999999999);
	});

	test('should handle very small values', () => {
		expect(evaluateQuantityValue('0.000000001')).toBeCloseTo(0.000000001);
	});

	test('should handle very large quantities', () => {
		const result = compareQuantities('999999\\unit{m}', '999.999\\unit{km}');
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should handle scientific notation for small values', () => {
		expect(evaluateQuantityValue('1\\times 10^{-9}')).toBe(0.000000001);
	});
});

describe('Edge cases - dimensionless units', () => {
	test('should handle dimensionless quantities in comparison', () => {
		const result = compareQuantities('5', '5');
		expect(isComparisonEqual(result)).toBe(true);
		expect(result.userUnit).toBeNull();
		expect(result.expectedUnit).toBeNull();
	});
});
