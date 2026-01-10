/**
 * Unit tests for compareNumericNodes function
 *
 * Tests the comparison of two MathNodes by their numeric values.
 */

import { describe, it, expect } from 'vitest';
import { compareNumericNodes } from '../compare-numeric';
import { parseLatex } from '../../parser';
import { number, variable, positiveInfinity, negativeInfinity } from '../../factory';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to compare two LaTeX expressions
 */
function compareLatex(a: string, b: string) {
	return compareNumericNodes(parseLatex(a), parseLatex(b));
}

// =============================================================================
// Tests: Integers
// =============================================================================

describe('compareNumericNodes', () => {
	describe('integers', () => {
		it('should return 1 when a > b', () => {
			expect(compareNumericNodes(number('5'), number('3'))).toBe(1);
		});

		it('should return -1 when a < b', () => {
			expect(compareNumericNodes(number('2'), number('7'))).toBe(-1);
		});

		it('should return 0 when a = b', () => {
			expect(compareNumericNodes(number('4'), number('4'))).toBe(0);
		});

		it('should handle negative integers', () => {
			expect(compareLatex('-5', '-3')).toBe(-1);
			expect(compareLatex('-3', '-5')).toBe(1);
			expect(compareLatex('-4', '-4')).toBe(0);
		});

		it('should compare negative and positive', () => {
			expect(compareLatex('-1', '1')).toBe(-1);
			expect(compareLatex('1', '-1')).toBe(1);
		});
	});

	// =============================================================================
	// Tests: Decimals
	// =============================================================================

	describe('decimals', () => {
		it('should compare decimal numbers', () => {
			expect(compareLatex('3.14', '3.1')).toBe(1);
			expect(compareLatex('0.5', '0.6')).toBe(-1);
			expect(compareLatex('2.5', '2.5')).toBe(0);
		});

		it('should compare integers and decimals', () => {
			expect(compareLatex('3', '2.9')).toBe(1);
			expect(compareLatex('3', '3.1')).toBe(-1);
			expect(compareLatex('3', '3.0')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Mathematical Constants
	// =============================================================================

	describe('mathematical constants', () => {
		it('should compare pi with numbers', () => {
			expect(compareLatex('\\pi', '3')).toBe(1); // pi > 3
			expect(compareLatex('\\pi', '4')).toBe(-1); // pi < 4
		});

		it('should compare euler number with numbers', () => {
			expect(compareLatex('e', '2')).toBe(1); // e > 2
			expect(compareLatex('e', '3')).toBe(-1); // e < 3
		});

		it('should compare pi with itself', () => {
			expect(compareLatex('\\pi', '\\pi')).toBe(0);
			expect(compareLatex('2\\pi', '2\\pi')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Expressions
	// =============================================================================

	describe('expressions', () => {
		it('should compare sum with number', () => {
			expect(compareLatex('2+3', '6')).toBe(-1); // 5 < 6
			expect(compareLatex('2+3', '5')).toBe(0); // 5 = 5
			expect(compareLatex('2+3', '4')).toBe(1); // 5 > 4
		});

		it('should compare two expressions', () => {
			expect(compareLatex('2+3', '1+4')).toBe(0); // 5 = 5
			expect(compareLatex('2*3', '2+3')).toBe(1); // 6 > 5
		});
	});

	// =============================================================================
	// Tests: Fractions
	// =============================================================================

	describe('fractions', () => {
		it('should compare fractions', () => {
			expect(compareLatex('\\frac{1}{2}', '\\frac{2}{3}')).toBe(-1); // 1/2 < 2/3
			expect(compareLatex('\\frac{3}{4}', '\\frac{1}{2}')).toBe(1); // 3/4 > 1/2
		});

		it('should detect equivalent fractions', () => {
			expect(compareLatex('\\frac{3}{6}', '\\frac{1}{2}')).toBe(0);
			expect(compareLatex('\\frac{2}{4}', '\\frac{1}{2}')).toBe(0);
		});

		it('should compare fractions with decimals', () => {
			expect(compareLatex('\\frac{1}{2}', '0.5')).toBe(0);
			expect(compareLatex('\\frac{1}{3}', '0.33')).toBe(1); // 1/3 > 0.33
		});
	});

	// =============================================================================
	// Tests: Square Roots
	// =============================================================================

	describe('square roots', () => {
		it('should compare sqrt with numbers', () => {
			expect(compareLatex('\\sqrt{2}', '2')).toBe(-1); // sqrt(2) < 2
			expect(compareLatex('\\sqrt{2}', '1')).toBe(1); // sqrt(2) > 1
		});

		it('should detect exact sqrt results', () => {
			expect(compareLatex('\\sqrt{9}', '3')).toBe(0);
			expect(compareLatex('\\sqrt{4}', '2')).toBe(0);
		});

		it('should compare identical sqrt expressions', () => {
			expect(compareLatex('\\sqrt{2}', '\\sqrt{2}')).toBe(0);
			expect(compareLatex('2\\sqrt{2}', '2\\sqrt{2}')).toBe(0);
		});

		it('should compare different sqrt expressions', () => {
			expect(compareLatex('\\sqrt{2}', '\\sqrt{3}')).toBe(-1);
			expect(compareLatex('\\sqrt{5}', '\\sqrt{3}')).toBe(1);
		});
	});

	// =============================================================================
	// Tests: Infinity
	// =============================================================================

	describe('infinity', () => {
		it('should return 1 when +infinity > finite number', () => {
			expect(compareNumericNodes(positiveInfinity(), number('1000000'))).toBe(1);
			expect(compareNumericNodes(positiveInfinity(), number('-1000000'))).toBe(1);
		});

		it('should return -1 when -infinity < finite number', () => {
			expect(compareNumericNodes(negativeInfinity(), number('1000000'))).toBe(-1);
			expect(compareNumericNodes(negativeInfinity(), number('-1000000'))).toBe(-1);
		});

		it('should return 0 when comparing same infinities', () => {
			expect(compareNumericNodes(positiveInfinity(), positiveInfinity())).toBe(0);
			expect(compareNumericNodes(negativeInfinity(), negativeInfinity())).toBe(0);
		});

		it('should return 1 when +infinity > -infinity', () => {
			expect(compareNumericNodes(positiveInfinity(), negativeInfinity())).toBe(1);
		});

		it('should return -1 when -infinity < +infinity', () => {
			expect(compareNumericNodes(negativeInfinity(), positiveInfinity())).toBe(-1);
		});
	});

	// =============================================================================
	// Tests: Error Cases
	// =============================================================================

	describe('error cases', () => {
		it('should return undefined for expressions with variables', () => {
			expect(compareNumericNodes(variable('x'), number('3'))).toBeUndefined();
			expect(compareLatex('x + 1', '5')).toBeUndefined();
		});

		it('should return undefined for complex numbers', () => {
			// Complex numbers don't have a total ordering
			expect(compareLatex('i', '1')).toBeUndefined();
			expect(compareLatex('2+3i', '5')).toBeUndefined();
		});

		it('should return undefined for division by zero', () => {
			expect(compareLatex('\\frac{1}{0}', '5')).toBeUndefined();
		});
	});

	// =============================================================================
	// Tests: Precision Edge Cases
	// =============================================================================

	describe('precision edge cases', () => {
		it('should handle 0.1 + 0.2 = 0.3 correctly (exact mode)', () => {
			// This is the classic floating-point problem
			// 0.1 + 0.2 should equal 0.3 exactly via rational arithmetic
			expect(compareLatex('0.1 + 0.2', '0.3')).toBe(0);
		});

		it('should handle repeated fractions correctly', () => {
			expect(compareLatex('\\frac{1}{3} + \\frac{1}{3} + \\frac{1}{3}', '1')).toBe(0);
		});
	});
});
