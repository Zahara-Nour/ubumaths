/**
 * Unit System - Validator Tests
 * ==============================
 *
 * Tests for validateQuantityAnswer with signature:
 * (userAnswer, expectedAnswer, precision?, requiredUnit?)
 *
 * Test Categories:
 * 1. Basic Validation - Simple correct/incorrect answers
 * 2. Unit Compatibility - Compatible vs incompatible units
 * 3. checkUnit Constraint Validator - Strict unit matching (via constraint system)
 * 4. requiredUnit - Exact unit enforcement
 * 5. Precision (PrecisionType) - Tolerance-based comparison
 * 6. Error Classification - All error types
 * 7. Edge Cases - Null, empty, invalid inputs
 * 8. French Feedback Messages - Verify correct messages
 */

import { describe, test, expect } from 'vitest';
import { validateQuantityAnswer } from '../validator';
import type { PrecisionType } from '$lib/questions/types';
import { checkUnit } from '../../constraint-validators';

// ============================================================================
// BASIC VALIDATION
// ============================================================================

describe('Basic Validation', () => {
	describe('Correct answers', () => {
		test('exact match with same unit', () => {
			const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{m}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
			expect(result.parsed?.value).toBe(5);
			expect(result.parsed?.unit).toBe('m');
			expect(result.expected?.value).toBe(5);
			expect(result.expected?.unit).toBe('m');
		});

		test('exact match with composite unit', () => {
			const result = validateQuantityAnswer('10\\unit{m/s}', '10\\unit{m/s}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('exact match with power notation', () => {
			const result = validateQuantityAnswer('25\\unit{m^2}', '25\\unit{m^2}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('exact match with decimal value', () => {
			const result = validateQuantityAnswer('3.14\\unit{m}', '3.14\\unit{m}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('exact match with fraction', () => {
			const result = validateQuantityAnswer('\\frac{1}{2}\\unit{km}', '0.5\\unit{km}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Incorrect answers', () => {
		test('wrong value, correct unit', () => {
			const result = validateQuantityAnswer('6\\unit{m}', '5\\unit{m}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
			expect(result.feedback).toBe('Valeur incorrecte.');
			expect(result.parsed?.value).toBe(6);
			expect(result.expected?.value).toBe(5);
		});

		test('wrong value with decimal', () => {
			const result = validateQuantityAnswer('3.15\\unit{m}', '3.14\\unit{m}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('wrong value with negative numbers', () => {
			const result = validateQuantityAnswer('-5\\unit{m}', '-10\\unit{m}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});
	});
});

// ============================================================================
// UNIT COMPATIBILITY
// ============================================================================

describe('Unit Compatibility', () => {
	describe('Compatible units (default behavior)', () => {
		test('converts km to m automatically', () => {
			const result = validateQuantityAnswer('5000\\unit{m}', '5\\unit{km}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
			expect(result.parsed?.value).toBe(5000);
			expect(result.expected?.value).toBe(5);
		});

		test('converts m to km automatically', () => {
			const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts cm to m', () => {
			const result = validateQuantityAnswer('100\\unit{cm}', '1\\unit{m}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts g to kg', () => {
			const result = validateQuantityAnswer('1000\\unit{g}', '1\\unit{kg}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts s to h', () => {
			const result = validateQuantityAnswer('3600\\unit{s}', '1\\unit{h}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts mL to L', () => {
			const result = validateQuantityAnswer('1000\\unit{mL}', '1\\unit{L}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts km/h to m/s', () => {
			const result = validateQuantityAnswer('3.6\\unit{km/h}', '1\\unit{m/s}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Incompatible units', () => {
		test('rejects length vs mass', () => {
			const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{kg}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
			expect(result.feedback).toBe('Les unités ne sont pas compatibles.');
		});

		test('rejects length vs time', () => {
			const result = validateQuantityAnswer('10\\unit{m}', '10\\unit{s}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects mass vs time', () => {
			const result = validateQuantityAnswer('5\\unit{kg}', '5\\unit{h}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects area vs length', () => {
			const result = validateQuantityAnswer('5\\unit{m^2}', '5\\unit{m}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects velocity vs length', () => {
			const result = validateQuantityAnswer('10\\unit{m/s}', '10\\unit{m}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});
	});
});

// ============================================================================
// UNIT CONSTRAINT VALIDATOR (checkUnit)
// ============================================================================

describe('checkUnit Constraint Validator', () => {
	test('flags violation when units differ (km vs m)', () => {
		const violations = checkUnit(['5\\unit{km}'], ['5000\\unit{m}']);
		expect(violations).toEqual([0]);
	});

	test('flags violation when units differ (m vs km)', () => {
		const violations = checkUnit(['5000\\unit{m}'], ['5\\unit{km}']);
		expect(violations).toEqual([0]);
	});

	test('no violation when units match exactly', () => {
		const violations = checkUnit(['5\\unit{m}'], ['5\\unit{m}']);
		expect(violations).toEqual([]);
	});

	test('flags violation for cm vs m', () => {
		const violations = checkUnit(['100\\unit{cm}'], ['1\\unit{m}']);
		expect(violations).toEqual([0]);
	});

	test('flags violation for g vs kg', () => {
		const violations = checkUnit(['1000\\unit{g}'], ['1\\unit{kg}']);
		expect(violations).toEqual([0]);
	});

	test('skips non-unit answers (no violations)', () => {
		const violations = checkUnit(['42'], ['42']);
		expect(violations).toEqual([]);
	});

	test('handles multiple answers with mixed violations', () => {
		const violations = checkUnit(['5\\unit{km}', '10\\unit{m}'], ['5000\\unit{m}', '10\\unit{m}']);
		expect(violations).toEqual([0]);
	});
});

describe('validateQuantityAnswer accepts compatible units by default', () => {
	test('accepts km when expecting m (with conversion)', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('accepts compatible units with correct value', () => {
		const result = validateQuantityAnswer('100\\unit{cm}', '1\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});
});

// ============================================================================
// REQUIRED UNIT
// ============================================================================

describe('requiredUnit', () => {
	test('accepts when user uses exact required unit', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{m}', undefined, 'm');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('accepts matching unit with same prefix (km vs km)', () => {
		const result = validateQuantityAnswer('10\\unit{km}', '10\\unit{km}', undefined, 'km');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('rejects km when required is m', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}', undefined, 'm');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_unit');
	});

	test('rejects m when required is km', () => {
		const result = validateQuantityAnswer('5000\\unit{m}', '5\\unit{km}', undefined, 'km');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_unit');
	});

	test('rejects g when required is kg', () => {
		const result = validateQuantityAnswer('1000\\unit{g}', '1\\unit{kg}', undefined, 'kg');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_unit');
	});

	test('rejects incompatible units regardless of requiredUnit', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{kg}', undefined, 'kg');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('incompatible_units');
	});

	test('without requiredUnit, accepts any compatible unit', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});
});

// ============================================================================
// PRECISION (PrecisionType)
// ============================================================================

describe('Precision (PrecisionType)', () => {
	describe('Absolute tolerance', () => {
		const precision: PrecisionType = { type: 'tolerance', tolerance: 0.1, mode: 'absolute' };

		test('accepts answer within absolute tolerance', () => {
			const result = validateQuantityAnswer('3.14\\unit{m}', '3.15\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts answer at tolerance boundary', () => {
			const result = validateQuantityAnswer('3.09999\\unit{m}', '3.0\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects answer outside absolute tolerance', () => {
			const result = validateQuantityAnswer('3.5\\unit{m}', '3.0\\unit{m}', precision);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('works with negative differences', () => {
			const result = validateQuantityAnswer('2.95\\unit{m}', '3.0\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('works with unit conversion and tolerance', () => {
			const largeTolerance: PrecisionType = {
				type: 'tolerance',
				tolerance: 10,
				mode: 'absolute'
			};
			const result = validateQuantityAnswer('5.01\\unit{km}', '5000\\unit{m}', largeTolerance);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Relative tolerance', () => {
		test('accepts answer within relative tolerance (1%)', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.01, mode: 'relative' };
			const result = validateQuantityAnswer('100.5\\unit{m}', '100\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts answer within relative tolerance (5%)', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.05, mode: 'relative' };
			const result = validateQuantityAnswer('102\\unit{m}', '100\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects answer outside relative tolerance', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.01, mode: 'relative' };
			const result = validateQuantityAnswer('105\\unit{m}', '100\\unit{m}', precision);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('works with large values', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.01, mode: 'relative' };
			const result = validateQuantityAnswer('10050\\unit{m}', '10000\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('works with small values', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.01, mode: 'relative' };
			const result = validateQuantityAnswer('0.505\\unit{m}', '0.5\\unit{m}', precision);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('No precision (exact match)', () => {
		test('rejects slightly different values', () => {
			const result = validateQuantityAnswer('3.141\\unit{m}', '3.14\\unit{m}');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('accepts exact match', () => {
			const result = validateQuantityAnswer('3.14\\unit{m}', '3.14\\unit{m}');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Precision type: none', () => {
		test('behaves like exact match', () => {
			const precision: PrecisionType = { type: 'none' };
			const result = validateQuantityAnswer('3.141\\unit{m}', '3.14\\unit{m}', precision);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});
	});
});

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

describe('Error Classification', () => {
	test('classifies invalid_input when user answer cannot be parsed', () => {
		const result = validateQuantityAnswer('invalid', '5\\unit{m}');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
		expect(result.parsed).toBeNull();
	});

	test('classifies invalid_input when expected answer cannot be parsed', () => {
		const result = validateQuantityAnswer('5\\unit{m}', 'invalid');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	test('classifies incompatible_units for different dimensions', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{kg}');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('incompatible_units');
	});

	test('classifies wrong_unit when requiredUnit is violated', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}', undefined, 'm');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_unit');
	});

	test('classifies wrong_value for incorrect numeric value', () => {
		const result = validateQuantityAnswer('10\\unit{m}', '5\\unit{m}');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_value');
	});

	test('does not assign error type when answer is correct', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.errorType).toBeUndefined();
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
	test('handles empty string user answer', () => {
		const result = validateQuantityAnswer('', '5\\unit{m}');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
		expect(result.parsed).toBeNull();
	});

	test('handles empty string expected answer', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	test('handles whitespace-only user answer', () => {
		const result = validateQuantityAnswer('   ', '5\\unit{m}');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	test('handles zero values correctly', () => {
		const result = validateQuantityAnswer('0\\unit{m}', '0\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles negative values correctly', () => {
		const result = validateQuantityAnswer('-5\\unit{m}', '-5\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles very large numbers', () => {
		const result = validateQuantityAnswer('1000000\\unit{m}', '1000\\unit{km}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles very small numbers', () => {
		const result = validateQuantityAnswer('0.001\\unit{m}', '1\\unit{mm}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles scientific notation', () => {
		const result = validateQuantityAnswer('1\\times 10^3\\unit{m}', '1\\unit{km}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles LaTeX fractions', () => {
		const result = validateQuantityAnswer('\\frac{1}{2}\\unit{km}', '500\\unit{m}');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles dimensionless quantities (no unit)', () => {
		const result = validateQuantityAnswer('5', '5');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
		expect(result.parsed?.unit).toBeNull();
		expect(result.expected?.unit).toBeNull();
	});

	test('handles malformed LaTeX gracefully', () => {
		const result = validateQuantityAnswer('5\\xyz{ abc}', '5\\unit{m}');

		expect(result.isCorrect).toBe(false);
		expect(['invalid_input', 'incompatible_units']).toContain(result.errorType);
	});
});

// ============================================================================
// FRENCH FEEDBACK MESSAGES
// ============================================================================

describe('French Feedback Messages', () => {
	test('provides French message for invalid input', () => {
		const result = validateQuantityAnswer('invalid', '5\\unit{m}');

		expect(result.feedback).toBe('Réponse invalide. Vérifiez le format.');
	});

	test('provides French message for incompatible units', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{kg}');

		expect(result.feedback).toBe('Les unités ne sont pas compatibles.');
	});

	test('provides French message for incorrect value', () => {
		const result = validateQuantityAnswer('10\\unit{m}', '5\\unit{m}');

		expect(result.feedback).toBe('Valeur incorrecte.');
	});

	test('provides French message for wrong unit (requiredUnit)', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}', undefined, 'm');

		expect(result.feedback).toBe('Unité incorrecte.');
	});

	test('provides no feedback for correct answer', () => {
		const result = validateQuantityAnswer('5\\unit{m}', '5\\unit{m}');

		expect(result.feedback).toBeNull();
	});
});

// ============================================================================
// PARSED DETAILS
// ============================================================================

describe('Parsed Details', () => {
	test('includes parsed value and unit for valid answer', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '10\\unit{km}');

		expect(result.parsed).toEqual({
			value: 5,
			unit: 'm'
		});
		expect(result.expected).toEqual({
			value: 10,
			unit: 'm'
		});
	});

	test('includes parsed value and unit for composite units', () => {
		const result = validateQuantityAnswer('10\\unit{m/s}', '20\\unit{m/s}');

		expect(result.parsed?.value).toBe(10);
		expect(result.parsed?.unit).toBe('m·s^-1');
		expect(result.expected?.value).toBe(20);
		expect(result.expected?.unit).toBe('m·s^-1');
	});

	test('includes null for dimensionless quantities', () => {
		const result = validateQuantityAnswer('5', '10');

		expect(result.parsed?.value).toBe(5);
		expect(result.parsed?.unit).toBeNull();
		expect(result.expected?.value).toBe(10);
		expect(result.expected?.unit).toBeNull();
	});

	test('sets parsed to null when user answer is invalid', () => {
		const result = validateQuantityAnswer('invalid', '5\\unit{m}');

		expect(result.parsed).toBeNull();
		expect(result.expected?.value).toBe(5);
		expect(result.expected?.unit).toBe('m');
	});

	test('sets expected to null when expected answer is invalid', () => {
		const result = validateQuantityAnswer('5\\unit{m}', 'invalid');

		expect(result.parsed?.value).toBe(5);
		expect(result.parsed?.unit).toBe('m');
		expect(result.expected).toBeNull();
	});
});
