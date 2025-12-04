/**
 * Tests for spreadsheet functions
 *
 * @module spreadsheet/__tests__/functions.test
 */

import { describe, it, expect } from 'vitest';
import {
	executeFunction,
	hasFunction,
	getAvailableFunctions,
	getFunctionCount
} from '../functions';
import type { ComputedValue } from '../types';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a number value
 */
function num(value: number): ComputedValue {
	return { type: 'number', value };
}

/**
 * Create a string value
 */
function str(value: string): ComputedValue {
	return { type: 'string', value };
}

/**
 * Create a boolean value
 */
function bool(value: boolean): ComputedValue {
	return { type: 'boolean', value };
}

/**
 * Create an empty value
 */
function empty(): ComputedValue {
	return { type: 'empty' };
}

/**
 * Assert that a result is a number with a specific value
 */
function expectNumber(result: ComputedValue, expected: number): void {
	expect(result.type).toBe('number');
	if (result.type === 'number') {
		expect(result.value).toBeCloseTo(expected, 10);
	}
}

/**
 * Assert that a result is a boolean with a specific value
 */
function expectBoolean(result: ComputedValue, expected: boolean): void {
	expect(result.type).toBe('boolean');
	if (result.type === 'boolean') {
		expect(result.value).toBe(expected);
	}
}

/**
 * Assert that a result is a string with a specific value
 */
function expectString(result: ComputedValue, expected: string): void {
	expect(result.type).toBe('string');
	if (result.type === 'string') {
		expect(result.value).toBe(expected);
	}
}

/**
 * Assert that a result is an error with a specific code
 */
function expectError(result: ComputedValue, expectedCode: string): void {
	expect(result.type).toBe('error');
	if (result.type === 'error') {
		expect(result.code).toBe(expectedCode);
	}
}

// =============================================================================
// Registry Tests
// =============================================================================

describe('function registry', () => {
	it('hasFunction returns true for known functions', () => {
		expect(hasFunction('SUM')).toBe(true);
		expect(hasFunction('AVERAGE')).toBe(true);
		expect(hasFunction('IF')).toBe(true);
		expect(hasFunction('CONCAT')).toBe(true);
	});

	it('hasFunction returns true for French aliases', () => {
		expect(hasFunction('SOMME')).toBe(true);
		expect(hasFunction('MOYENNE')).toBe(true);
		expect(hasFunction('SI')).toBe(true);
	});

	it('hasFunction is case-insensitive', () => {
		expect(hasFunction('sum')).toBe(true);
		expect(hasFunction('Sum')).toBe(true);
		expect(hasFunction('SUM')).toBe(true);
	});

	it('hasFunction returns false for unknown functions', () => {
		expect(hasFunction('UNKNOWN')).toBe(false);
		expect(hasFunction('NOTAFUNCTION')).toBe(false);
	});

	it('getAvailableFunctions returns sorted list', () => {
		const functions = getAvailableFunctions();
		expect(functions.length).toBeGreaterThan(0);
		expect(functions).toContain('SUM');
		expect(functions).toContain('IF');
		expect(functions).toContain('CONCAT');
		// Check sorted
		const sorted = [...functions].sort();
		expect(functions).toEqual(sorted);
	});

	it('getFunctionCount returns positive number', () => {
		expect(getFunctionCount()).toBeGreaterThan(30);
	});

	it('executeFunction returns error for unknown function', () => {
		expectError(executeFunction('UNKNOWN', []), '#NAME?');
	});
});

// =============================================================================
// Math Function Tests
// =============================================================================

describe('math functions', () => {
	describe('SUM', () => {
		it('adds numbers', () => {
			expectNumber(executeFunction('SUM', [num(1), num(2), num(3)]), 6);
		});

		it('returns 0 for empty args', () => {
			expectNumber(executeFunction('SUM', []), 0);
		});

		it('skips empty values', () => {
			expectNumber(executeFunction('SUM', [num(1), empty(), num(2)]), 3);
		});

		it('converts booleans', () => {
			expectNumber(executeFunction('SUM', [num(1), bool(true), bool(false)]), 2);
		});

		it('propagates errors', () => {
			const err: ComputedValue = { type: 'error', code: '#REF!', message: 'test' };
			expectError(executeFunction('SUM', [num(1), err]), '#REF!');
		});
	});

	describe('AVERAGE', () => {
		it('calculates mean', () => {
			expectNumber(executeFunction('AVERAGE', [num(1), num(2), num(3)]), 2);
			expectNumber(executeFunction('AVERAGE', [num(10), num(20)]), 15);
		});

		it('returns error for empty args', () => {
			expectError(executeFunction('AVERAGE', []), '#VALUE!');
		});

		it('skips empty values in calculation', () => {
			expectNumber(executeFunction('AVERAGE', [num(10), empty(), num(20)]), 15);
		});
	});

	describe('MIN', () => {
		it('finds minimum', () => {
			expectNumber(executeFunction('MIN', [num(5), num(2), num(8)]), 2);
			expectNumber(executeFunction('MIN', [num(-5), num(0), num(5)]), -5);
		});

		it('returns 0 for empty args', () => {
			expectNumber(executeFunction('MIN', []), 0);
		});
	});

	describe('MAX', () => {
		it('finds maximum', () => {
			expectNumber(executeFunction('MAX', [num(5), num(2), num(8)]), 8);
			expectNumber(executeFunction('MAX', [num(-5), num(0), num(5)]), 5);
		});

		it('returns 0 for empty args', () => {
			expectNumber(executeFunction('MAX', []), 0);
		});
	});

	describe('COUNT', () => {
		it('counts numbers', () => {
			expectNumber(executeFunction('COUNT', [num(1), num(2), num(3)]), 3);
		});

		it('skips non-numbers', () => {
			expectNumber(executeFunction('COUNT', [num(1), str('text'), num(2), empty()]), 2);
		});
	});

	describe('COUNTA', () => {
		it('counts non-empty values', () => {
			expectNumber(executeFunction('COUNTA', [num(1), str('text'), bool(true)]), 3);
		});

		it('skips empty values', () => {
			expectNumber(executeFunction('COUNTA', [num(1), empty(), num(2)]), 2);
		});
	});

	describe('ABS', () => {
		it('returns absolute value', () => {
			expectNumber(executeFunction('ABS', [num(-5)]), 5);
			expectNumber(executeFunction('ABS', [num(5)]), 5);
			expectNumber(executeFunction('ABS', [num(0)]), 0);
		});

		it('returns error for wrong arg count', () => {
			expectError(executeFunction('ABS', []), '#VALUE!');
			expectError(executeFunction('ABS', [num(1), num(2)]), '#VALUE!');
		});
	});

	describe('ROUND', () => {
		it('rounds to integer by default', () => {
			expectNumber(executeFunction('ROUND', [num(3.7)]), 4);
			expectNumber(executeFunction('ROUND', [num(3.2)]), 3);
		});

		it('rounds to specified decimals', () => {
			expectNumber(executeFunction('ROUND', [num(3.14159), num(2)]), 3.14);
			expectNumber(executeFunction('ROUND', [num(3.145), num(2)]), 3.15);
		});

		it('handles negative decimals', () => {
			expectNumber(executeFunction('ROUND', [num(1234), num(-2)]), 1200);
		});
	});

	describe('SQRT', () => {
		it('calculates square root', () => {
			expectNumber(executeFunction('SQRT', [num(4)]), 2);
			expectNumber(executeFunction('SQRT', [num(9)]), 3);
			expectNumber(executeFunction('SQRT', [num(2)]), Math.sqrt(2));
		});

		it('returns error for negative numbers', () => {
			expectError(executeFunction('SQRT', [num(-1)]), '#NUM!');
		});
	});

	describe('POWER', () => {
		it('calculates power', () => {
			expectNumber(executeFunction('POWER', [num(2), num(3)]), 8);
			expectNumber(executeFunction('POWER', [num(3), num(2)]), 9);
		});

		it('handles fractional exponents', () => {
			expectNumber(executeFunction('POWER', [num(4), num(0.5)]), 2);
		});

		it('handles negative exponents', () => {
			expectNumber(executeFunction('POWER', [num(2), num(-1)]), 0.5);
		});

		it('returns error for 0^negative', () => {
			expectError(executeFunction('POWER', [num(0), num(-1)]), '#DIV/0!');
		});

		it('returns error for negative base with non-integer exponent', () => {
			expectError(executeFunction('POWER', [num(-2), num(0.5)]), '#NUM!');
		});
	});

	describe('MOD', () => {
		it('calculates modulo', () => {
			expectNumber(executeFunction('MOD', [num(10), num(3)]), 1);
			expectNumber(executeFunction('MOD', [num(10), num(5)]), 0);
		});

		it('returns error for division by zero', () => {
			expectError(executeFunction('MOD', [num(10), num(0)]), '#DIV/0!');
		});

		it('handles negative numbers like Excel', () => {
			// Excel: result has same sign as divisor
			expectNumber(executeFunction('MOD', [num(-10), num(3)]), 2);
			expectNumber(executeFunction('MOD', [num(10), num(-3)]), -2);
		});
	});

	describe('trigonometric functions', () => {
		it('SIN calculates sine', () => {
			expectNumber(executeFunction('SIN', [num(0)]), 0);
			expectNumber(executeFunction('SIN', [num(Math.PI / 2)]), 1);
		});

		it('COS calculates cosine', () => {
			expectNumber(executeFunction('COS', [num(0)]), 1);
			expectNumber(executeFunction('COS', [num(Math.PI)]), -1);
		});

		it('TAN calculates tangent', () => {
			expectNumber(executeFunction('TAN', [num(0)]), 0);
			expectNumber(executeFunction('TAN', [num(Math.PI / 4)]), 1);
		});

		it('ASIN returns error for out of range', () => {
			expectError(executeFunction('ASIN', [num(2)]), '#NUM!');
		});

		it('ACOS returns error for out of range', () => {
			expectError(executeFunction('ACOS', [num(-2)]), '#NUM!');
		});
	});

	describe('logarithmic functions', () => {
		it('LOG calculates log base 10 by default', () => {
			expectNumber(executeFunction('LOG', [num(100)]), 2);
			expectNumber(executeFunction('LOG', [num(1000)]), 3);
		});

		it('LOG calculates log with custom base', () => {
			expectNumber(executeFunction('LOG', [num(8), num(2)]), 3);
		});

		it('LN calculates natural log', () => {
			expectNumber(executeFunction('LN', [num(Math.E)]), 1);
		});

		it('EXP calculates exponential', () => {
			expectNumber(executeFunction('EXP', [num(1)]), Math.E);
			expectNumber(executeFunction('EXP', [num(0)]), 1);
		});

		it('LOG returns error for non-positive', () => {
			expectError(executeFunction('LOG', [num(0)]), '#NUM!');
			expectError(executeFunction('LOG', [num(-1)]), '#NUM!');
		});
	});

	describe('PI', () => {
		it('returns pi', () => {
			expectNumber(executeFunction('PI', []), Math.PI);
		});

		it('returns error with arguments', () => {
			expectError(executeFunction('PI', [num(1)]), '#VALUE!');
		});
	});

	describe('RAND and RANDBETWEEN', () => {
		it('RAND returns number between 0 and 1', () => {
			const result = executeFunction('RAND', []);
			expect(result.type).toBe('number');
			if (result.type === 'number') {
				expect(result.value).toBeGreaterThanOrEqual(0);
				expect(result.value).toBeLessThan(1);
			}
		});

		it('RANDBETWEEN returns integer in range', () => {
			for (let i = 0; i < 10; i++) {
				const result = executeFunction('RANDBETWEEN', [num(1), num(10)]);
				expect(result.type).toBe('number');
				if (result.type === 'number') {
					expect(result.value).toBeGreaterThanOrEqual(1);
					expect(result.value).toBeLessThanOrEqual(10);
					expect(Number.isInteger(result.value)).toBe(true);
				}
			}
		});

		it('RANDBETWEEN returns error if min > max', () => {
			expectError(executeFunction('RANDBETWEEN', [num(10), num(1)]), '#VALUE!');
		});
	});
});

// =============================================================================
// Logic Function Tests
// =============================================================================

describe('logic functions', () => {
	describe('IF', () => {
		it('returns correct branch', () => {
			expectNumber(executeFunction('IF', [bool(true), num(1), num(2)]), 1);
			expectNumber(executeFunction('IF', [bool(false), num(1), num(2)]), 2);
		});

		it('treats non-zero as true', () => {
			expectNumber(executeFunction('IF', [num(5), num(1), num(2)]), 1);
			expectNumber(executeFunction('IF', [num(0), num(1), num(2)]), 2);
		});

		it('defaults to FALSE if third arg missing', () => {
			expectBoolean(executeFunction('IF', [bool(false), num(1)]), false);
		});

		it('returns error for wrong arg count', () => {
			expectError(executeFunction('IF', [bool(true)]), '#VALUE!');
		});
	});

	describe('AND', () => {
		it('returns true if all true', () => {
			expectBoolean(executeFunction('AND', [bool(true), bool(true)]), true);
			expectBoolean(executeFunction('AND', [bool(true), num(1), num(5)]), true);
		});

		it('returns false if any false', () => {
			expectBoolean(executeFunction('AND', [bool(true), bool(false)]), false);
			expectBoolean(executeFunction('AND', [bool(true), num(0)]), false);
		});

		it('returns error for empty args', () => {
			expectError(executeFunction('AND', []), '#VALUE!');
		});
	});

	describe('OR', () => {
		it('returns true if any true', () => {
			expectBoolean(executeFunction('OR', [bool(false), bool(true)]), true);
			expectBoolean(executeFunction('OR', [num(0), num(1)]), true);
		});

		it('returns false if all false', () => {
			expectBoolean(executeFunction('OR', [bool(false), bool(false)]), false);
			expectBoolean(executeFunction('OR', [num(0), num(0)]), false);
		});
	});

	describe('NOT', () => {
		it('inverts boolean', () => {
			expectBoolean(executeFunction('NOT', [bool(true)]), false);
			expectBoolean(executeFunction('NOT', [bool(false)]), true);
		});

		it('treats non-zero as true', () => {
			expectBoolean(executeFunction('NOT', [num(5)]), false);
			expectBoolean(executeFunction('NOT', [num(0)]), true);
		});
	});

	describe('XOR', () => {
		it('returns true for odd number of true values', () => {
			expectBoolean(executeFunction('XOR', [bool(true)]), true);
			expectBoolean(executeFunction('XOR', [bool(true), bool(true), bool(true)]), true);
		});

		it('returns false for even number of true values', () => {
			expectBoolean(executeFunction('XOR', [bool(true), bool(true)]), false);
			expectBoolean(executeFunction('XOR', [bool(false)]), false);
		});
	});

	describe('IFERROR', () => {
		it('returns value if not error', () => {
			expectNumber(executeFunction('IFERROR', [num(10), num(0)]), 10);
			expectString(executeFunction('IFERROR', [str('text'), num(0)]), 'text');
		});

		it('returns alternative if error', () => {
			const err: ComputedValue = { type: 'error', code: '#VALUE!', message: 'test' };
			expectNumber(executeFunction('IFERROR', [err, num(999)]), 999);
		});
	});

	describe('type check functions', () => {
		it('ISBLANK checks empty', () => {
			expectBoolean(executeFunction('ISBLANK', [empty()]), true);
			expectBoolean(executeFunction('ISBLANK', [num(0)]), false);
			expectBoolean(executeFunction('ISBLANK', [str('')]), false);
		});

		it('ISNUMBER checks number', () => {
			expectBoolean(executeFunction('ISNUMBER', [num(42)]), true);
			expectBoolean(executeFunction('ISNUMBER', [str('42')]), false);
			expectBoolean(executeFunction('ISNUMBER', [bool(true)]), false);
		});

		it('ISTEXT checks string', () => {
			expectBoolean(executeFunction('ISTEXT', [str('hello')]), true);
			expectBoolean(executeFunction('ISTEXT', [num(42)]), false);
		});

		it('ISERROR checks error', () => {
			const err: ComputedValue = { type: 'error', code: '#VALUE!', message: 'test' };
			expectBoolean(executeFunction('ISERROR', [err]), true);
			expectBoolean(executeFunction('ISERROR', [num(42)]), false);
		});
	});

	describe('TRUE and FALSE', () => {
		it('TRUE returns true', () => {
			expectBoolean(executeFunction('TRUE', []), true);
		});

		it('FALSE returns false', () => {
			expectBoolean(executeFunction('FALSE', []), false);
		});

		it('return error with arguments', () => {
			expectError(executeFunction('TRUE', [num(1)]), '#VALUE!');
			expectError(executeFunction('FALSE', [num(1)]), '#VALUE!');
		});
	});
});

// =============================================================================
// Text Function Tests
// =============================================================================

describe('text functions', () => {
	describe('CONCAT and CONCATENATE', () => {
		it('concatenates strings', () => {
			expectString(
				executeFunction('CONCAT', [str('Hello'), str(' '), str('World')]),
				'Hello World'
			);
		});

		it('converts numbers to strings', () => {
			expectString(executeFunction('CONCAT', [str('Value: '), num(42)]), 'Value: 42');
		});

		it('handles empty args', () => {
			expectString(executeFunction('CONCAT', []), '');
		});

		it('CONCATENATE is alias for CONCAT', () => {
			expectString(executeFunction('CONCATENATE', [str('A'), str('B')]), 'AB');
		});
	});

	describe('LEFT', () => {
		it('extracts left characters', () => {
			expectString(executeFunction('LEFT', [str('Hello')]), 'H');
			expectString(executeFunction('LEFT', [str('Hello'), num(3)]), 'Hel');
		});

		it('handles num_chars > length', () => {
			expectString(executeFunction('LEFT', [str('Hi'), num(10)]), 'Hi');
		});

		it('returns error for negative num_chars', () => {
			expectError(executeFunction('LEFT', [str('Hello'), num(-1)]), '#VALUE!');
		});
	});

	describe('RIGHT', () => {
		it('extracts right characters', () => {
			expectString(executeFunction('RIGHT', [str('Hello')]), 'o');
			expectString(executeFunction('RIGHT', [str('Hello'), num(3)]), 'llo');
		});

		it('handles num_chars > length', () => {
			expectString(executeFunction('RIGHT', [str('Hi'), num(10)]), 'Hi');
		});
	});

	describe('MID', () => {
		it('extracts middle characters', () => {
			expectString(executeFunction('MID', [str('Hello'), num(2), num(3)]), 'ell');
		});

		it('uses 1-indexed position', () => {
			expectString(executeFunction('MID', [str('Hello'), num(1), num(1)]), 'H');
		});

		it('returns error for position < 1', () => {
			expectError(executeFunction('MID', [str('Hello'), num(0), num(1)]), '#VALUE!');
		});
	});

	describe('LEN', () => {
		it('returns length', () => {
			expectNumber(executeFunction('LEN', [str('Hello')]), 5);
			expectNumber(executeFunction('LEN', [str('')]), 0);
		});

		it('converts numbers', () => {
			expectNumber(executeFunction('LEN', [num(12345)]), 5);
		});
	});

	describe('UPPER', () => {
		it('converts to uppercase', () => {
			expectString(executeFunction('UPPER', [str('hello')]), 'HELLO');
			expectString(executeFunction('UPPER', [str('Hello World')]), 'HELLO WORLD');
		});
	});

	describe('LOWER', () => {
		it('converts to lowercase', () => {
			expectString(executeFunction('LOWER', [str('HELLO')]), 'hello');
			expectString(executeFunction('LOWER', [str('Hello World')]), 'hello world');
		});
	});

	describe('PROPER', () => {
		it('converts to title case', () => {
			expectString(executeFunction('PROPER', [str('hello world')]), 'Hello World');
			expectString(executeFunction('PROPER', [str('HELLO WORLD')]), 'Hello World');
		});
	});

	describe('TRIM', () => {
		it('removes leading and trailing spaces', () => {
			expectString(executeFunction('TRIM', [str('  hello  ')]), 'hello');
		});

		it('reduces multiple spaces to single', () => {
			expectString(executeFunction('TRIM', [str('hello   world')]), 'hello world');
		});
	});

	describe('FIND', () => {
		it('finds text position (case-sensitive)', () => {
			expectNumber(executeFunction('FIND', [str('l'), str('Hello')]), 3);
		});

		it('finds from start position', () => {
			expectNumber(executeFunction('FIND', [str('l'), str('Hello'), num(4)]), 4);
		});

		it('returns error if not found', () => {
			expectError(executeFunction('FIND', [str('x'), str('Hello')]), '#VALUE!');
		});

		it('is case-sensitive', () => {
			expectError(executeFunction('FIND', [str('L'), str('hello')]), '#VALUE!');
		});
	});

	describe('SEARCH', () => {
		it('finds text position (case-insensitive)', () => {
			expectNumber(executeFunction('SEARCH', [str('L'), str('hello')]), 3);
		});
	});

	describe('SUBSTITUTE', () => {
		it('replaces all occurrences', () => {
			expectString(executeFunction('SUBSTITUTE', [str('aaa'), str('a'), str('b')]), 'bbb');
		});

		it('replaces specific occurrence', () => {
			expectString(executeFunction('SUBSTITUTE', [str('aaa'), str('a'), str('b'), num(2)]), 'aba');
		});
	});

	describe('REPLACE', () => {
		it('replaces characters at position', () => {
			expectString(executeFunction('REPLACE', [str('Hello'), num(1), num(1), str('J')]), 'Jello');
			expectString(
				executeFunction('REPLACE', [str('Hello'), num(1), num(5), str('Goodbye')]),
				'Goodbye'
			);
		});
	});

	describe('TEXT', () => {
		it('converts to text', () => {
			expectString(executeFunction('TEXT', [num(42)]), '42');
			expectString(executeFunction('TEXT', [bool(true)]), 'TRUE');
		});

		it('formats percentages', () => {
			expectString(executeFunction('TEXT', [num(0.25), str('0%')]), '25%');
		});

		it('formats decimals', () => {
			expectString(executeFunction('TEXT', [num(3.14159), str('0.00')]), '3.14');
		});
	});

	describe('REPT', () => {
		it('repeats text', () => {
			expectString(executeFunction('REPT', [str('ab'), num(3)]), 'ababab');
		});

		it('returns empty for 0 repetitions', () => {
			expectString(executeFunction('REPT', [str('ab'), num(0)]), '');
		});

		it('returns error for negative repetitions', () => {
			expectError(executeFunction('REPT', [str('ab'), num(-1)]), '#VALUE!');
		});

		it('returns error for too many repetitions', () => {
			expectError(executeFunction('REPT', [str('a'), num(50000)]), '#VALUE!');
		});
	});
});

// =============================================================================
// French Alias Tests
// =============================================================================

describe('French aliases', () => {
	it('SOMME works like SUM', () => {
		expectNumber(executeFunction('SOMME', [num(1), num(2), num(3)]), 6);
	});

	it('MOYENNE works like AVERAGE', () => {
		expectNumber(executeFunction('MOYENNE', [num(1), num(2), num(3)]), 2);
	});

	it('SI works like IF', () => {
		expectNumber(executeFunction('SI', [bool(true), num(1), num(2)]), 1);
	});

	it('ET works like AND', () => {
		expectBoolean(executeFunction('ET', [bool(true), bool(true)]), true);
	});

	it('OU works like OR', () => {
		expectBoolean(executeFunction('OU', [bool(false), bool(true)]), true);
	});

	it('NON works like NOT', () => {
		expectBoolean(executeFunction('NON', [bool(true)]), false);
	});

	it('CONCATENER works like CONCATENATE', () => {
		expectString(executeFunction('CONCATENER', [str('A'), str('B')]), 'AB');
	});

	it('MAJUSCULE works like UPPER', () => {
		expectString(executeFunction('MAJUSCULE', [str('hello')]), 'HELLO');
	});

	it('MINUSCULE works like LOWER', () => {
		expectString(executeFunction('MINUSCULE', [str('HELLO')]), 'hello');
	});
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('error handling', () => {
	it('propagates errors through functions', () => {
		const err: ComputedValue = { type: 'error', code: '#REF!', message: 'test' };
		expectError(executeFunction('SUM', [num(1), err, num(2)]), '#REF!');
		expectError(executeFunction('IF', [err, num(1), num(2)]), '#REF!');
		expectError(executeFunction('CONCAT', [str('a'), err]), '#REF!');
	});

	it('returns appropriate error codes', () => {
		expectError(executeFunction('SQRT', [num(-1)]), '#NUM!');
		expectError(executeFunction('LOG', [num(0)]), '#NUM!');
		expectError(executeFunction('MOD', [num(10), num(0)]), '#DIV/0!');
		expectError(executeFunction('ABS', [str('text')]), '#VALUE!');
	});
});
