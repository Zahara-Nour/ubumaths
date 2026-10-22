/**
 * Constraint Validators Tests
 * ============================
 *
 * Comprehensive tests for constraint validation functions that check
 * if mathematically correct answers are written in proper form.
 */

import { describe, it, expect } from 'vitest';
import { checkReducedFractions } from '../constraint-validators';

// ============================================================================
// REDUCED FRACTIONS VALIDATOR TESTS
// ============================================================================

describe('checkReducedFractions', () => {
	// ========================================================================
	// Simple Non-reduced Fractions
	// ========================================================================
	describe('Simple Non-reduced Fractions', () => {
		it('should detect 2/4 (GCD=2)', () => {
			expect(checkReducedFractions(['\\frac{2}{4}'])).toEqual([0]);
		});

		it('should detect 6/9 (GCD=3)', () => {
			expect(checkReducedFractions(['\\frac{6}{9}'])).toEqual([0]);
		});

		it('should detect 4/8 (GCD=4)', () => {
			expect(checkReducedFractions(['\\frac{4}{8}'])).toEqual([0]);
		});

		it('should detect 12/18 (GCD=6)', () => {
			expect(checkReducedFractions(['\\frac{12}{18}'])).toEqual([0]);
		});

		it('should detect 15/25 (GCD=5)', () => {
			expect(checkReducedFractions(['\\frac{15}{25}'])).toEqual([0]);
		});

		it('should detect 21/35 (GCD=7)', () => {
			expect(checkReducedFractions(['\\frac{21}{35}'])).toEqual([0]);
		});

		it('should detect 100/200 (GCD=100)', () => {
			expect(checkReducedFractions(['\\frac{100}{200}'])).toEqual([0]);
		});

		it('should detect 36/48 (GCD=12)', () => {
			expect(checkReducedFractions(['\\frac{36}{48}'])).toEqual([0]);
		});
	});

	// ========================================================================
	// Fractions that Simplify to Integers
	// ========================================================================
	describe('Fractions that Simplify to Integers', () => {
		it('should detect 10/5 (= 2)', () => {
			expect(checkReducedFractions(['\\frac{10}{5}'])).toEqual([0]);
		});

		it('should detect 9/3 (= 3)', () => {
			expect(checkReducedFractions(['\\frac{9}{3}'])).toEqual([0]);
		});

		it('should detect 20/4 (= 5)', () => {
			expect(checkReducedFractions(['\\frac{20}{4}'])).toEqual([0]);
		});

		it('should detect 100/10 (= 10)', () => {
			expect(checkReducedFractions(['\\frac{100}{10}'])).toEqual([0]);
		});

		it('should detect 0/5 (= 0) - zero numerator with non-1 denominator', () => {
			// 0/5 should be written as just 0, or at minimum 0/1
			expect(checkReducedFractions(['\\frac{0}{5}'])).toEqual([0]);
		});
	});

	// ========================================================================
	// Trivial Fractions (Denominator = 1 or n/n)
	// ========================================================================
	describe('Trivial Fractions', () => {
		it('should detect 1/1 (trivial, equals 1)', () => {
			expect(checkReducedFractions(['\\frac{1}{1}'])).toEqual([0]);
		});

		it('should detect 5/1 (trivial, equals 5)', () => {
			expect(checkReducedFractions(['\\frac{5}{1}'])).toEqual([0]);
		});

		it('should detect 10/1 (trivial)', () => {
			expect(checkReducedFractions(['\\frac{10}{1}'])).toEqual([0]);
		});

		it('should detect 2/2 (= 1)', () => {
			expect(checkReducedFractions(['\\frac{2}{2}'])).toEqual([0]);
		});

		it('should detect 7/7 (= 1)', () => {
			expect(checkReducedFractions(['\\frac{7}{7}'])).toEqual([0]);
		});

		it('should detect 100/100 (= 1)', () => {
			expect(checkReducedFractions(['\\frac{100}{100}'])).toEqual([0]);
		});
	});

	// ========================================================================
	// Negative Fractions
	// ========================================================================
	describe('Negative Fractions', () => {
		it('should detect -4/6 (negative numerator, GCD=2)', () => {
			expect(checkReducedFractions(['\\frac{-4}{6}'])).toEqual([0]);
		});

		it('should detect 4/-6 (negative denominator, GCD=2)', () => {
			expect(checkReducedFractions(['\\frac{4}{-6}'])).toEqual([0]);
		});

		it('should detect -4/-6 (both negative, GCD=2)', () => {
			expect(checkReducedFractions(['\\frac{-4}{-6}'])).toEqual([0]);
		});

		it('should detect -10/15 (GCD=5)', () => {
			expect(checkReducedFractions(['\\frac{-10}{15}'])).toEqual([0]);
		});

		it('should detect 8/-12 (GCD=4)', () => {
			expect(checkReducedFractions(['\\frac{8}{-12}'])).toEqual([0]);
		});

		it('should detect -6/-9 (both negative, GCD=3)', () => {
			expect(checkReducedFractions(['\\frac{-6}{-9}'])).toEqual([0]);
		});

		it('should accept -2/3 (already reduced)', () => {
			expect(checkReducedFractions(['\\frac{-2}{3}'])).toHaveLength(0);
		});

		it('should accept 2/-3 (already reduced)', () => {
			expect(checkReducedFractions(['\\frac{2}{-3}'])).toHaveLength(0);
		});

		it('should accept -1/2 (already reduced)', () => {
			expect(checkReducedFractions(['\\frac{-1}{2}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Parenthesized Numbers in Fractions
	// ========================================================================
	describe('Parenthesized Numbers', () => {
		it('should detect (2)/(4) - parenthesized reducible', () => {
			expect(checkReducedFractions(['\\frac{(2)}{(4)}'])).toEqual([0]);
		});

		it('should detect (-4)/(6) - parenthesized negative', () => {
			expect(checkReducedFractions(['\\frac{(-4)}{(6)}'])).toEqual([0]);
		});

		it('should detect (6)/(-9) - parenthesized negative denominator', () => {
			expect(checkReducedFractions(['\\frac{(6)}{(-9)}'])).toEqual([0]);
		});

		it('should accept (1)/(2) - parenthesized but reduced', () => {
			expect(checkReducedFractions(['\\frac{(1)}{(2)}'])).toHaveLength(0);
		});

		it('should accept (-3)/(7) - parenthesized negative reduced', () => {
			expect(checkReducedFractions(['\\frac{(-3)}{(7)}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Already Reduced Fractions
	// ========================================================================
	describe('Already Reduced Fractions', () => {
		it('should accept 1/2', () => {
			expect(checkReducedFractions(['\\frac{1}{2}'])).toHaveLength(0);
		});

		it('should accept 2/3', () => {
			expect(checkReducedFractions(['\\frac{2}{3}'])).toHaveLength(0);
		});

		it('should accept 3/4', () => {
			expect(checkReducedFractions(['\\frac{3}{4}'])).toHaveLength(0);
		});

		it('should accept 3/7 (coprime)', () => {
			expect(checkReducedFractions(['\\frac{3}{7}'])).toHaveLength(0);
		});

		it('should accept 5/7 (coprime)', () => {
			expect(checkReducedFractions(['\\frac{5}{7}'])).toHaveLength(0);
		});

		it('should accept 7/11 (both prime)', () => {
			expect(checkReducedFractions(['\\frac{7}{11}'])).toHaveLength(0);
		});

		it('should accept 13/17 (both prime)', () => {
			expect(checkReducedFractions(['\\frac{13}{17}'])).toHaveLength(0);
		});

		it('should accept 1/100', () => {
			expect(checkReducedFractions(['\\frac{1}{100}'])).toHaveLength(0);
		});

		it('should accept 99/100 (coprime)', () => {
			expect(checkReducedFractions(['\\frac{99}{100}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Fractions with Variables
	// ========================================================================
	describe('Fractions with Variables', () => {
		it('should detect 2x/4 (coefficient GCD=2)', () => {
			expect(checkReducedFractions(['\\frac{2x}{4}'])).toEqual([0]);
		});

		it('should detect 4x/8 (coefficient GCD=4)', () => {
			expect(checkReducedFractions(['\\frac{4x}{8}'])).toEqual([0]);
		});

		it('should detect 6a/9 (coefficient GCD=3)', () => {
			expect(checkReducedFractions(['\\frac{6a}{9}'])).toEqual([0]);
		});

		it('should detect 10y/15 (coefficient GCD=5)', () => {
			expect(checkReducedFractions(['\\frac{10y}{15}'])).toEqual([0]);
		});

		it('should detect -2x/4 (negative coefficient)', () => {
			expect(checkReducedFractions(['\\frac{-2x}{4}'])).toEqual([0]);
		});

		it('should accept x/2 (no numeric coefficient in numerator)', () => {
			expect(checkReducedFractions(['\\frac{x}{2}'])).toHaveLength(0);
		});

		it('should accept x/y (pure variables)', () => {
			expect(checkReducedFractions(['\\frac{x}{y}'])).toHaveLength(0);
		});

		it('should accept a/b (pure variables)', () => {
			expect(checkReducedFractions(['\\frac{a}{b}'])).toHaveLength(0);
		});

		it('should accept 3x/7 (coprime coefficient)', () => {
			expect(checkReducedFractions(['\\frac{3x}{7}'])).toHaveLength(0);
		});

		it('should accept x/3 (no coefficient to reduce)', () => {
			expect(checkReducedFractions(['\\frac{x}{3}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// dfrac Variant
	// ========================================================================
	describe('dfrac Variant', () => {
		it('should detect \\dfrac{2}{4} as non-reduced', () => {
			expect(checkReducedFractions(['\\dfrac{2}{4}'])).toEqual([0]);
		});

		it('should detect \\dfrac{6}{9} as non-reduced', () => {
			expect(checkReducedFractions(['\\dfrac{6}{9}'])).toEqual([0]);
		});

		it('should accept \\dfrac{1}{2} as reduced', () => {
			expect(checkReducedFractions(['\\dfrac{1}{2}'])).toHaveLength(0);
		});

		it('should accept \\dfrac{3}{7} as reduced', () => {
			expect(checkReducedFractions(['\\dfrac{3}{7}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Inline Division (Should NOT be checked - only \frac)
	// ========================================================================
	describe('Inline Division (not checked)', () => {
		it('should accept 2/4 inline (not a \\frac)', () => {
			expect(checkReducedFractions(['2/4'])).toHaveLength(0);
		});

		it('should accept 6/9 inline (not a \\frac)', () => {
			expect(checkReducedFractions(['6/9'])).toHaveLength(0);
		});

		it('should accept a/b inline (not a \\frac)', () => {
			expect(checkReducedFractions(['a/b'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Nested and Complex Fractions
	// ========================================================================
	describe('Nested and Complex Fractions', () => {
		it('should detect non-reduced fraction in numerator: \\frac{\\frac{2}{4}}{x}', () => {
			expect(checkReducedFractions(['\\frac{\\frac{2}{4}}{x}'])).toEqual([0]);
		});

		it('should detect non-reduced fraction in denominator: \\frac{x}{\\frac{4}{6}}', () => {
			expect(checkReducedFractions(['\\frac{x}{\\frac{4}{6}}'])).toEqual([0]);
		});

		it('should detect non-reduced in nested: \\frac{\\frac{6}{9}}{\\frac{1}{2}}', () => {
			expect(checkReducedFractions(['\\frac{\\frac{6}{9}}{\\frac{1}{2}}'])).toEqual([0]);
		});

		it('should accept nested reduced fractions: \\frac{\\frac{1}{2}}{\\frac{3}{4}}', () => {
			expect(checkReducedFractions(['\\frac{\\frac{1}{2}}{\\frac{3}{4}}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Fractions in Expressions
	// ========================================================================
	describe('Fractions in Expressions', () => {
		it('should detect in addition: x + \\frac{2}{4}', () => {
			expect(checkReducedFractions(['x + \\frac{2}{4}'])).toEqual([0]);
		});

		it('should detect in subtraction: x - \\frac{6}{9}', () => {
			expect(checkReducedFractions(['x - \\frac{6}{9}'])).toEqual([0]);
		});

		it('should detect in multiplication: 2 \\times \\frac{4}{8}', () => {
			expect(checkReducedFractions(['2 \\times \\frac{4}{8}'])).toEqual([0]);
		});

		it('should detect in complex expression: a + b + \\frac{10}{15}', () => {
			expect(checkReducedFractions(['a + b + \\frac{10}{15}'])).toEqual([0]);
		});

		it('should accept expression with reduced fraction: x + \\frac{1}{2}', () => {
			expect(checkReducedFractions(['x + \\frac{1}{2}'])).toHaveLength(0);
		});

		it('should accept polynomial with reduced fraction: x^2 + \\frac{3}{4}x + 1', () => {
			expect(checkReducedFractions(['x^2 + \\frac{3}{4}x + 1'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Fractions in Special Contexts
	// ========================================================================
	describe('Fractions in Special Contexts', () => {
		it('should detect in exponent: x^{\\frac{2}{4}}', () => {
			expect(checkReducedFractions(['x^{\\frac{2}{4}}'])).toEqual([0]);
		});

		it('should detect in sqrt: \\sqrt{\\frac{4}{8}}', () => {
			expect(checkReducedFractions(['\\sqrt{\\frac{4}{8}}'])).toEqual([0]);
		});

		it('should detect in parentheses: (\\frac{6}{9})', () => {
			expect(checkReducedFractions(['(\\frac{6}{9})'])).toEqual([0]);
		});

		it('should accept reduced in exponent: x^{\\frac{1}{2}}', () => {
			expect(checkReducedFractions(['x^{\\frac{1}{2}}'])).toHaveLength(0);
		});

		it('should accept reduced in sqrt: \\sqrt{\\frac{3}{4}}', () => {
			expect(checkReducedFractions(['\\sqrt{\\frac{3}{4}}'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Non-Fraction Inputs
	// ========================================================================
	describe('Non-Fraction Inputs', () => {
		it('should accept integer', () => {
			expect(checkReducedFractions(['2'])).toHaveLength(0);
		});

		it('should accept variable', () => {
			expect(checkReducedFractions(['x'])).toHaveLength(0);
		});

		it('should accept decimal', () => {
			expect(checkReducedFractions(['0.5'])).toHaveLength(0);
		});

		it('should accept expression without fractions', () => {
			expect(checkReducedFractions(['x + 2'])).toHaveLength(0);
		});

		it('should accept polynomial', () => {
			expect(checkReducedFractions(['x^2 + 2x + 1'])).toHaveLength(0);
		});

		it('should accept negative number', () => {
			expect(checkReducedFractions(['-5'])).toHaveLength(0);
		});
	});

	// ========================================================================
	// Multiple Answers
	// ========================================================================
	describe('Multiple Answers', () => {
		it('should return violating indices for mixed answers', () => {
			const result = checkReducedFractions([
				'\\frac{1}{2}', // reduced - OK
				'\\frac{2}{4}', // NOT reduced - violation
				'\\frac{3}{5}', // reduced - OK
				'\\frac{6}{9}' // NOT reduced - violation
			]);
			expect(result).toEqual([1, 3]);
		});

		it('should return empty array when all fractions are reduced', () => {
			const result = checkReducedFractions(['\\frac{1}{2}', '\\frac{2}{3}', '\\frac{3}{7}']);
			expect(result).toHaveLength(0);
		});

		it('should flag all indices when no fractions are reduced', () => {
			const result = checkReducedFractions(['\\frac{2}{4}', '\\frac{4}{6}', '\\frac{6}{8}']);
			expect(result).toEqual([0, 1, 2]);
		});

		it('should handle mix of fractions and non-fractions', () => {
			const result = checkReducedFractions([
				'5', // not a fraction - OK
				'\\frac{2}{4}', // NOT reduced - violation
				'x', // not a fraction - OK
				'\\frac{1}{2}' // reduced - OK
			]);
			expect(result).toEqual([1]);
		});
	});

	// ========================================================================
	// Edge Cases
	// ========================================================================
	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkReducedFractions([''])).toHaveLength(0);
		});

		it('should handle whitespace', () => {
			expect(checkReducedFractions(['  '])).toHaveLength(0);
		});

		it('should handle empty array', () => {
			expect(checkReducedFractions([])).toHaveLength(0);
		});

		it('should handle null-ish values gracefully', () => {
			expect(checkReducedFractions([null as unknown as string])).toHaveLength(0);
			expect(checkReducedFractions([undefined as unknown as string])).toHaveLength(0);
		});

		it('should handle invalid LaTeX gracefully', () => {
			expect(checkReducedFractions(['\\frac{'])).toHaveLength(0);
		});

		// Unbraced arguments are valid TeX, and MathLive emits them as soon as an
		// argument fits in one character — so 2/4 typed by a student arrives as
		// `\frac24` and must be caught like any other unreduced fraction.
		it('should catch an unreduced fraction written without braces', () => {
			expect(checkReducedFractions(['\\frac 2 4'])).toEqual([0]);
			expect(checkReducedFractions(['\\frac24'])).toEqual([0]);
		});

		it('should accept a reduced fraction written without braces', () => {
			expect(checkReducedFractions(['\\frac12'])).toHaveLength(0);
		});

		it('should handle large numbers: 1000/2000', () => {
			expect(checkReducedFractions(['\\frac{1000}{2000}'])).toEqual([0]);
		});

		it('should handle large coprime numbers: 997/1009 (both prime)', () => {
			expect(checkReducedFractions(['\\frac{997}{1009}'])).toHaveLength(0);
		});

		it('should detect 0/0 case gracefully', () => {
			// 0/0 is undefined, but if parsed, GCD(0,0) behavior
			// This should not crash
			const result = checkReducedFractions(['\\frac{0}{0}']);
			expect(Array.isArray(result)).toBe(true);
		});
	});
});
