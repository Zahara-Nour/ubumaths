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

		it('should handle classic floating-point edge cases', () => {
			expect(compareLatex('0.7 + 0.1', '0.8')).toBe(0);
			expect(compareLatex('1.0 - 0.9', '0.1')).toBe(0);
			expect(compareLatex('0.1 \\cdot 3', '0.3')).toBe(0);
			expect(compareLatex('0.6 / 0.2', '3')).toBe(0);
		});

		it('should handle very small differences', () => {
			// These are NOT equal - verify we detect the difference
			expect(compareLatex('1.0000001', '1.0000002')).toBe(-1);
			expect(compareLatex('0.9999999', '1')).toBe(-1);
		});
	});

	// =============================================================================
	// Tests: Zero Edge Cases
	// =============================================================================

	describe('zero edge cases', () => {
		it('should handle zero comparisons', () => {
			expect(compareLatex('0', '0')).toBe(0);
			expect(compareLatex('0', '1')).toBe(-1);
			expect(compareLatex('0', '-1')).toBe(1);
			expect(compareLatex('1', '0')).toBe(1);
			expect(compareLatex('-1', '0')).toBe(-1);
		});

		it('should handle zero in different forms', () => {
			expect(compareLatex('0.0', '0')).toBe(0);
			expect(compareLatex('0.00', '0')).toBe(0);
			expect(compareLatex('-0', '0')).toBe(0);
			expect(compareLatex('\\frac{0}{5}', '0')).toBe(0);
		});

		it('should handle expressions that evaluate to zero', () => {
			expect(compareLatex('5 - 5', '0')).toBe(0);
			expect(compareLatex('3 \\cdot 0', '0')).toBe(0);
			expect(compareLatex('\\frac{0}{7}', '0')).toBe(0);
			expect(compareLatex('0^5', '0')).toBe(0);
		});

		it('should handle identity: a - a = 0', () => {
			expect(compareLatex('7 - 7', '0')).toBe(0);
			expect(compareLatex('\\pi - \\pi', '0')).toBe(0);
			expect(compareLatex('\\sqrt{2} - \\sqrt{2}', '0')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Large and Small Numbers
	// =============================================================================

	describe('large and small numbers', () => {
		it('should handle very large numbers', () => {
			expect(compareLatex('999999999999', '999999999998')).toBe(1);
			expect(compareLatex('1000000000000', '999999999999')).toBe(1);
		});

		it('should handle very small positive numbers', () => {
			expect(compareLatex('0.0000001', '0.0000002')).toBe(-1);
			expect(compareLatex('0.0000001', '0')).toBe(1);
		});

		it('should handle scientific notation style expressions', () => {
			expect(compareLatex('2 \\cdot 10^3', '2000')).toBe(0);
			expect(compareLatex('5 \\cdot 10^{-2}', '0.05')).toBe(0);
			expect(compareLatex('1.5 \\cdot 10^2', '150')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Negative Fractions
	// =============================================================================

	describe('negative fractions', () => {
		it('should handle negative fractions', () => {
			expect(compareLatex('-\\frac{1}{2}', '\\frac{1}{2}')).toBe(-1);
			expect(compareLatex('\\frac{-1}{2}', '-\\frac{1}{2}')).toBe(0);
			expect(compareLatex('-\\frac{3}{4}', '-\\frac{1}{4}')).toBe(-1);
		});

		it('should compare negative fractions with integers', () => {
			expect(compareLatex('-\\frac{1}{2}', '0')).toBe(-1);
			expect(compareLatex('-\\frac{1}{2}', '-1')).toBe(1);
			expect(compareLatex('-\\frac{3}{2}', '-1')).toBe(-1);
		});

		it('should handle improper fractions', () => {
			expect(compareLatex('\\frac{7}{3}', '2')).toBe(1);
			expect(compareLatex('\\frac{5}{2}', '2.5')).toBe(0);
			expect(compareLatex('\\frac{10}{4}', '\\frac{5}{2}')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Powers and Exponents
	// =============================================================================

	describe('powers and exponents', () => {
		it('should handle integer powers', () => {
			expect(compareLatex('2^3', '8')).toBe(0);
			expect(compareLatex('3^2', '9')).toBe(0);
			expect(compareLatex('2^{10}', '1024')).toBe(0);
		});

		it('should handle zero exponent (x^0 = 1)', () => {
			expect(compareLatex('5^0', '1')).toBe(0);
			expect(compareLatex('100^0', '1')).toBe(0);
			expect(compareLatex('(-3)^0', '1')).toBe(0);
		});

		it('should handle negative exponents', () => {
			expect(compareLatex('2^{-1}', '\\frac{1}{2}')).toBe(0);
			expect(compareLatex('2^{-2}', '\\frac{1}{4}')).toBe(0);
			expect(compareLatex('10^{-1}', '0.1')).toBe(0);
		});

		it('should handle square roots as fractional exponents', () => {
			// sqrt is well-supported
			expect(compareLatex('\\sqrt{4}', '2')).toBe(0);
			expect(compareLatex('\\sqrt{16}', '4')).toBe(0);
			expect(compareLatex('\\sqrt{25}', '5')).toBe(0);
		});

		it('should compare different powers', () => {
			expect(compareLatex('2^3', '3^2')).toBe(-1); // 8 < 9
			expect(compareLatex('2^4', '3^3')).toBe(-1); // 16 < 27
			expect(compareLatex('10^2', '2^7')).toBe(-1); // 100 < 128
		});
	});

	// =============================================================================
	// Tests: Fractional Exponents and Nth Roots
	// =============================================================================

	describe('fractional exponents and nth roots', () => {
		it('should handle cube roots using sqrt[3] notation', () => {
			expect(compareLatex('\\sqrt[3]{8}', '2')).toBe(0);
			expect(compareLatex('\\sqrt[3]{27}', '3')).toBe(0);
			expect(compareLatex('\\sqrt[3]{64}', '4')).toBe(0);
			expect(compareLatex('\\sqrt[3]{125}', '5')).toBe(0);
		});

		it('should handle 4th and higher roots', () => {
			expect(compareLatex('\\sqrt[4]{16}', '2')).toBe(0);
			expect(compareLatex('\\sqrt[4]{81}', '3')).toBe(0);
			expect(compareLatex('\\sqrt[5]{32}', '2')).toBe(0);
			expect(compareLatex('\\sqrt[5]{243}', '3')).toBe(0);
		});

		it('should handle fractional exponents x^{1/n}', () => {
			expect(compareLatex('8^{\\frac{1}{3}}', '2')).toBe(0);
			expect(compareLatex('27^{\\frac{1}{3}}', '3')).toBe(0);
			expect(compareLatex('16^{\\frac{1}{4}}', '2')).toBe(0);
			expect(compareLatex('81^{\\frac{1}{4}}', '3')).toBe(0);
		});

		it('should handle fractional exponents x^{p/q}', () => {
			expect(compareLatex('8^{\\frac{2}{3}}', '4')).toBe(0); // (8^{1/3})^2 = 2^2 = 4
			expect(compareLatex('27^{\\frac{2}{3}}', '9')).toBe(0); // (27^{1/3})^2 = 3^2 = 9
			expect(compareLatex('16^{\\frac{3}{4}}', '8')).toBe(0); // (16^{1/4})^3 = 2^3 = 8
		});

		it('should compare nth roots with numbers', () => {
			expect(compareLatex('\\sqrt[3]{10}', '2')).toBe(1); // cbrt(10) ≈ 2.15
			expect(compareLatex('\\sqrt[3]{10}', '3')).toBe(-1);
		});

		it('should handle cbrt via \\sqrt[3] notation', () => {
			// Note: cbrt() without backslash is not a valid LaTeX command
			// Use \sqrt[3]{} for cube roots
			expect(compareLatex('\\sqrt[3]{8}', '2')).toBe(0);
			expect(compareLatex('\\sqrt[3]{27}', '3')).toBe(0);
			expect(compareLatex('\\sqrt[3]{64}', '4')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Square Root Edge Cases
	// =============================================================================

	describe('square root edge cases', () => {
		it('should handle sqrt(0)', () => {
			expect(compareLatex('\\sqrt{0}', '0')).toBe(0);
		});

		it('should handle sqrt(1)', () => {
			expect(compareLatex('\\sqrt{1}', '1')).toBe(0);
		});

		it('should handle large perfect squares', () => {
			expect(compareLatex('\\sqrt{100}', '10')).toBe(0);
			expect(compareLatex('\\sqrt{10000}', '100')).toBe(0);
			expect(compareLatex('\\sqrt{144}', '12')).toBe(0);
		});

		it('should handle nested square roots', () => {
			expect(compareLatex('\\sqrt{\\sqrt{16}}', '2')).toBe(0);
			expect(compareLatex('\\sqrt{\\sqrt{81}}', '3')).toBe(0);
		});

		it('should handle sqrt of fractions', () => {
			expect(compareLatex('\\sqrt{\\frac{1}{4}}', '\\frac{1}{2}')).toBe(0);
			expect(compareLatex('\\sqrt{\\frac{9}{16}}', '\\frac{3}{4}')).toBe(0);
		});

		it('should compare irrational square roots', () => {
			// sqrt(2) ≈ 1.414, sqrt(3) ≈ 1.732
			expect(compareLatex('\\sqrt{2}', '1.4')).toBe(1);
			expect(compareLatex('\\sqrt{2}', '1.5')).toBe(-1);
			expect(compareLatex('\\sqrt{3}', '1.7')).toBe(1);
			expect(compareLatex('\\sqrt{3}', '1.8')).toBe(-1);
		});

		it('should handle products with sqrt', () => {
			expect(compareLatex('2\\sqrt{2}', '\\sqrt{8}')).toBe(0);
			expect(compareLatex('3\\sqrt{3}', '\\sqrt{27}')).toBe(0);
			expect(compareLatex('\\sqrt{2} \\cdot \\sqrt{3}', '\\sqrt{6}')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Trigonometric Functions
	// =============================================================================

	describe('trigonometric functions', () => {
		it('should handle sin of special angles', () => {
			expect(compareLatex('\\sin(0)', '0')).toBe(0);
		});

		it('should handle cos of special angles', () => {
			expect(compareLatex('\\cos(0)', '1')).toBe(0);
		});

		it('should compare trig values', () => {
			// sin(pi/6) = 0.5, sin(pi/4) ≈ 0.707
			expect(compareLatex('\\sin(\\frac{\\pi}{6})', '\\frac{1}{2}')).toBe(0);
			expect(compareLatex('\\sin(\\frac{\\pi}{4})', '\\frac{1}{2}')).toBe(1);
		});

		it('should handle cos at pi/3', () => {
			expect(compareLatex('\\cos(\\frac{\\pi}{3})', '\\frac{1}{2}')).toBe(0);
		});

		it('should handle trig at pi/2', () => {
			// sin(pi/2) = 1, cos(pi/2) = 0
			expect(compareLatex('\\sin(\\frac{\\pi}{2})', '1')).toBe(0);
			expect(compareLatex('\\cos(\\frac{\\pi}{2})', '0')).toBe(0);
		});

		it('should handle tan of special angles', () => {
			expect(compareLatex('\\tan(0)', '0')).toBe(0);
			expect(compareLatex('\\tan(\\frac{\\pi}{4})', '1')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Logarithms and Exponentials
	// =============================================================================

	describe('logarithms and exponentials', () => {
		it('should handle ln of special values', () => {
			expect(compareLatex('\\ln(1)', '0')).toBe(0);
			expect(compareLatex('\\ln(e)', '1')).toBe(0);
			expect(compareLatex('\\ln(e^2)', '2')).toBe(0);
		});

		it('should handle exp of special values', () => {
			expect(compareLatex('e^0', '1')).toBe(0);
			expect(compareLatex('e^1', 'e')).toBe(0);
			expect(compareLatex('\\exp(0)', '1')).toBe(0);
		});

		it('should handle log base 10', () => {
			expect(compareLatex('\\log_{10}(10)', '1')).toBe(0);
			expect(compareLatex('\\log_{10}(100)', '2')).toBe(0);
			expect(compareLatex('\\log_{10}(1000)', '3')).toBe(0);
		});

		it('should handle log base 2', () => {
			expect(compareLatex('\\log_2(2)', '1')).toBe(0);
			expect(compareLatex('\\log_2(8)', '3')).toBe(0);
			expect(compareLatex('\\log_2(1)', '0')).toBe(0);
		});

		it('should compare log values', () => {
			expect(compareLatex('\\ln(2)', '0.5')).toBe(1); // ln(2) ≈ 0.693
			expect(compareLatex('\\ln(2)', '1')).toBe(-1);
		});
	});

	// =============================================================================
	// Tests: Absolute Value
	// =============================================================================

	describe('absolute value', () => {
		it('should handle absolute value of positive numbers', () => {
			expect(compareLatex('|5|', '5')).toBe(0);
			expect(compareLatex('|3.14|', '3.14')).toBe(0);
		});

		it('should handle absolute value of negative numbers', () => {
			expect(compareLatex('|-5|', '5')).toBe(0);
			expect(compareLatex('|-3.14|', '3.14')).toBe(0);
		});

		it('should handle absolute value of zero', () => {
			expect(compareLatex('|0|', '0')).toBe(0);
		});

		it('should compare absolute values', () => {
			expect(compareLatex('|-7|', '|5|')).toBe(1);
			expect(compareLatex('|-3|', '|-5|')).toBe(-1);
			expect(compareLatex('|-4|', '|4|')).toBe(0);
		});

		it('should handle absolute value of expressions', () => {
			expect(compareLatex('|3 - 7|', '4')).toBe(0);
			expect(compareLatex('|-\\frac{1}{2}|', '\\frac{1}{2}')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Rounding Functions
	// =============================================================================

	// Note: Rounding functions (floor, ceil, round) work in the evaluator
	// but the parser doesn't support the LaTeX syntax (\lfloor x \rfloor, etc.)
	// TODO: Implement parser support for \lfloor, \rfloor, \lceil, \rceil
	// See plan: /Users/david/.claude/plans/abstract-prancing-iverson.md Phase 2
	describe('rounding functions', () => {
		it.skip('should handle floor function (parser support needed)', () => {
			expect(compareLatex('\\lfloor 3.7 \\rfloor', '3')).toBe(0);
			expect(compareLatex('\\lfloor 3.2 \\rfloor', '3')).toBe(0);
		});

		it.skip('should handle ceiling function (parser support needed)', () => {
			expect(compareLatex('\\lceil 3.2 \\rceil', '4')).toBe(0);
			expect(compareLatex('\\lceil 3.7 \\rceil', '4')).toBe(0);
		});

		it.skip('should compare floor and ceil (parser support needed)', () => {
			expect(compareLatex('\\lfloor 3.5 \\rfloor', '\\lceil 3.5 \\rceil')).toBe(-1);
		});
	});

	// =============================================================================
	// Tests: Mathematical Identities
	// =============================================================================

	describe('mathematical identities', () => {
		it('should handle a / a = 1 (for non-zero a)', () => {
			expect(compareLatex('\\frac{7}{7}', '1')).toBe(0);
			expect(compareLatex('\\frac{\\pi}{\\pi}', '1')).toBe(0);
			expect(compareLatex('\\frac{\\sqrt{2}}{\\sqrt{2}}', '1')).toBe(0);
		});

		it('should handle a * 1 = a', () => {
			expect(compareLatex('7 \\cdot 1', '7')).toBe(0);
			expect(compareLatex('\\pi \\cdot 1', '\\pi')).toBe(0);
		});

		it('should handle a + 0 = a', () => {
			expect(compareLatex('7 + 0', '7')).toBe(0);
			expect(compareLatex('\\pi + 0', '\\pi')).toBe(0);
		});

		it('should handle double negation: -(-a) = a', () => {
			expect(compareLatex('-(-5)', '5')).toBe(0);
			expect(compareLatex('-(-\\pi)', '\\pi')).toBe(0);
		});

		it('should handle distributive property', () => {
			expect(compareLatex('2 \\cdot (3 + 4)', '2 \\cdot 3 + 2 \\cdot 4')).toBe(0);
			expect(compareLatex('3 \\cdot (5 - 2)', '3 \\cdot 5 - 3 \\cdot 2')).toBe(0);
		});

		it('should handle factoring patterns', () => {
			// a² - b² = (a+b)(a-b) for specific values
			expect(compareLatex('5^2 - 3^2', '(5+3)(5-3)')).toBe(0); // 25-9 = 16 = 8*2
			expect(compareLatex('10^2 - 6^2', '(10+6)(10-6)')).toBe(0); // 100-36 = 64 = 16*4
		});
	});

	// =============================================================================
	// Tests: Mixed Representations
	// =============================================================================

	describe('mixed representations of same value', () => {
		it('should recognize equivalent representations', () => {
			expect(compareLatex('0.5', '\\frac{1}{2}')).toBe(0);
			expect(compareLatex('0.25', '\\frac{1}{4}')).toBe(0);
			expect(compareLatex('0.75', '\\frac{3}{4}')).toBe(0);
			expect(compareLatex('1.5', '\\frac{3}{2}')).toBe(0);
		});

		it('should recognize expression vs literal equivalence', () => {
			expect(compareLatex('6', '2 \\cdot 3')).toBe(0);
			expect(compareLatex('8', '2^3')).toBe(0);
			expect(compareLatex('10', '\\frac{100}{10}')).toBe(0);
		});

		it('should handle percentage-like expressions', () => {
			expect(compareLatex('\\frac{50}{100}', '0.5')).toBe(0);
			expect(compareLatex('\\frac{25}{100}', '0.25')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Order of Operations
	// =============================================================================

	describe('order of operations', () => {
		it('should respect order of operations', () => {
			expect(compareLatex('2 + 3 \\cdot 4', '14')).toBe(0); // Not 20
			expect(compareLatex('10 - 2 \\cdot 3', '4')).toBe(0); // Not 24
			expect(compareLatex('2 \\cdot 3^2', '18')).toBe(0); // Not 36
		});

		it('should handle parentheses correctly', () => {
			expect(compareLatex('(2 + 3) \\cdot 4', '20')).toBe(0);
			expect(compareLatex('(10 - 2) \\cdot 3', '24')).toBe(0);
			expect(compareLatex('(2 \\cdot 3)^2', '36')).toBe(0);
		});

		it('should handle nested parentheses', () => {
			expect(compareLatex('((2 + 3) \\cdot 4) + 1', '21')).toBe(0);
			expect(compareLatex('2 \\cdot ((3 + 4) \\cdot 5)', '70')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Complex Expressions
	// =============================================================================

	describe('complex expressions', () => {
		it('should handle multi-term sums', () => {
			expect(compareLatex('1 + 2 + 3 + 4 + 5', '15')).toBe(0);
			expect(compareLatex('1 - 2 + 3 - 4 + 5', '3')).toBe(0);
		});

		it('should handle chained multiplications', () => {
			expect(compareLatex('2 \\cdot 3 \\cdot 4 \\cdot 5', '120')).toBe(0);
		});

		it('should handle combined operations', () => {
			expect(compareLatex('\\frac{1 + 2}{3}', '1')).toBe(0);
			expect(compareLatex('\\sqrt{3^2 + 4^2}', '5')).toBe(0); // Pythagorean triple
			expect(compareLatex('\\frac{\\sqrt{2}}{\\sqrt{2}}', '1')).toBe(0);
		});

		it('should handle expression with multiple functions', () => {
			expect(compareLatex('\\sin(0) + \\cos(0)', '1')).toBe(0);
			expect(compareLatex('\\ln(e) + \\ln(e)', '2')).toBe(0);
		});
	});

	// =============================================================================
	// Tests: Pi Edge Cases
	// =============================================================================

	describe('pi edge cases', () => {
		it('should compare pi with its approximations', () => {
			expect(compareLatex('\\pi', '3.14')).toBe(1); // pi > 3.14
			expect(compareLatex('\\pi', '3.15')).toBe(-1); // pi < 3.15
			expect(compareLatex('\\pi', '3.141')).toBe(1);
			expect(compareLatex('\\pi', '3.142')).toBe(-1);
		});

		it('should handle multiples of pi', () => {
			expect(compareLatex('2\\pi', '6')).toBe(1); // 2π ≈ 6.28
			expect(compareLatex('2\\pi', '7')).toBe(-1);
			expect(compareLatex('\\frac{\\pi}{2}', '1.5')).toBe(1); // π/2 ≈ 1.57
			expect(compareLatex('\\frac{\\pi}{2}', '1.6')).toBe(-1);
		});

		it('should handle pi in expressions', () => {
			expect(compareLatex('\\pi^2', '9')).toBe(1); // π² ≈ 9.87
			expect(compareLatex('\\pi^2', '10')).toBe(-1);
			expect(compareLatex('\\sqrt{\\pi}', '1.7')).toBe(1); // √π ≈ 1.77
			expect(compareLatex('\\sqrt{\\pi}', '1.8')).toBe(-1);
		});
	});

	// =============================================================================
	// Tests: Euler's Number Edge Cases
	// =============================================================================

	describe("euler's number edge cases", () => {
		it('should compare e with its approximations', () => {
			expect(compareLatex('e', '2.71')).toBe(1);
			expect(compareLatex('e', '2.72')).toBe(-1);
			expect(compareLatex('e', '2.718')).toBe(1);
			expect(compareLatex('e', '2.719')).toBe(-1);
		});

		it('should handle powers of e', () => {
			expect(compareLatex('e^2', '7')).toBe(1); // e² ≈ 7.39
			expect(compareLatex('e^2', '8')).toBe(-1);
		});

		it('should handle e vs pi', () => {
			expect(compareLatex('e', '\\pi')).toBe(-1); // e ≈ 2.718 < π ≈ 3.14
		});
	});

	// =============================================================================
	// Tests: Additional Error Cases
	// =============================================================================

	describe('additional error cases', () => {
		it('should return undefined for multiple variables', () => {
			expect(compareLatex('x + y', '5')).toBeUndefined();
			expect(compareLatex('2x', 'x')).toBeUndefined();
		});

		it('should return undefined for undefined expressions', () => {
			// These should fail during evaluation
			expect(compareLatex('\\frac{0}{0}', '1')).toBeUndefined();
		});

		it('should return undefined for logarithm of non-positive', () => {
			expect(compareLatex('\\ln(0)', '1')).toBeUndefined();
			expect(compareLatex('\\ln(-1)', '1')).toBeUndefined();
		});

		it('should return undefined for sqrt of negative (real domain)', () => {
			expect(compareLatex('\\sqrt{-1}', '1')).toBeUndefined();
			expect(compareLatex('\\sqrt{-4}', '2')).toBeUndefined();
		});
	});

	// =============================================================================
	// Tests: Symmetry and Transitivity
	// =============================================================================

	describe('symmetry and transitivity', () => {
		it('should be symmetric: if a > b then b < a', () => {
			// For several pairs, verify symmetry
			expect(compareLatex('5', '3')).toBe(1);
			expect(compareLatex('3', '5')).toBe(-1);

			expect(compareLatex('\\pi', '3')).toBe(1);
			expect(compareLatex('3', '\\pi')).toBe(-1);

			expect(compareLatex('\\sqrt{2}', '1')).toBe(1);
			expect(compareLatex('1', '\\sqrt{2}')).toBe(-1);
		});

		it('should be reflexive: a = a', () => {
			expect(compareLatex('5', '5')).toBe(0);
			expect(compareLatex('\\pi', '\\pi')).toBe(0);
			expect(compareLatex('\\sqrt{2}', '\\sqrt{2}')).toBe(0);
			expect(compareLatex('\\frac{1}{3}', '\\frac{1}{3}')).toBe(0);
		});

		it('should verify transitivity: if a < b and b < c then a < c', () => {
			// 1 < sqrt(2) < 2
			expect(compareLatex('1', '\\sqrt{2}')).toBe(-1);
			expect(compareLatex('\\sqrt{2}', '2')).toBe(-1);
			expect(compareLatex('1', '2')).toBe(-1);

			// e < pi < 4
			expect(compareLatex('e', '\\pi')).toBe(-1);
			expect(compareLatex('\\pi', '4')).toBe(-1);
			expect(compareLatex('e', '4')).toBe(-1);
		});
	});

	// =============================================================================
	// Tests: Boundary Values
	// =============================================================================

	describe('boundary values', () => {
		it('should handle values very close to integers', () => {
			expect(compareLatex('0.999999999', '1')).toBe(-1);
			expect(compareLatex('1.000000001', '1')).toBe(1);
			expect(compareLatex('2.999999999', '3')).toBe(-1);
		});

		it('should handle values around common fractions', () => {
			expect(compareLatex('0.49999999', '0.5')).toBe(-1);
			expect(compareLatex('0.50000001', '0.5')).toBe(1);
			expect(compareLatex('0.33333333', '\\frac{1}{3}')).toBe(-1);
			expect(compareLatex('0.33333334', '\\frac{1}{3}')).toBe(1);
		});
	});
});
