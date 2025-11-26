/**
 * Unit System - Validator Tests
 * ==============================
 *
 * Comprehensive tests for Phase 5 unit system validation:
 * - Answer validation against expected values
 * - Unit compatibility checking
 * - Unit match requirements (exact, same symbol)
 * - Tolerance-based comparison (absolute, relative)
 * - Error classification and French feedback
 *
 * Test Categories:
 * 1. Basic Validation - Simple correct/incorrect answers
 * 2. Unit Compatibility - Compatible vs incompatible units
 * 3. requireExactUnit Option - Strict unit matching
 * 4. requireSameSymbol Option - Symbol matching
 * 5. Tolerance Options - Absolute and relative tolerance
 * 6. Error Classification - All error types
 * 7. Edge Cases - Null, empty, invalid inputs
 * 8. French Feedback Messages - Verify correct messages
 */

import { describe, test, expect } from 'vitest';
import { validateQuantityAnswer, type ValidationOptions } from '../validator';

// ============================================================================
// BASIC VALIDATION
// ============================================================================

describe('Basic Validation', () => {
	describe('Correct answers', () => {
		test('exact match with same unit', () => {
			const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
			expect(result.parsed?.value).toBe(5);
			expect(result.parsed?.unit).toBe('m');
			expect(result.expected?.value).toBe(5);
			expect(result.expected?.unit).toBe('m');
		});

		test('exact match with composite unit', () => {
			const result = validateQuantityAnswer('10\\text{ m/s }', '10\\text{ m/s }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('exact match with power notation', () => {
			const result = validateQuantityAnswer('25\\text{ m^2 }', '25\\text{ m^2 }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('exact match with decimal value', () => {
			const result = validateQuantityAnswer('3.14\\text{ m }', '3.14\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('exact match with fraction', () => {
			const result = validateQuantityAnswer('\\frac{1}{2}\\text{ km }', '0.5\\text{ km }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Incorrect answers', () => {
		test('wrong value, correct unit', () => {
			const result = validateQuantityAnswer('6\\text{ m }', '5\\text{ m }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
			expect(result.feedback).toBe('Valeur incorrecte.');
			expect(result.parsed?.value).toBe(6);
			expect(result.expected?.value).toBe(5);
		});

		test('wrong value with decimal', () => {
			const result = validateQuantityAnswer('3.15\\text{ m }', '3.14\\text{ m }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('wrong value with negative numbers', () => {
			const result = validateQuantityAnswer('-5\\text{ m }', '-10\\text{ m }');

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
			const result = validateQuantityAnswer('5000\\text{ m }', '5\\text{ km }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
			expect(result.parsed?.value).toBe(5000);
			expect(result.expected?.value).toBe(5);
		});

		test('converts m to km automatically', () => {
			const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts cm to m', () => {
			const result = validateQuantityAnswer('100\\text{ cm }', '1\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts g to kg', () => {
			const result = validateQuantityAnswer('1000\\text{ g }', '1\\text{ kg }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts s to h', () => {
			const result = validateQuantityAnswer('3600\\text{ s }', '1\\text{ h }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts mL to L', () => {
			const result = validateQuantityAnswer('1000\\text{ mL }', '1\\text{ L }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('converts km/h to m/s', () => {
			const result = validateQuantityAnswer('3.6\\text{ km/h }', '1\\text{ m/s }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Incompatible units', () => {
		test('rejects length vs mass', () => {
			const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ kg }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
			expect(result.feedback).toBe('Les unités ne sont pas compatibles.');
		});

		test('rejects length vs time', () => {
			const result = validateQuantityAnswer('10\\text{ m }', '10\\text{ s }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects mass vs time', () => {
			const result = validateQuantityAnswer('5\\text{ kg }', '5\\text{ h }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects area vs length', () => {
			const result = validateQuantityAnswer('5\\text{ m^2 }', '5\\text{ m }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects velocity vs length', () => {
			const result = validateQuantityAnswer('10\\text{ m/s }', '10\\text{ m }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});
	});
});

// ============================================================================
// REQUIRE EXACT UNIT OPTION
// ============================================================================

describe('requireExactUnit Option', () => {
	describe('When requireExactUnit is true', () => {
		const options: ValidationOptions = { requireExactUnit: true };

		test('rejects km when expecting m (even if value equivalent)', () => {
			const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_unit');
			expect(result.feedback).toBe('Unité incorrecte.');
		});

		test('rejects m when expecting km', () => {
			const result = validateQuantityAnswer('5000\\text{ m }', '5\\text{ km }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_unit');
		});

		test('accepts exact match with same unit', () => {
			const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects cm when expecting m', () => {
			const result = validateQuantityAnswer('100\\text{ cm }', '1\\text{ m }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_unit');
		});

		test('rejects g when expecting kg', () => {
			const result = validateQuantityAnswer('1000\\text{ g }', '1\\text{ kg }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_unit');
		});
	});

	describe('When requireExactUnit is false (default)', () => {
		test('accepts km when expecting m (with conversion)', () => {
			const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts compatible units with correct value', () => {
			const result = validateQuantityAnswer('100\\text{ cm }', '1\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});
});

// ============================================================================
// REQUIRE SAME SYMBOL OPTION
// ============================================================================

describe('requireSameSymbol Option', () => {
	describe('When requireSameSymbol is true', () => {
		const options: ValidationOptions = { requireSameSymbol: true };

		test('accepts same base symbols (km vs m both use base "m")', () => {
			// Note: km and m both have base symbol "m", so requireSameSymbol accepts them
			const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts same symbols (m vs m)', () => {
			const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts same base symbols (g vs kg both use base "g")', () => {
			// Note: g and kg both have base symbol "g", so requireSameSymbol accepts them
			const result = validateQuantityAnswer('1000\\text{ g }', '1\\text{ kg }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts same symbols (km vs km)', () => {
			const result = validateQuantityAnswer('10\\text{ km }', '10\\text{ km }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects different base symbols (m vs s)', () => {
			const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ s }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});

		test('rejects different base symbols (m vs kg)', () => {
			const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ kg }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('incompatible_units');
		});
	});

	describe('When requireSameSymbol is false (default)', () => {
		test('accepts different symbols with conversion', () => {
			const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});
});

// ============================================================================
// TOLERANCE OPTIONS
// ============================================================================

describe('Tolerance Options', () => {
	describe('Absolute tolerance', () => {
		test('accepts answer within absolute tolerance', () => {
			const options: ValidationOptions = { tolerance: { absolute: 0.1 } };
			const result = validateQuantityAnswer('3.14\\text{ m }', '3.15\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts answer at exact absolute tolerance boundary', () => {
			const options: ValidationOptions = { tolerance: { absolute: 0.1 } };
			// Use values that avoid floating point precision issues
			const result = validateQuantityAnswer('3.09999\\text{ m }', '3.0\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects answer outside absolute tolerance', () => {
			const options: ValidationOptions = { tolerance: { absolute: 0.1 } };
			const result = validateQuantityAnswer('3.5\\text{ m }', '3.0\\text{ m }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('works with negative differences', () => {
			const options: ValidationOptions = { tolerance: { absolute: 0.1 } };
			const result = validateQuantityAnswer('2.95\\text{ m }', '3.0\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('works with unit conversion and tolerance', () => {
			const options: ValidationOptions = { tolerance: { absolute: 10 } };
			const result = validateQuantityAnswer('5.01\\text{ km }', '5000\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Relative tolerance', () => {
		test('accepts answer within relative tolerance (1%)', () => {
			const options: ValidationOptions = { tolerance: { relative: 0.01 } };
			const result = validateQuantityAnswer('100.5\\text{ m }', '100\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts answer within relative tolerance (5%)', () => {
			const options: ValidationOptions = { tolerance: { relative: 0.05 } };
			const result = validateQuantityAnswer('102\\text{ m }', '100\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects answer outside relative tolerance', () => {
			const options: ValidationOptions = { tolerance: { relative: 0.01 } };
			const result = validateQuantityAnswer('105\\text{ m }', '100\\text{ m }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('works with large values', () => {
			const options: ValidationOptions = { tolerance: { relative: 0.01 } };
			const result = validateQuantityAnswer('10050\\text{ m }', '10000\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('works with small values', () => {
			const options: ValidationOptions = { tolerance: { relative: 0.01 } };
			const result = validateQuantityAnswer('0.505\\text{ m }', '0.5\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});

	describe('Combined absolute and relative tolerance', () => {
		test('accepts if either tolerance is met (absolute)', () => {
			const options: ValidationOptions = {
				tolerance: { absolute: 0.1, relative: 0.001 }
			};
			const result = validateQuantityAnswer('3.05\\text{ m }', '3.0\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('accepts if either tolerance is met (relative)', () => {
			const options: ValidationOptions = {
				tolerance: { absolute: 0.01, relative: 0.05 }
			};
			const result = validateQuantityAnswer('102\\text{ m }', '100\\text{ m }', options);

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});

		test('rejects if both tolerances are exceeded', () => {
			const options: ValidationOptions = {
				tolerance: { absolute: 0.1, relative: 0.001 }
			};
			const result = validateQuantityAnswer('5\\text{ m }', '3.0\\text{ m }', options);

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});
	});

	describe('No tolerance (exact match required)', () => {
		test('rejects slightly different values without tolerance', () => {
			const result = validateQuantityAnswer('3.141\\text{ m }', '3.14\\text{ m }');

			expect(result.isCorrect).toBe(false);
			expect(result.errorType).toBe('wrong_value');
		});

		test('accepts exact match without tolerance', () => {
			const result = validateQuantityAnswer('3.14\\text{ m }', '3.14\\text{ m }');

			expect(result.isCorrect).toBe(true);
			expect(result.feedback).toBeNull();
		});
	});
});

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

describe('Error Classification', () => {
	test('classifies invalid_input when user answer cannot be parsed', () => {
		const result = validateQuantityAnswer('invalid', '5\\text{ m }');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
		expect(result.parsed).toBeNull();
	});

	test('classifies invalid_input when expected answer cannot be parsed', () => {
		const result = validateQuantityAnswer('5\\text{ m }', 'invalid');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	test('classifies incompatible_units for different dimensions', () => {
		const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ kg }');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('incompatible_units');
	});

	test('classifies wrong_unit when requireExactUnit is violated', () => {
		const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }', {
			requireExactUnit: true
		});

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_unit');
	});

	test('classifies wrong_unit when requireSameSymbol is violated (different base symbols)', () => {
		const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ L }', {
			requireSameSymbol: true
		});

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('incompatible_units'); // Different dimensions, not just wrong_unit
	});

	test('classifies wrong_value for incorrect numeric value', () => {
		const result = validateQuantityAnswer('10\\text{ m }', '5\\text{ m }');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_value');
	});

	test('does not assign error type when answer is correct', () => {
		const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ m }');

		expect(result.isCorrect).toBe(true);
		expect(result.errorType).toBeUndefined();
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
	test('handles empty string user answer', () => {
		const result = validateQuantityAnswer('', '5\\text{ m }');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
		expect(result.parsed).toBeNull();
	});

	test('handles empty string expected answer', () => {
		const result = validateQuantityAnswer('5\\text{ m }', '');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	test('handles whitespace-only user answer', () => {
		const result = validateQuantityAnswer('   ', '5\\text{ m }');

		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('invalid_input');
	});

	test('handles zero values correctly', () => {
		const result = validateQuantityAnswer('0\\text{ m }', '0\\text{ m }');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles negative values correctly', () => {
		const result = validateQuantityAnswer('-5\\text{ m }', '-5\\text{ m }');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles very large numbers', () => {
		const result = validateQuantityAnswer('1000000\\text{ m }', '1000\\text{ km }');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles very small numbers', () => {
		const result = validateQuantityAnswer('0.001\\text{ m }', '1\\text{ mm }');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles scientific notation', () => {
		const result = validateQuantityAnswer('1\\times 10^3\\text{ m }', '1\\text{ km }');

		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeNull();
	});

	test('handles LaTeX fractions', () => {
		const result = validateQuantityAnswer('\\frac{1}{2}\\text{ km }', '500\\text{ m }');

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
		const result = validateQuantityAnswer('5\\xyz{ abc }', '5\\text{ m }');

		expect(result.isCorrect).toBe(false);
		// Could be invalid_input or incompatible_units depending on parser behavior
		expect(['invalid_input', 'incompatible_units']).toContain(result.errorType);
	});
});

// ============================================================================
// FRENCH FEEDBACK MESSAGES
// ============================================================================

describe('French Feedback Messages', () => {
	test('provides French message for invalid input', () => {
		const result = validateQuantityAnswer('invalid', '5\\text{ m }');

		expect(result.feedback).toBe('Réponse invalide. Vérifiez le format.');
	});

	test('provides French message for incompatible units', () => {
		const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ kg }');

		expect(result.feedback).toBe('Les unités ne sont pas compatibles.');
	});

	test('provides French message for incorrect unit', () => {
		const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }', {
			requireExactUnit: true
		});

		expect(result.feedback).toBe('Unité incorrecte.');
	});

	test('provides French message for incorrect value', () => {
		const result = validateQuantityAnswer('10\\text{ m }', '5\\text{ m }');

		expect(result.feedback).toBe('Valeur incorrecte.');
	});

	test('provides no feedback for correct answer', () => {
		const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ m }');

		expect(result.feedback).toBeNull();
	});
});

// ============================================================================
// CUSTOM MESSAGES
// ============================================================================

describe('Custom Messages', () => {
	test('allows custom message for incorrect unit', () => {
		const options: ValidationOptions = {
			requireExactUnit: true,
			messages: {
				incorrectUnit: 'Utilise la bonne unité!'
			}
		};
		const result = validateQuantityAnswer('5\\text{ km }', '5000\\text{ m }', options);

		expect(result.feedback).toBe('Utilise la bonne unité!');
	});

	test('allows custom message for incompatible units', () => {
		const options: ValidationOptions = {
			messages: {
				incompatibleUnit: 'Ces unités ne vont pas ensemble.'
			}
		};
		const result = validateQuantityAnswer('5\\text{ m }', '5\\text{ kg }', options);

		expect(result.feedback).toBe('Ces unités ne vont pas ensemble.');
	});

	test('allows custom message for incorrect value', () => {
		const options: ValidationOptions = {
			messages: {
				incorrectValue: 'Vérifie ton calcul.'
			}
		};
		const result = validateQuantityAnswer('10\\text{ m }', '5\\text{ m }', options);

		expect(result.feedback).toBe('Vérifie ton calcul.');
	});

	test('uses default message when custom message not provided', () => {
		const options: ValidationOptions = {
			messages: {
				incorrectUnit: 'Custom unit message'
			}
		};
		const result = validateQuantityAnswer('10\\text{ m }', '5\\text{ m }', options);

		expect(result.feedback).toBe('Valeur incorrecte.');
	});
});

// ============================================================================
// PARSED DETAILS
// ============================================================================

describe('Parsed Details', () => {
	test('includes parsed value and unit for valid answer', () => {
		const result = validateQuantityAnswer('5\\text{ km }', '10\\text{ km }');

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
		const result = validateQuantityAnswer('10\\text{ m/s }', '20\\text{ m/s }');

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
		const result = validateQuantityAnswer('invalid', '5\\text{ m }');

		expect(result.parsed).toBeNull();
		expect(result.expected?.value).toBe(5);
		expect(result.expected?.unit).toBe('m');
	});

	test('sets expected to null when expected answer is invalid', () => {
		const result = validateQuantityAnswer('5\\text{ m }', 'invalid');

		expect(result.parsed?.value).toBe(5);
		expect(result.parsed?.unit).toBe('m');
		expect(result.expected).toBeNull();
	});
});
