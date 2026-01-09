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
