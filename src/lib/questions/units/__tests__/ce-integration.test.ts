/**
 * Unit System - ComputeEngine Integration Tests
 * =============================================
 *
 * Comprehensive tests for the CE integration layer that evaluates and compares quantities.
 *
 * Test Categories:
 * 1. evaluateQuantityValue - Numeric value evaluation
 * 2. compareQuantities - Quantity comparison with unit conversion
 * 3. convertQuantity - Unit conversion operations
 * 4. normalizeToBaseUnits - Normalization to SI base units
 * 5. Utility functions - isValidQuantity, getUnitFromQuantity, getValueFromQuantity
 * 6. Edge cases - Zero, negative, very large/small values, missing units
 */

import { describe, test, expect } from 'vitest';
import {
	evaluateQuantityValue,
	compareQuantities,
	convertQuantity,
	normalizeToBaseUnits,
	isValidQuantity,
	getUnitFromQuantity,
	getValueFromQuantity,
	type ComparisonResult,
	type Tolerance
} from '../ce-integration';

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

// ============================================================================
// evaluateQuantityValue - Basic Numeric Evaluation
// ============================================================================

describe('evaluateQuantityValue', () => {
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
			// CE needs braces for negative exponents
			expect(evaluateQuantityValue('2^{-1}')).toBe(0.5);
		});

		test('should evaluate square', () => {
			expect(evaluateQuantityValue('5^2')).toBe(25);
		});

		test('should evaluate fractional exponent', () => {
			// Using braces for proper LaTeX
			expect(evaluateQuantityValue('9^{0.5}')).toBe(3);
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
			// CE needs braces for negative exponents
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
			// Note: '3+' might be interpreted as just '3' by CE
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
			const result = compareQuantities('5\\text{ m }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(5);
			expect(result.expectedValue).toBe(5);
			expect(result.userUnit).toBe('m');
			expect(result.expectedUnit).toBe('m');
		});

		test('should match with multiple spaces', () => {
			const result = compareQuantities('5\\text{  m  }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should match different numeric formats', () => {
			const result = compareQuantities('5.0\\text{ m }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Different values, same unit', () => {
		test('should not match different values', () => {
			const result = compareQuantities('5\\text{ m }', '6\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(result.userValue).toBe(5);
			expect(result.expectedValue).toBe(6);
		});

		test('should not match off by one', () => {
			const result = compareQuantities('4\\text{ m }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
		});
	});

	describe('Unit conversion', () => {
		test('should convert km to m', () => {
			const result = compareQuantities('1\\text{ km }', '1000\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(1);
			expect(result.expectedValue).toBe(1000);
		});

		test('should convert m to km', () => {
			const result = compareQuantities('1000\\text{ m }', '1\\text{ km }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert cm to m', () => {
			const result = compareQuantities('50\\text{ cm }', '0.5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert mm to m', () => {
			const result = compareQuantities('1500\\text{ mm }', '1.5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert kg to g', () => {
			const result = compareQuantities('2\\text{ kg }', '2000\\text{ g }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert hours to minutes', () => {
			const result = compareQuantities('2\\text{ h }', '120\\text{ min }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert hours to seconds', () => {
			const result = compareQuantities('1\\text{ h }', '3600\\text{ s }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert minutes to seconds', () => {
			const result = compareQuantities('5\\text{ min }', '300\\text{ s }');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Composite unit conversion', () => {
		test('should convert km/h to m/s', () => {
			const result = compareQuantities('90\\text{ km/h }', '25\\text{ m/s }');
			expect(isComparisonEqual(result)).toBe(true);
		});

		test('should convert m/s to km/h', () => {
			const result = compareQuantities('10\\text{ m/s }', '36\\text{ km/h }');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Incompatible units', () => {
		test('should fail for meters vs seconds', () => {
			const result = compareQuantities('5\\text{ m }', '5\\text{ s }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'incompatible_units')).toBe(true);
		});

		test('should fail for kg vs m', () => {
			const result = compareQuantities('5\\text{ kg }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'incompatible_units')).toBe(true);
		});

		test('should fail for hours vs meters', () => {
			const result = compareQuantities('2\\text{ h }', '2\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'incompatible_units')).toBe(true);
		});
	});

	describe('Expression evaluation in quantities', () => {
		test('should evaluate arithmetic in value', () => {
			const result = compareQuantities('3+2\\text{ m }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(5);
		});

		test('should evaluate fraction in value', () => {
			const result = compareQuantities('\\frac{3}{2}\\text{ m }', '1.5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
			expect(result.userValue).toBe(1.5);
		});

		test('should evaluate scientific notation in value', () => {
			const result = compareQuantities('5\\times 10^2\\text{ m }', '500\\text{ m }');
			expect(isComparisonEqual(result)).toBe(true);
		});
	});

	describe('Invalid input handling', () => {
		test('should return error for invalid user expression', () => {
			const result = compareQuantities('invalid\\text{ m }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'invalid_user_expression')).toBe(true);
			expect(result.userValue).toBeNull();
		});

		test('should return error for invalid expected expression', () => {
			const result = compareQuantities('5\\text{ m }', 'invalid\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'invalid_expected_expression')).toBe(true);
			expect(result.expectedValue).toBeNull();
		});

		test('should return error for invalid unit in user answer', () => {
			const result = compareQuantities('5\\text{ xyz }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
		});

		test('should return error for evaluation failure', () => {
			const result = compareQuantities('\\frac{1}{0}\\text{ m }', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(hasComparisonError(result, 'evaluation_failed')).toBe(true);
		});

		test('should handle empty user answer', () => {
			const result = compareQuantities('', '5\\text{ m }');
			expect(isComparisonEqual(result)).toBe(false);
			expect(result.error).toBeDefined();
		});

		test('should handle null values gracefully', () => {
			// @ts-expect-error Testing invalid input
			const result = compareQuantities(null, '5\\text{ m }');
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
		const result = compareQuantities('5.01\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should not match outside absolute tolerance', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('5.2\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(false);
	});

	test('should match exactly at tolerance boundary', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('5.1\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should work with zero expected value', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('0.05\\text{ m }', '0\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should work with negative values', () => {
		const tolerance: Tolerance = { absolute: 0.1 };
		const result = compareQuantities('-5.05\\text{ m }', '-5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should apply tolerance after unit conversion', () => {
		const tolerance: Tolerance = { absolute: 100 };
		const result = compareQuantities('1.05\\text{ km }', '1000\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});
});

// ============================================================================
// compareQuantities - With Relative Tolerance
// ============================================================================

describe('compareQuantities - relative tolerance', () => {
	test('should match within relative tolerance', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('5.05\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should not match outside relative tolerance', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('5.1\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(false);
	});

	test('should match exactly at tolerance boundary', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('5.05\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should use relative tolerance for large values', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('1010\\text{ m }', '1000\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should handle relative tolerance with small values', () => {
		const tolerance: Tolerance = { relative: 0.01 }; // 1%
		const result = compareQuantities('0.505\\text{ m }', '0.5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});
});

// ============================================================================
// compareQuantities - With Both Tolerances
// ============================================================================

describe('compareQuantities - absolute and relative tolerance', () => {
	test('should match if either tolerance is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.1, relative: 0.001 };
		const result = compareQuantities('5.05\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should match if only absolute is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.2, relative: 0.001 };
		const result = compareQuantities('5.1\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should match if only relative is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.001, relative: 0.02 };
		const result = compareQuantities('5.1\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(true);
	});

	test('should not match if neither is satisfied', () => {
		const tolerance: Tolerance = { absolute: 0.01, relative: 0.001 };
		const result = compareQuantities('5.2\\text{ m }', '5\\text{ m }', tolerance);
		expect(isComparisonEqual(result)).toBe(false);
	});
});

// ============================================================================
// convertQuantity - Length Conversions
// ============================================================================

describe('convertQuantity - length conversions', () => {
	test('should convert km to m', () => {
		const result = convertQuantity('5\\text{ km }', 'm');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(5000);
		expect(result?.unit.components.get('m')).toBe(1);
	});

	test('should convert m to km', () => {
		const result = convertQuantity('1000\\text{ m }', 'km');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});

	test('should convert cm to m', () => {
		const result = convertQuantity('100\\text{ cm }', 'm');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});

	test('should convert mm to m', () => {
		const result = convertQuantity('1000\\text{ mm }', 'm');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});

	test('should convert m to cm', () => {
		const result = convertQuantity('5\\text{ m }', 'cm');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(500);
	});
});

// ============================================================================
// convertQuantity - Mass Conversions
// ============================================================================

describe('convertQuantity - mass conversions', () => {
	test('should convert kg to g', () => {
		const result = convertQuantity('2\\text{ kg }', 'g');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(2000);
	});

	test('should convert g to kg', () => {
		const result = convertQuantity('1000\\text{ g }', 'kg');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});

	test('should convert mg to g', () => {
		const result = convertQuantity('500\\text{ mg }', 'g');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(0.5);
	});
});

// ============================================================================
// convertQuantity - Time Conversions
// ============================================================================

describe('convertQuantity - time conversions', () => {
	test('should convert hours to minutes', () => {
		const result = convertQuantity('2\\text{ h }', 'min');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(120);
	});

	test('should convert hours to seconds', () => {
		const result = convertQuantity('1\\text{ h }', 's');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(3600);
	});

	test('should convert minutes to seconds', () => {
		const result = convertQuantity('5\\text{ min }', 's');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(300);
	});

	test('should convert seconds to milliseconds', () => {
		const result = convertQuantity('2\\text{ s }', 'ms');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(2000);
	});
});

// ============================================================================
// convertQuantity - Composite Unit Conversions
// ============================================================================

describe('convertQuantity - composite units', () => {
	test('should convert km/h to m/s', () => {
		const result = convertQuantity('90\\text{ km/h }', 'm/s');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(25);
	});

	test('should convert m/s to km/h', () => {
		const result = convertQuantity('10\\text{ m/s }', 'km/h');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(36);
	});
});

// ============================================================================
// convertQuantity - Invalid Conversions
// ============================================================================

describe('convertQuantity - invalid conversions', () => {
	test('should return null for incompatible units', () => {
		const result = convertQuantity('5\\text{ m }', 's');
		expect(result).toBeNull();
	});

	test('should return null for incompatible mass to length', () => {
		const result = convertQuantity('5\\text{ kg }', 'm');
		expect(result).toBeNull();
	});

	test('should return null for invalid target unit', () => {
		const result = convertQuantity('5\\text{ m }', 'xyz');
		expect(result).toBeNull();
	});

	test('should return null for invalid input quantity', () => {
		const result = convertQuantity('invalid\\text{ m }', 'km');
		expect(result).toBeNull();
	});

	test('should return null for empty input', () => {
		const result = convertQuantity('', 'm');
		expect(result).toBeNull();
	});

	test('should return null for unevaluable expression', () => {
		const result = convertQuantity('\\frac{1}{0}\\text{ m }', 'km');
		expect(result).toBeNull();
	});
});

// ============================================================================
// normalizeToBaseUnits - Length Normalization
// ============================================================================

describe('normalizeToBaseUnits - length', () => {
	test('should normalize km to m', () => {
		const result = normalizeToBaseUnits('5\\text{ km }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(5000);
		expect(result?.unit.components.get('m')).toBe(1);
		expect(result?.unit.coefficient).toBe(1);
	});

	test('should normalize cm to m', () => {
		const result = normalizeToBaseUnits('100\\text{ cm }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});

	test('should keep m as m', () => {
		const result = normalizeToBaseUnits('10\\text{ m }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(10);
		expect(result?.unit.components.get('m')).toBe(1);
	});

	test('should normalize mm to m', () => {
		const result = normalizeToBaseUnits('1500\\text{ mm }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1.5);
	});
});

// ============================================================================
// normalizeToBaseUnits - Mass Normalization
// ============================================================================

describe('normalizeToBaseUnits - mass', () => {
	test('should normalize kg to base', () => {
		const result = normalizeToBaseUnits('2\\text{ kg }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(2000);
		expect(result?.unit.coefficient).toBe(1);
	});

	test('should normalize g to base', () => {
		const result = normalizeToBaseUnits('500\\text{ g }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(500);
	});

	test('should normalize mg to g', () => {
		const result = normalizeToBaseUnits('1000\\text{ mg }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});
});

// ============================================================================
// normalizeToBaseUnits - Time Normalization
// ============================================================================

describe('normalizeToBaseUnits - time', () => {
	test('should normalize hours to seconds', () => {
		const result = normalizeToBaseUnits('2\\text{ h }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(7200);
		expect(result?.unit.components.get('s')).toBe(1);
	});

	test('should normalize minutes to seconds', () => {
		const result = normalizeToBaseUnits('5\\text{ min }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(300);
	});

	test('should normalize milliseconds to seconds', () => {
		const result = normalizeToBaseUnits('1000\\text{ ms }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});

	test('should keep s as s', () => {
		const result = normalizeToBaseUnits('60\\text{ s }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(60);
	});
});

// ============================================================================
// normalizeToBaseUnits - Composite Unit Normalization
// ============================================================================

describe('normalizeToBaseUnits - composite units', () => {
	test('should normalize km/h to m/s', () => {
		const result = normalizeToBaseUnits('90\\text{ km/h }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(25);
		expect(result?.unit.components.get('m')).toBe(1);
		expect(result?.unit.components.get('s')).toBe(-1);
	});

	test('should normalize m/min to m/s', () => {
		const result = normalizeToBaseUnits('60\\text{ m/min }');
		expect(result).not.toBeNull();
		expect(result?.value).toBe(1);
	});
});

// ============================================================================
// normalizeToBaseUnits - Invalid Inputs
// ============================================================================

describe('normalizeToBaseUnits - invalid inputs', () => {
	test('should return null for invalid quantity', () => {
		const result = normalizeToBaseUnits('invalid\\text{ m }');
		expect(result).toBeNull();
	});

	test('should return null for unevaluable expression', () => {
		const result = normalizeToBaseUnits('\\frac{1}{0}\\text{ m }');
		expect(result).toBeNull();
	});

	test('should return null for empty input', () => {
		const result = normalizeToBaseUnits('');
		expect(result).toBeNull();
	});

	test('should return null for invalid unit', () => {
		const result = normalizeToBaseUnits('5\\text{ xyz }');
		expect(result).toBeNull();
	});
});

// ============================================================================
// isValidQuantity
// ============================================================================

describe('isValidQuantity', () => {
	test('should return true for valid simple quantity', () => {
		expect(isValidQuantity('5\\text{ m }')).toBe(true);
	});

	test('should return true for valid quantity with expression', () => {
		expect(isValidQuantity('3+2\\text{ km }')).toBe(true);
	});

	test('should return true for valid composite unit', () => {
		expect(isValidQuantity('90\\text{ km/h }')).toBe(true);
	});

	test('should return false for invalid unit', () => {
		expect(isValidQuantity('5\\text{ xyz }')).toBe(false);
	});

	test('should return false for empty string', () => {
		expect(isValidQuantity('')).toBe(false);
	});

	test('should return false for null', () => {
		// @ts-expect-error Testing invalid input
		expect(isValidQuantity(null)).toBe(false);
	});

	test('should return false for undefined', () => {
		// @ts-expect-error Testing invalid input
		expect(isValidQuantity(undefined)).toBe(false);
	});

	test('should return false for invalid expression', () => {
		expect(isValidQuantity('\\frac{1}{0}\\text{ m }')).toBe(false);
	});
});

// ============================================================================
// getUnitFromQuantity
// ============================================================================

describe('getUnitFromQuantity', () => {
	test('should extract unit from simple quantity', () => {
		const unit = getUnitFromQuantity('5\\text{ m }');
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(1);
	});

	test('should extract kilometer unit with coefficient', () => {
		const unit = getUnitFromQuantity('5\\text{ km }');
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(1);
		expect(unit?.coefficient).toBe(1000);
	});

	test('should extract composite unit', () => {
		const unit = getUnitFromQuantity('90\\text{ km/h }');
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(1);
		expect(unit?.components.get('s')).toBe(-1);
	});

	test('should return null for invalid quantity', () => {
		const unit = getUnitFromQuantity('invalid\\text{ xyz }');
		expect(unit).toBeNull();
	});

	test('should return null for empty input', () => {
		const unit = getUnitFromQuantity('');
		expect(unit).toBeNull();
	});
});

// ============================================================================
// getValueFromQuantity
// ============================================================================

describe('getValueFromQuantity', () => {
	test('should extract numeric value from simple quantity', () => {
		expect(getValueFromQuantity('5\\text{ m }')).toBe(5);
	});

	test('should evaluate expression in quantity', () => {
		expect(getValueFromQuantity('3+2\\text{ m }')).toBe(5);
	});

	test('should evaluate fraction in quantity', () => {
		expect(getValueFromQuantity('\\frac{3}{2}\\text{ m }')).toBe(1.5);
	});

	test('should handle decimal values', () => {
		expect(getValueFromQuantity('3.14\\text{ m }')).toBe(3.14);
	});

	test('should handle negative values', () => {
		expect(getValueFromQuantity('-5\\text{ m }')).toBe(-5);
	});

	test('should return null for invalid quantity', () => {
		expect(getValueFromQuantity('invalid\\text{ xyz }')).toBeNull();
	});

	test('should return null for empty input', () => {
		expect(getValueFromQuantity('')).toBeNull();
	});

	test('should return null for unevaluable expression', () => {
		expect(getValueFromQuantity('\\frac{1}{0}\\text{ m }')).toBeNull();
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases - zero values', () => {
	test('should handle zero in comparison', () => {
		const result = compareQuantities('0\\text{ m }', '0\\text{ m }');
		expect(isComparisonEqual(result)).toBe(true);
		expect(result.userValue).toBe(0);
	});

	test('should handle zero conversion', () => {
		const result = convertQuantity('0\\text{ km }', 'm');
		expect(result?.value).toBe(0);
	});

	test('should handle zero normalization', () => {
		const result = normalizeToBaseUnits('0\\text{ km }');
		expect(result?.value).toBe(0);
	});

	test('should evaluate zero quantity value', () => {
		expect(evaluateQuantityValue('0')).toBe(0);
	});

	test('should return true for isValidQuantity with zero', () => {
		expect(isValidQuantity('0\\text{ m }')).toBe(true);
	});
});

describe('Edge cases - negative values', () => {
	test('should handle negative in comparison', () => {
		const result = compareQuantities('-5\\text{ m }', '-5\\text{ m }');
		expect(isComparisonEqual(result)).toBe(true);
		expect(result.userValue).toBe(-5);
	});

	test('should handle negative conversion', () => {
		const result = convertQuantity('-1\\text{ km }', 'm');
		expect(result?.value).toBe(-1000);
	});

	test('should handle negative normalization', () => {
		const result = normalizeToBaseUnits('-5\\text{ km }');
		expect(result?.value).toBe(-5000);
	});

	test('should evaluate negative with unit conversion', () => {
		const result = compareQuantities('-5\\text{ km }', '-5000\\text{ m }');
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
		const result = compareQuantities('999999\\text{ m }', '999.999\\text{ km }');
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

	test('should return null unit for dimensionless from getUnitFromQuantity', () => {
		const unit = getUnitFromQuantity('5');
		expect(unit).not.toBeNull();
		expect(unit?.components.size).toBe(0);
	});
});
