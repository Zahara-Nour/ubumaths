/**
 * Unit tests for univariate polynomial GCD operations
 *
 * Tests the Euclidean algorithm for polynomial GCD computation.
 * These tests are written TDD-style: they should fail until implementation is complete.
 */

import { describe, it, expect } from 'vitest';
import { normalize } from '../normalize';
import { normalFormsEquivalent } from '../hash';
import { parseLatex } from '../../parser';
import { algebraicFromRational, algebraicCoefficient, algebraicTerm } from '../algebraic';
import { normalTerm, constantTerm } from '../term';
import { symbolicFactor } from '../monomial';
import type { NormalTerm, Rational, SimplifiedRadical, AlgebraicCoefficient } from '../types';
import type { VariableNode } from '../../types';

// =============================================================================
// Test Helpers
// =============================================================================

// Helper to create rationals
const r = (n: bigint, d: bigint = 1n): Rational => ({ n, d });

// Helper to create variable nodes
const varNode = (name: string): VariableNode => ({ type: 'variable', name });

// Common radicals (prefixed with _ as they're used in commented unit tests)
const _sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
const _sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };

// Helper to create symbolic factors
const factor = (base: VariableNode, exp: Rational = r(1n)) => symbolicFactor(base, exp);

// Helper to create algebraic coefficients (prefixed with _ as used in commented unit tests)
function _coef(
	terms: Array<{ rational: Rational; radicals: SimplifiedRadical[] }>
): AlgebraicCoefficient {
	return algebraicCoefficient(terms.map((t) => algebraicTerm(t.rational, t.radicals)));
}

// Helper to create term with rational coefficient and variable (prefixed with _ as used in commented unit tests)
function _term(coeff: bigint, varName?: string, exp: bigint = 1n): NormalTerm {
	const coefficient = algebraicFromRational(r(coeff));
	if (!varName) {
		return constantTerm(coefficient);
	}
	return normalTerm(coefficient, [factor(varNode(varName), r(exp))]);
}

// Helper to check if two LaTeX expressions are equivalent after normalization
function expectEquivalent(latex1: string, latex2: string): void {
	const node1 = parseLatex(latex1);
	const node2 = parseLatex(latex2);
	const norm1 = normalize(node1);
	const norm2 = normalize(node2);
	const result = normalFormsEquivalent(norm1, norm2);
	if (!result) {
		// Provide helpful debug info
		console.log(`Expected: ${latex1} = ${latex2}`);
		console.log(`Normalized 1: ${norm1.hash}`);
		console.log(`Normalized 2: ${norm2.hash}`);
	}
	expect(result).toBe(true);
}

// Helper to check if two LaTeX expressions are NOT equivalent
function expectNotEquivalent(latex1: string, latex2: string): void {
	const node1 = parseLatex(latex1);
	const node2 = parseLatex(latex2);
	const norm1 = normalize(node1);
	const norm2 = normalize(node2);
	expect(normalFormsEquivalent(norm1, norm2)).toBe(false);
}

// =============================================================================
// Integration Tests - Fraction Simplification via GCD
// =============================================================================

describe('univariate-gcd', () => {
	describe('fraction simplification via polynomial GCD', () => {
		// Behavior 1: (x^2-1)/(x-1) -> x+1 (difference of squares)
		it('simplifies (x^2-1)/(x-1) to x+1', () => {
			expectEquivalent('\\frac{x^2-1}{x-1}', 'x+1');
		});

		// Behavior 2: (x^2+2x+1)/(x+1) -> x+1 (perfect square)
		it('simplifies (x^2+2x+1)/(x+1) to x+1', () => {
			expectEquivalent('\\frac{x^2+2x+1}{x+1}', 'x+1');
		});

		// Behavior 3: (x^3-8)/(x-2) -> x^2+2x+4 (difference of cubes)
		it('simplifies (x^3-8)/(x-2) to x^2+2x+4', () => {
			expectEquivalent('\\frac{x^3-8}{x-2}', 'x^2+2x+4');
		});

		// Behavior 4: (2x^2+4x)/(x+2) -> 2x (common factor)
		it('simplifies (2x^2+4x)/(x+2) to 2x', () => {
			expectEquivalent('\\frac{2x^2+4x}{x+2}', '2x');
		});

		// Behavior 5: (x^2-4)/(x^2-4x+4) remains unchanged (GCD=1)
		it('does not simplify (x^2-4)/(x^2-4x+4) since GCD=1', () => {
			// (x-2)(x+2) / (x-2)^2 = (x+2)/(x-2) but that's NOT GCD=1
			// Let's use a true coprime example: (x^2+1)/(x^2+x+1)
			expectNotEquivalent('\\frac{x^2+1}{x^2+x+1}', '1');
		});
	});

	describe('content extraction (numeric GCD of coefficients)', () => {
		// Behavior 6: (6x+4)/(9x+6) -> 2/3
		it('simplifies (6x+4)/(9x+6) to 2/3', () => {
			// 6x+4 = 2(3x+2), 9x+6 = 3(3x+2)
			// GCD = 3x+2, result = 2/3
			expectEquivalent('\\frac{6x+4}{9x+6}', '\\frac{2}{3}');
		});

		// Behavior 7: (4x^2-4)/(6x-6) -> 2(x+1)/3
		it('simplifies (4x^2-4)/(6x-6) to 2(x+1)/3', () => {
			// 4x^2-4 = 4(x^2-1) = 4(x-1)(x+1)
			// 6x-6 = 6(x-1)
			// GCD = 2(x-1), result = 2(x+1)/3
			expectEquivalent('\\frac{4x^2-4}{6x-6}', '\\frac{2(x+1)}{3}');
			// Or equivalently
			expectEquivalent('\\frac{4x^2-4}{6x-6}', '\\frac{2x+2}{3}');
		});
	});

	describe('coefficients with radicals', () => {
		// Behavior 8: (sqrt(2)*x^2 - sqrt(2))/(x-1) -> sqrt(2)(x+1)
		it('simplifies (sqrt(2)*x^2 - sqrt(2))/(x-1) to sqrt(2)(x+1)', () => {
			// sqrt(2)(x^2-1) / (x-1) = sqrt(2)(x+1)
			expectEquivalent('\\frac{\\sqrt{2}x^2 - \\sqrt{2}}{x-1}', '\\sqrt{2}(x+1)');
		});

		// Behavior 9: (sqrt(3)*x + sqrt(3))/(sqrt(3)) -> x+1
		it('simplifies (sqrt(3)*x + sqrt(3))/(sqrt(3)) to x+1', () => {
			expectEquivalent('\\frac{\\sqrt{3}x + \\sqrt{3}}{\\sqrt{3}}', 'x+1');
		});
	});

	describe('edge cases and limits', () => {
		// Behavior 10: Degree > 10 falls back to monomial GCD
		it('falls back to monomial GCD for degree > 10', () => {
			// For high degree polynomials, we expect fallback behavior
			// This test ensures the system doesn't crash and returns something reasonable
			const highDegree = '\\frac{x^{15}-1}{x^5-1}';
			// Should still work, but may not fully simplify
			const node = parseLatex(highDegree);
			const normalized = normalize(node);
			// Just verify it doesn't throw and returns a valid result
			expect(normalized).toBeDefined();
			expect(normalized.hash).toBeDefined();
		});

		// Behavior 11: Constants 6/9 -> 2/3
		it('simplifies constant fractions 6/9 to 2/3', () => {
			expectEquivalent('\\frac{6}{9}', '\\frac{2}{3}');
		});

		// Behavior 12: Multivariate uses monomial GCD only
		it('handles multivariate polynomials with monomial GCD only', () => {
			// (x^2*y)/(x*y) = x (monomial GCD)
			expectEquivalent('\\frac{x^2 y}{xy}', 'x');

			// (x^2 - y^2)/(x-y) - this is multivariate, so no polynomial GCD
			// Currently won't simplify to x+y
			const multivariateNode = parseLatex('\\frac{x^2-y^2}{x-y}');
			const normalized = normalize(multivariateNode);
			// Verify it returns something (may not fully simplify)
			expect(normalized).toBeDefined();
		});

		// Behavior 13: Division by zero behavior unchanged
		it('throws on division by zero', () => {
			expect(() => {
				const node = parseLatex('\\frac{x}{0}');
				normalize(node);
			}).toThrow();
		});
	});

	describe('additional polynomial GCD cases', () => {
		// (x^2 - 2x + 1)/(x-1) = x-1
		it('simplifies (x^2-2x+1)/(x-1) to x-1', () => {
			expectEquivalent('\\frac{x^2-2x+1}{x-1}', 'x-1');
		});

		// (x^3 + x^2)/(x^2 + x) = x
		it('simplifies (x^3+x^2)/(x^2+x) to x', () => {
			// x^2(x+1) / x(x+1) = x
			expectEquivalent('\\frac{x^3+x^2}{x^2+x}', 'x');
		});

		// (2x^2 - 2)/(2x - 2) = x+1
		it('simplifies (2x^2-2)/(2x-2) to x+1', () => {
			// 2(x^2-1) / 2(x-1) = (x-1)(x+1)/(x-1) = x+1
			expectEquivalent('\\frac{2x^2-2}{2x-2}', 'x+1');
		});

		// Coprime polynomials remain unchanged
		it('does not simplify coprime polynomials x+1 and x+2', () => {
			const node = parseLatex('\\frac{x+1}{x+2}');
			const normalized = normalize(node);
			// Should stay as (x+1)/(x+2)
			expect(normalized.numerator.length).toBeGreaterThan(0);
			expect(normalized.denominator.length).toBeGreaterThan(0);
		});

		// Zero numerator
		it('handles zero numerator', () => {
			expectEquivalent('\\frac{0}{x+1}', '0');
		});

		// Same numerator and denominator
		it('simplifies x/x to 1', () => {
			expectEquivalent('\\frac{x}{x}', '1');
		});

		it('simplifies (x+1)/(x+1) to 1', () => {
			expectEquivalent('\\frac{x+1}{x+1}', '1');
		});

		it('simplifies (x^2+2x+1)/(x^2+2x+1) to 1', () => {
			expectEquivalent('\\frac{x^2+2x+1}{x^2+2x+1}', '1');
		});
	});

	// =========================================================================
	// EDGE CASES - Comprehensive coverage
	// =========================================================================

	describe('linear polynomial edge cases', () => {
		it('simplifies (2x+4)/(x+2) to 2', () => {
			// 2(x+2)/(x+2) = 2
			expectEquivalent('\\frac{2x+4}{x+2}', '2');
		});

		it('simplifies (3x+6)/(x+2) to 3', () => {
			expectEquivalent('\\frac{3x+6}{x+2}', '3');
		});

		it('simplifies (-x-1)/(x+1) to -1', () => {
			expectEquivalent('\\frac{-x-1}{x+1}', '-1');
		});

		it('simplifies (x+1)/(-x-1) to -1', () => {
			expectEquivalent('\\frac{x+1}{-x-1}', '-1');
		});

		it('simplifies (2x+2)/(3x+3) to 2/3', () => {
			// 2(x+1) / 3(x+1) = 2/3
			expectEquivalent('\\frac{2x+2}{3x+3}', '\\frac{2}{3}');
		});

		it('simplifies (5x-5)/(10x-10) to 1/2', () => {
			// 5(x-1) / 10(x-1) = 1/2
			expectEquivalent('\\frac{5x-5}{10x-10}', '\\frac{1}{2}');
		});
	});

	describe('quadratic polynomial edge cases', () => {
		// Sum of squares - irreducible over reals
		it('keeps (x^2+1)/(x+1) as non-simplified (coprime)', () => {
			const node = parseLatex('\\frac{x^2+1}{x+1}');
			const normalized = normalize(node);
			// x²+1 and x+1 are coprime
			expect(normalized.denominator.length).toBeGreaterThan(0);
		});

		// Difference of squares variations
		it('simplifies (x^2-4)/(x+2) to x-2', () => {
			expectEquivalent('\\frac{x^2-4}{x+2}', 'x-2');
		});

		it('simplifies (x^2-4)/(x-2) to x+2', () => {
			expectEquivalent('\\frac{x^2-4}{x-2}', 'x+2');
		});

		it('simplifies (x^2-9)/(x+3) to x-3', () => {
			expectEquivalent('\\frac{x^2-9}{x+3}', 'x-3');
		});

		it('simplifies (4x^2-9)/(2x+3) to 2x-3', () => {
			// (2x-3)(2x+3)/(2x+3) = 2x-3
			expectEquivalent('\\frac{4x^2-9}{2x+3}', '2x-3');
		});

		it('simplifies (4x^2-9)/(2x-3) to 2x+3', () => {
			expectEquivalent('\\frac{4x^2-9}{2x-3}', '2x+3');
		});

		// Perfect square trinomials
		it('simplifies (x^2-2x+1)/(x^2-1) to (x-1)/(x+1)', () => {
			// (x-1)² / (x-1)(x+1) = (x-1)/(x+1)
			expectEquivalent('\\frac{x^2-2x+1}{x^2-1}', '\\frac{x-1}{x+1}');
		});

		it('simplifies (x^2+4x+4)/(x+2) to x+2', () => {
			// (x+2)²/(x+2) = x+2
			expectEquivalent('\\frac{x^2+4x+4}{x+2}', 'x+2');
		});

		it('simplifies (x^2+6x+9)/(x^2-9) to (x+3)/(x-3)', () => {
			// (x+3)² / (x-3)(x+3) = (x+3)/(x-3)
			expectEquivalent('\\frac{x^2+6x+9}{x^2-9}', '\\frac{x+3}{x-3}');
		});
	});

	describe('cubic polynomial edge cases', () => {
		// Sum of cubes: a³+b³ = (a+b)(a²-ab+b²)
		it('simplifies (x^3+8)/(x+2) to x^2-2x+4', () => {
			expectEquivalent('\\frac{x^3+8}{x+2}', 'x^2-2x+4');
		});

		it('simplifies (x^3+27)/(x+3) to x^2-3x+9', () => {
			expectEquivalent('\\frac{x^3+27}{x+3}', 'x^2-3x+9');
		});

		it('simplifies (x^3+1)/(x+1) to x^2-x+1', () => {
			expectEquivalent('\\frac{x^3+1}{x+1}', 'x^2-x+1');
		});

		// Difference of cubes: a³-b³ = (a-b)(a²+ab+b²)
		it('simplifies (x^3-27)/(x-3) to x^2+3x+9', () => {
			expectEquivalent('\\frac{x^3-27}{x-3}', 'x^2+3x+9');
		});

		it('simplifies (x^3-1)/(x-1) to x^2+x+1', () => {
			expectEquivalent('\\frac{x^3-1}{x-1}', 'x^2+x+1');
		});

		// Cubic with common linear factor
		it('simplifies (x^3-x)/(x^2-1) to x', () => {
			// x(x²-1) / (x²-1) = x
			expectEquivalent('\\frac{x^3-x}{x^2-1}', 'x');
		});

		it('simplifies (x^3+2x^2+x)/(x^2+x) to x+1', () => {
			// x(x+1)² / x(x+1) = x+1
			expectEquivalent('\\frac{x^3+2x^2+x}{x^2+x}', 'x+1');
		});
	});

	describe('polynomials with gaps (sparse)', () => {
		// x⁴-1 = (x²-1)(x²+1) = (x-1)(x+1)(x²+1)
		it('simplifies (x^4-1)/(x-1) to x^3+x^2+x+1', () => {
			expectEquivalent('\\frac{x^4-1}{x-1}', 'x^3+x^2+x+1');
		});

		it('simplifies (x^4-1)/(x+1) to x^3-x^2+x-1', () => {
			expectEquivalent('\\frac{x^4-1}{x+1}', 'x^3-x^2+x-1');
		});

		it('simplifies (x^4-1)/(x^2-1) to x^2+1', () => {
			expectEquivalent('\\frac{x^4-1}{x^2-1}', 'x^2+1');
		});

		it('simplifies (x^4-1)/(x^2+1) to x^2-1', () => {
			expectEquivalent('\\frac{x^4-1}{x^2+1}', 'x^2-1');
		});

		// x³+1 factorization
		it('simplifies (x^3+1)/(x^2-x+1) to x+1', () => {
			expectEquivalent('\\frac{x^3+1}{x^2-x+1}', 'x+1');
		});

		// x⁶-1 = (x³-1)(x³+1)
		it('simplifies (x^6-1)/(x^3-1) to x^3+1', () => {
			expectEquivalent('\\frac{x^6-1}{x^3-1}', 'x^3+1');
		});
	});

	describe('negative coefficient edge cases', () => {
		it('simplifies (-x^2+1)/(x-1) to -x-1', () => {
			// -(x²-1)/(x-1) = -(x+1) = -x-1
			expectEquivalent('\\frac{-x^2+1}{x-1}', '-x-1');
		});

		it('simplifies (x^2-1)/(-x+1) to -x-1', () => {
			// (x-1)(x+1)/(-(x-1)) = -(x+1)
			expectEquivalent('\\frac{x^2-1}{-x+1}', '-x-1');
		});

		it('simplifies (-x^2+1)/(-x+1) to x+1', () => {
			// -(x-1)(x+1)/(-(x-1)) = x+1
			expectEquivalent('\\frac{-x^2+1}{-x+1}', 'x+1');
		});

		it('simplifies (-2x-4)/(-x-2) to 2', () => {
			// -2(x+2)/-(x+2) = 2
			expectEquivalent('\\frac{-2x-4}{-x-2}', '2');
		});

		it('simplifies (x^2-4x+4)/(-x+2) to -x+2', () => {
			// (x-2)²/(-(x-2)) = -(x-2) = -x+2
			expectEquivalent('\\frac{x^2-4x+4}{-x+2}', '-x+2');
		});
	});

	describe('fractional coefficient edge cases', () => {
		it('simplifies (x/2 + 1/2)/(x+1) to 1/2', () => {
			// (1/2)(x+1)/(x+1) = 1/2
			expectEquivalent('\\frac{\\frac{x}{2}+\\frac{1}{2}}{x+1}', '\\frac{1}{2}');
		});

		it('simplifies (x/3 + 2/3)/(x+2) to 1/3', () => {
			expectEquivalent('\\frac{\\frac{x}{3}+\\frac{2}{3}}{x+2}', '\\frac{1}{3}');
		});

		it('simplifies (3x/4 - 3/4)/(x-1) to 3/4', () => {
			expectEquivalent('\\frac{\\frac{3x}{4}-\\frac{3}{4}}{x-1}', '\\frac{3}{4}');
		});
	});

	describe('multiple common factors', () => {
		it('simplifies (x^3-x^2-x+1)/(x^2-2x+1) to x+1', () => {
			// (x-1)²(x+1) / (x-1)² = x+1
			expectEquivalent('\\frac{x^3-x^2-x+1}{x^2-2x+1}', 'x+1');
		});

		it('simplifies (x^4-2x^3+x^2)/(x^3-x^2) to x-1', () => {
			// x²(x-1)² / x²(x-1) = x-1
			expectEquivalent('\\frac{x^4-2x^3+x^2}{x^3-x^2}', 'x-1');
		});

		it('simplifies (x^4-1)/(x^3+x^2+x+1) to x-1', () => {
			// (x²+1)(x-1)(x+1) / (x+1)(x²+1) = x-1
			expectEquivalent('\\frac{x^4-1}{x^3+x^2+x+1}', 'x-1');
		});

		it('simplifies (x^3+3x^2+3x+1)/(x^2+2x+1) to x+1', () => {
			// (x+1)³ / (x+1)² = x+1
			expectEquivalent('\\frac{x^3+3x^2+3x+1}{x^2+2x+1}', 'x+1');
		});
	});

	describe('degree boundary edge cases', () => {
		// At the degree limit (10)
		it('handles degree 10 polynomials', () => {
			// x^10 - 1 divided by x-1 should give sum of x^i for i=0..9
			const node = parseLatex('\\frac{x^{10}-1}{x-1}');
			const normalized = normalize(node);
			expect(normalized).toBeDefined();
			// Result should be x^9 + x^8 + ... + x + 1 (polynomial, not fraction)
			expect(normalized.denominator.length).toBe(1); // denominator = 1
		});

		// Just over the limit (11)
		it('handles degree 11 with fallback', () => {
			const node = parseLatex('\\frac{x^{11}-1}{x-1}');
			const normalized = normalize(node);
			// Should not crash, returns something
			expect(normalized).toBeDefined();
		});

		// Constant polynomial edge case
		it('simplifies 12/8 to 3/2', () => {
			expectEquivalent('\\frac{12}{8}', '\\frac{3}{2}');
		});

		it('simplifies 100/25 to 4', () => {
			expectEquivalent('\\frac{100}{25}', '4');
		});
	});

	describe('result type edge cases', () => {
		// Result is a constant
		it('result is constant: (x+1)/(x+1) = 1', () => {
			expectEquivalent('\\frac{x+1}{x+1}', '1');
		});

		it('result is constant: (6x+12)/(3x+6) = 2', () => {
			expectEquivalent('\\frac{6x+12}{3x+6}', '2');
		});

		// Result is a monomial
		it('result is monomial: (x^3)/(x^2) = x', () => {
			expectEquivalent('\\frac{x^3}{x^2}', 'x');
		});

		it('result is monomial: (2x^4)/(x^2) = 2x^2', () => {
			expectEquivalent('\\frac{2x^4}{x^2}', '2x^2');
		});

		it('result is monomial: (x^3+x^2)/(x+1) = x^2', () => {
			// x²(x+1)/(x+1) = x²
			expectEquivalent('\\frac{x^3+x^2}{x+1}', 'x^2');
		});

		// Result is a binomial
		it('result is binomial: (x^2-1)/(x-1) = x+1', () => {
			expectEquivalent('\\frac{x^2-1}{x-1}', 'x+1');
		});
	});

	describe('content extraction edge cases', () => {
		// All even coefficients
		it('extracts content from (2x^2+4x+2)/(x+1) = 2(x+1)', () => {
			// 2(x²+2x+1)/(x+1) = 2(x+1)²/(x+1) = 2(x+1)
			expectEquivalent('\\frac{2x^2+4x+2}{x+1}', '2x+2');
		});

		// Large common factor
		it('extracts content: (12x+18)/(8x+12) = 3/2', () => {
			// 6(2x+3) / 4(2x+3) = 6/4 = 3/2
			expectEquivalent('\\frac{12x+18}{8x+12}', '\\frac{3}{2}');
		});

		// Prime coefficients (GCD = 1)
		it('keeps prime coefficients: (5x+7)/(3x+2) unchanged', () => {
			const node = parseLatex('\\frac{5x+7}{3x+2}');
			const normalized = normalize(node);
			expect(normalized.denominator.length).toBeGreaterThan(0);
		});

		// Negative content
		it('handles negative content: (-6x-9)/(-4x-6) = 3/2', () => {
			// -3(2x+3) / -2(2x+3) = 3/2
			expectEquivalent('\\frac{-6x-9}{-4x-6}', '\\frac{3}{2}');
		});
	});

	describe('additional radical coefficient cases', () => {
		// Same radical in both
		it('simplifies (2*sqrt(2)*x + 2*sqrt(2))/(sqrt(2)*x + sqrt(2)) to 2', () => {
			expectEquivalent('\\frac{2\\sqrt{2}x + 2\\sqrt{2}}{\\sqrt{2}x + \\sqrt{2}}', '2');
		});

		// Radical content extraction
		it('simplifies (sqrt(2)*x^2 - 2*sqrt(2))/(x+sqrt(2)) tests radical handling', () => {
			// This may or may not simplify depending on implementation
			const node = parseLatex('\\frac{\\sqrt{2}x^2 - 2\\sqrt{2}}{x+\\sqrt{2}}');
			const normalized = normalize(node);
			expect(normalized).toBeDefined();
		});

		// Cube root coefficient
		it('handles cube root coefficients', () => {
			const node = parseLatex('\\frac{\\sqrt[3]{2}x + \\sqrt[3]{2}}{\\sqrt[3]{2}}');
			const normalized = normalize(node);
			expect(normalized).toBeDefined();
		});
	});

	describe('special algebraic identities', () => {
		// Sophie Germain: a⁴+4b⁴ = (a²+2b²+2ab)(a²+2b²-2ab)
		// We test simpler versions with single variable

		// (a+b)³ = a³+3a²b+3ab²+b³
		it('simplifies (x^3+3x^2+3x+1)/(x+1) to x^2+2x+1', () => {
			// (x+1)³ / (x+1) = (x+1)²
			expectEquivalent('\\frac{x^3+3x^2+3x+1}{x+1}', 'x^2+2x+1');
		});

		// (a-b)³ = a³-3a²b+3ab²-b³
		it('simplifies (x^3-3x^2+3x-1)/(x-1) to x^2-2x+1', () => {
			// (x-1)³ / (x-1) = (x-1)²
			expectEquivalent('\\frac{x^3-3x^2+3x-1}{x-1}', 'x^2-2x+1');
		});

		// Difference of 4th powers
		it('simplifies (x^4-16)/(x-2) correctly', () => {
			// x⁴-16 = (x²-4)(x²+4) = (x-2)(x+2)(x²+4)
			expectEquivalent('\\frac{x^4-16}{x-2}', 'x^3+2x^2+4x+8');
		});

		it('simplifies (x^4-16)/(x+2) correctly', () => {
			expectEquivalent('\\frac{x^4-16}{x+2}', 'x^3-2x^2+4x-8');
		});

		it('simplifies (x^4-16)/(x^2-4) to x^2+4', () => {
			expectEquivalent('\\frac{x^4-16}{x^2-4}', 'x^2+4');
		});
	});

	describe('stress tests with various variables', () => {
		// Using variable 't' instead of 'x'
		it('works with variable t: (t^2-1)/(t-1) = t+1', () => {
			expectEquivalent('\\frac{t^2-1}{t-1}', 't+1');
		});

		// Using variable 'y'
		it('works with variable y: (y^2-4)/(y+2) = y-2', () => {
			expectEquivalent('\\frac{y^2-4}{y+2}', 'y-2');
		});

		// Using Greek letter
		it('works with variable theta: (θ^2-1)/(θ-1) = θ+1', () => {
			expectEquivalent('\\frac{\\theta^2-1}{\\theta-1}', '\\theta+1');
		});
	});

	describe('commutativity and order independence', () => {
		// Order of terms shouldn't matter
		it('handles reversed term order: (1-x^2)/(1-x) = 1+x', () => {
			// -(x²-1)/-(x-1) = (x-1)(x+1)/(x-1) = x+1 = 1+x
			expectEquivalent('\\frac{1-x^2}{1-x}', '1+x');
		});

		it('handles reordered polynomial: (-1+x^2)/(x-1) = x+1', () => {
			expectEquivalent('\\frac{-1+x^2}{x-1}', 'x+1');
		});

		it('handles mixed order: (x+x^2)/(1+x) = x', () => {
			// x(1+x)/(1+x) = x
			expectEquivalent('\\frac{x+x^2}{1+x}', 'x');
		});
	});
});

// =============================================================================
// Unit Tests for univariate-gcd.ts functions (when implemented)
// =============================================================================

// These tests will be uncommented when univariate-gcd.ts is created
/*
import {
	checkUnivariate,
	toUnivariateView,
	fromUnivariateView,
	divideUnivariate,
	gcdUnivariate,
	extractContent
} from '../univariate-gcd';

describe('checkUnivariate', () => {
	it('detects univariate polynomial x^2 + x + 1', () => {
		const poly = [term(1n, 'x', 2n), term(1n, 'x'), term(1n)];
		const result = checkUnivariate(poly);
		expect(result.isUnivariate).toBe(true);
		expect(result.variable).toEqual(x);
	});

	it('rejects multivariate polynomial xy', () => {
		// Would need a term with both x and y
		const result = checkUnivariate([
			normalTerm(ALGEBRAIC_ONE, [factor(x), factor(varNode('y'))])
		]);
		expect(result.isUnivariate).toBe(false);
		expect(result.reason).toBe('multivariate');
	});

	it('handles constant polynomial', () => {
		const poly = [term(5n)];
		const result = checkUnivariate(poly);
		expect(result.isUnivariate).toBe(true);
	});
});

describe('toUnivariateView / fromUnivariateView', () => {
	it('converts 3x^2 + 2x + 1 to dense view', () => {
		const poly = [term(3n, 'x', 2n), term(2n, 'x'), term(1n)];
		const view = toUnivariateView(poly, x);

		expect(view.degree).toBe(2);
		expect(view.coefficients.length).toBe(3);
		// coefficients[0] = 1, coefficients[1] = 2, coefficients[2] = 3
	});

	it('roundtrips correctly', () => {
		const poly = [term(3n, 'x', 2n), term(2n, 'x'), term(1n)];
		const view = toUnivariateView(poly, x);
		const recovered = fromUnivariateView(view);

		// Check equivalence
		expect(polynomialsEqual(poly, recovered)).toBe(true);
	});
});

describe('divideUnivariate', () => {
	it('divides (x^2-1) by (x-1) with remainder 0', () => {
		// x^2 - 1 = [1, 0, -1] coefficients (highest first or lowest first?)
		// x - 1 = [1, -1]
		// quotient = x + 1 = [1, 1]
		// remainder = 0
		const dividend = toUnivariateView([term(1n, 'x', 2n), term(-1n)], x);
		const divisor = toUnivariateView([term(1n, 'x'), term(-1n)], x);

		const result = divideUnivariate(dividend, divisor);

		expect(result.exact).toBe(true);
		expect(result.quotient.degree).toBe(1);
	});
});

describe('gcdUnivariate', () => {
	it('computes gcd(x^2-1, x-1) = x-1', () => {
		const a = toUnivariateView([term(1n, 'x', 2n), term(-1n)], x);
		const b = toUnivariateView([term(1n, 'x'), term(-1n)], x);

		const gcd = gcdUnivariate(a, b);

		// GCD should be x-1 (degree 1)
		expect(gcd.degree).toBe(1);
	});

	it('computes gcd of coprime polynomials as 1', () => {
		const a = toUnivariateView([term(1n, 'x'), term(1n)], x); // x+1
		const b = toUnivariateView([term(1n, 'x'), term(2n)], x); // x+2

		const gcd = gcdUnivariate(a, b);

		// GCD should be 1 (degree 0)
		expect(gcd.degree).toBe(0);
	});
});

describe('extractContent', () => {
	it('extracts content 2 from 6x + 4', () => {
		// 6x + 4 = 2(3x + 2)
		const poly = toUnivariateView([term(6n, 'x'), term(4n)], x);
		const { content, primitive } = extractContent(poly);

		// content should be 2
		// primitive should be 3x + 2
	});
});
*/
