/**
 * Unit tests for polynomial operations module
 */

import { describe, it, expect } from 'vitest';
import {
	// Constants
	ZERO_POLYNOMIAL,
	ONE_POLYNOMIAL,
	// Operations
	collectLikeTerms,
	addPolynomials,
	subPolynomials,
	negPolynomial,
	mulPolynomials,
	powPolynomial,
	// Predicates
	isZeroPolynomial,
	isOnePolynomial,
	isConstantPolynomial,
	polynomialsEqual,
	// Degree
	polynomialDegree,
	leadingTerm,
	// Conversion
	polynomialToString
} from '../polynomial';
import { normalTerm, constantTerm } from '../term';
import {
	algebraicFromRational,
	algebraicCoefficient,
	algebraicTerm,
	ALGEBRAIC_ONE
} from '../algebraic';
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

// Common variables
const x = varNode('x');
const y = varNode('y');
const _a = varNode('a');
const _b = varNode('b');

// Common radicals
const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };

// Helper to create symbolic factors
const factor = (base: VariableNode, exp: Rational = r(1n)) => symbolicFactor(base, exp);

// Helper to create algebraic coefficients
function coef(
	terms: Array<{ rational: Rational; radicals: SimplifiedRadical[] }>
): AlgebraicCoefficient {
	return algebraicCoefficient(terms.map((t) => algebraicTerm(t.rational, t.radicals)));
}

// Helper to create term with rational coefficient and variable
function term(coeff: bigint, varName?: string, exp: bigint = 1n): NormalTerm {
	const coefficient = algebraicFromRational(r(coeff));
	if (!varName) {
		return constantTerm(coefficient);
	}
	return normalTerm(coefficient, [factor(varNode(varName), r(exp))]);
}

describe('polynomial', () => {
	// ===========================================================================
	// Constants
	// ===========================================================================

	describe('constants', () => {
		it('ZERO_POLYNOMIAL is empty', () => {
			expect(ZERO_POLYNOMIAL.length).toBe(0);
		});

		it('ONE_POLYNOMIAL has single term 1', () => {
			expect(ONE_POLYNOMIAL.length).toBe(1);
			expect(ONE_POLYNOMIAL[0].monomial.length).toBe(0);
		});
	});

	// ===========================================================================
	// Collect Like Terms
	// ===========================================================================

	describe('collectLikeTerms', () => {
		it('2x + 3x = 5x', () => {
			const terms = [term(2n, 'x'), term(3n, 'x')];
			const result = collectLikeTerms(terms);
			expect(result.length).toBe(1);
			expect(result[0].coefficient.terms[0].rational.n).toBe(5n);
		});

		it('keeps different variables separate', () => {
			const terms = [term(2n, 'x'), term(3n, 'y')];
			const result = collectLikeTerms(terms);
			expect(result.length).toBe(2);
		});

		it('eliminates zero coefficients', () => {
			const terms = [term(3n, 'x'), term(-3n, 'x')];
			const result = collectLikeTerms(terms);
			expect(result.length).toBe(0);
		});

		it('sorts result canonically', () => {
			const terms = [term(1n, 'y'), term(1n, 'x', 2n), term(1n, 'x')];
			const result = collectLikeTerms(terms);
			// x^2 first (degree 2), then x and y (degree 1, alphabetical)
			expect(result[0].monomial[0].exponent.n).toBe(2n);
		});

		it('handles empty input', () => {
			expect(collectLikeTerms([]).length).toBe(0);
		});

		it('sqrt(2)*x + sqrt(3)*x = (sqrt(2)+sqrt(3))*x', () => {
			const coeff1 = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const coeff2 = coef([{ rational: r(1n), radicals: [sqrt3] }]);
			const terms = [normalTerm(coeff1, [factor(x)]), normalTerm(coeff2, [factor(x)])];
			const result = collectLikeTerms(terms);
			expect(result.length).toBe(1);
			expect(result[0].coefficient.terms.length).toBe(2);
		});
	});

	// ===========================================================================
	// Addition
	// ===========================================================================

	describe('addPolynomials', () => {
		it('(2x + 3) + (3x + 1) = 5x + 4', () => {
			const p1 = [term(2n, 'x'), term(3n)];
			const p2 = [term(3n, 'x'), term(1n)];
			const result = addPolynomials(p1, p2);

			// Should have x term and constant
			const xTerm = result.find((t) => t.monomial.length > 0);
			const constTerm = result.find((t) => t.monomial.length === 0);
			expect(xTerm?.coefficient.terms[0].rational.n).toBe(5n);
			expect(constTerm?.coefficient.terms[0].rational.n).toBe(4n);
		});

		it('adding zero returns same polynomial', () => {
			const p = [term(3n, 'x'), term(2n)];
			expect(addPolynomials(p, ZERO_POLYNOMIAL)).toEqual(p);
			expect(addPolynomials(ZERO_POLYNOMIAL, p)).toEqual(p);
		});

		it('adding inverse gives zero', () => {
			const p = [term(3n, 'x'), term(2n)];
			const neg = negPolynomial(p);
			const result = addPolynomials(p, neg);
			expect(result.length).toBe(0);
		});
	});

	// ===========================================================================
	// Subtraction
	// ===========================================================================

	describe('subPolynomials', () => {
		it('(5x + 3) - (2x + 1) = 3x + 2', () => {
			const p1 = [term(5n, 'x'), term(3n)];
			const p2 = [term(2n, 'x'), term(1n)];
			const result = subPolynomials(p1, p2);

			const xTerm = result.find((t) => t.monomial.length > 0);
			const constTerm = result.find((t) => t.monomial.length === 0);
			expect(xTerm?.coefficient.terms[0].rational.n).toBe(3n);
			expect(constTerm?.coefficient.terms[0].rational.n).toBe(2n);
		});

		it('p - p = 0', () => {
			const p = [term(3n, 'x'), term(2n)];
			const result = subPolynomials(p, p);
			expect(result.length).toBe(0);
		});

		it('subtracting zero returns same', () => {
			const p = [term(3n, 'x')];
			expect(subPolynomials(p, ZERO_POLYNOMIAL)).toEqual(p);
		});
	});

	// ===========================================================================
	// Negation
	// ===========================================================================

	describe('negPolynomial', () => {
		it('negates all terms', () => {
			const p = [term(3n, 'x'), term(2n)];
			const result = negPolynomial(p);
			expect(result[0].coefficient.terms[0].rational.n).toBe(-3n);
			expect(result[1].coefficient.terms[0].rational.n).toBe(-2n);
		});

		it('negating empty returns empty', () => {
			expect(negPolynomial(ZERO_POLYNOMIAL).length).toBe(0);
		});

		it('double negation gives original', () => {
			const p = [term(3n, 'x'), term(2n)];
			const result = negPolynomial(negPolynomial(p));
			expect(polynomialsEqual(p, result)).toBe(true);
		});
	});

	// ===========================================================================
	// Multiplication
	// ===========================================================================

	describe('mulPolynomials', () => {
		it('(x + 1) * (x - 1) = x^2 - 1', () => {
			const p1 = [term(1n, 'x'), term(1n)];
			const p2 = [term(1n, 'x'), term(-1n)];
			const result = mulPolynomials(p1, p2);

			// Should have x^2 and -1
			expect(result.length).toBe(2);
			const x2Term = result.find((t) => t.monomial.length > 0 && t.monomial[0].exponent.n === 2n);
			const constTerm = result.find((t) => t.monomial.length === 0);
			expect(x2Term?.coefficient.terms[0].rational.n).toBe(1n);
			expect(constTerm?.coefficient.terms[0].rational.n).toBe(-1n);
		});

		it('(a + b)^2 = a^2 + 2ab + b^2', () => {
			// Note: using 'a' and 'b' as variable names
			const aVar = varNode('a');
			const bVar = varNode('b');
			const p = [
				normalTerm(ALGEBRAIC_ONE, [factor(aVar)]),
				normalTerm(ALGEBRAIC_ONE, [factor(bVar)])
			];
			const result = mulPolynomials(p, p);

			// Should have 3 terms: a^2, 2ab, b^2
			expect(result.length).toBe(3);

			// Find a^2 term
			const a2 = result.find(
				(t) =>
					t.monomial.length === 1 &&
					(t.monomial[0].base as VariableNode).name === 'a' &&
					t.monomial[0].exponent.n === 2n
			);
			expect(a2?.coefficient.terms[0].rational.n).toBe(1n);

			// Find ab term (coefficient should be 2)
			const ab = result.find(
				(t) =>
					t.monomial.length === 2 &&
					t.monomial[0].exponent.n === 1n &&
					t.monomial[1].exponent.n === 1n
			);
			expect(ab?.coefficient.terms[0].rational.n).toBe(2n);

			// Find b^2 term
			const b2 = result.find(
				(t) =>
					t.monomial.length === 1 &&
					(t.monomial[0].base as VariableNode).name === 'b' &&
					t.monomial[0].exponent.n === 2n
			);
			expect(b2?.coefficient.terms[0].rational.n).toBe(1n);
		});

		it('multiplying by zero gives zero', () => {
			const p = [term(3n, 'x'), term(2n)];
			expect(mulPolynomials(p, ZERO_POLYNOMIAL).length).toBe(0);
			expect(mulPolynomials(ZERO_POLYNOMIAL, p).length).toBe(0);
		});

		it('multiplying by one gives same', () => {
			const p = [term(3n, 'x'), term(2n)];
			expect(polynomialsEqual(mulPolynomials(p, ONE_POLYNOMIAL), p)).toBe(true);
			expect(polynomialsEqual(mulPolynomials(ONE_POLYNOMIAL, p), p)).toBe(true);
		});

		it('2x * 3y = 6xy', () => {
			const p1 = [term(2n, 'x')];
			const p2 = [term(3n, 'y')];
			const result = mulPolynomials(p1, p2);
			expect(result.length).toBe(1);
			expect(result[0].coefficient.terms[0].rational.n).toBe(6n);
			expect(result[0].monomial.length).toBe(2);
		});
	});

	// ===========================================================================
	// Power
	// ===========================================================================

	describe('powPolynomial', () => {
		it('p^0 = 1', () => {
			const p = [term(3n, 'x'), term(2n)];
			const result = powPolynomial(p, 0);
			expect(polynomialsEqual(result, [...ONE_POLYNOMIAL])).toBe(true);
		});

		it('p^1 = p', () => {
			const p = [term(3n, 'x'), term(2n)];
			const result = powPolynomial(p, 1);
			expect(polynomialsEqual(result, p)).toBe(true);
		});

		it('(x + 1)^2 = x^2 + 2x + 1', () => {
			const p = [term(1n, 'x'), term(1n)];
			const result = powPolynomial(p, 2);

			expect(result.length).toBe(3);

			// x^2 coefficient
			const x2 = result.find((t) => t.monomial.length === 1 && t.monomial[0].exponent.n === 2n);
			expect(x2?.coefficient.terms[0].rational.n).toBe(1n);

			// x coefficient
			const x1 = result.find((t) => t.monomial.length === 1 && t.monomial[0].exponent.n === 1n);
			expect(x1?.coefficient.terms[0].rational.n).toBe(2n);

			// constant coefficient
			const const1 = result.find((t) => t.monomial.length === 0);
			expect(const1?.coefficient.terms[0].rational.n).toBe(1n);
		});

		it('(x + 1)^3 = x^3 + 3x^2 + 3x + 1', () => {
			const p = [term(1n, 'x'), term(1n)];
			const result = powPolynomial(p, 3);

			expect(result.length).toBe(4);

			// Check binomial coefficients
			const x3 = result.find((t) => t.monomial.length === 1 && t.monomial[0].exponent.n === 3n);
			const x2 = result.find((t) => t.monomial.length === 1 && t.monomial[0].exponent.n === 2n);
			const x1 = result.find((t) => t.monomial.length === 1 && t.monomial[0].exponent.n === 1n);
			const c = result.find((t) => t.monomial.length === 0);

			expect(x3?.coefficient.terms[0].rational.n).toBe(1n);
			expect(x2?.coefficient.terms[0].rational.n).toBe(3n);
			expect(x1?.coefficient.terms[0].rational.n).toBe(3n);
			expect(c?.coefficient.terms[0].rational.n).toBe(1n);
		});

		it('throws for negative exponent', () => {
			const p = [term(1n, 'x')];
			expect(() => powPolynomial(p, -1)).toThrow();
		});
	});

	// ===========================================================================
	// Predicates
	// ===========================================================================

	describe('isZeroPolynomial', () => {
		it('returns true for empty polynomial', () => {
			expect(isZeroPolynomial(ZERO_POLYNOMIAL)).toBe(true);
		});

		it('returns false for non-empty polynomial', () => {
			expect(isZeroPolynomial(ONE_POLYNOMIAL)).toBe(false);
		});
	});

	describe('isOnePolynomial', () => {
		it('returns true for one polynomial', () => {
			expect(isOnePolynomial(ONE_POLYNOMIAL)).toBe(true);
		});

		it('returns false for zero polynomial', () => {
			expect(isOnePolynomial(ZERO_POLYNOMIAL)).toBe(false);
		});

		it('returns false for other polynomials', () => {
			expect(isOnePolynomial([term(2n)])).toBe(false);
			expect(isOnePolynomial([term(1n, 'x')])).toBe(false);
		});
	});

	describe('isConstantPolynomial', () => {
		it('returns true for constant polynomial', () => {
			expect(isConstantPolynomial([term(5n)])).toBe(true);
			expect(isConstantPolynomial(ONE_POLYNOMIAL)).toBe(true);
		});

		it('returns true for zero polynomial', () => {
			expect(isConstantPolynomial(ZERO_POLYNOMIAL)).toBe(true);
		});

		it('returns false for polynomial with variables', () => {
			expect(isConstantPolynomial([term(1n, 'x')])).toBe(false);
		});
	});

	describe('polynomialsEqual', () => {
		it('equal polynomials are equal', () => {
			const p1 = [term(3n, 'x'), term(2n)];
			const p2 = [term(3n, 'x'), term(2n)];
			expect(polynomialsEqual(p1, p2)).toBe(true);
		});

		it('different polynomials are not equal', () => {
			const p1 = [term(3n, 'x')];
			const p2 = [term(2n, 'x')];
			expect(polynomialsEqual(p1, p2)).toBe(false);
		});

		it('empty polynomials are equal', () => {
			expect(polynomialsEqual([], [])).toBe(true);
		});
	});

	// ===========================================================================
	// Degree
	// ===========================================================================

	describe('polynomialDegree', () => {
		it('zero polynomial has degree -Infinity', () => {
			expect(polynomialDegree(ZERO_POLYNOMIAL)).toBe(-Infinity);
		});

		it('constant polynomial has degree 0', () => {
			expect(polynomialDegree([term(5n)])).toBe(0);
		});

		it('x^2 + x + 1 has degree 2', () => {
			const p = [term(1n, 'x', 2n), term(1n, 'x'), term(1n)];
			expect(polynomialDegree(p)).toBe(2);
		});

		it('3x^5 - 2x^3 + x has degree 5', () => {
			const p = [term(3n, 'x', 5n), term(-2n, 'x', 3n), term(1n, 'x')];
			expect(polynomialDegree(p)).toBe(5);
		});
	});

	describe('leadingTerm', () => {
		it('returns null for zero polynomial', () => {
			expect(leadingTerm(ZERO_POLYNOMIAL)).toBe(null);
		});

		it('returns first term for non-zero polynomial', () => {
			const p = [term(3n, 'x', 2n), term(2n, 'x'), term(1n)];
			const lt = leadingTerm(p);
			expect(lt?.monomial[0].exponent.n).toBe(2n);
		});
	});

	// ===========================================================================
	// Conversion
	// ===========================================================================

	describe('polynomialToString', () => {
		it('converts zero polynomial', () => {
			expect(polynomialToString(ZERO_POLYNOMIAL)).toBe('0');
		});

		it('converts constant polynomial', () => {
			expect(polynomialToString([term(5n)])).toBe('5');
		});

		it('converts single variable polynomial', () => {
			const str = polynomialToString([term(3n, 'x')]);
			expect(str).toContain('3');
			expect(str).toContain('x');
		});
	});

	// ===========================================================================
	// Integration Tests
	// ===========================================================================

	describe('integration', () => {
		it('verifies (a-b)(a+b) = a^2 - b^2', () => {
			const aVar = varNode('a');
			const bVar = varNode('b');
			const aPlusB = [
				normalTerm(ALGEBRAIC_ONE, [factor(aVar)]),
				normalTerm(ALGEBRAIC_ONE, [factor(bVar)])
			];
			const aMinusB = [
				normalTerm(ALGEBRAIC_ONE, [factor(aVar)]),
				normalTerm(algebraicFromRational(r(-1n)), [factor(bVar)])
			];

			const result = mulPolynomials(aMinusB, aPlusB);

			// Should have a^2 - b^2 (2 terms)
			expect(result.length).toBe(2);

			const a2 = result.find(
				(t) => t.monomial.length === 1 && (t.monomial[0].base as VariableNode).name === 'a'
			);
			const b2 = result.find(
				(t) => t.monomial.length === 1 && (t.monomial[0].base as VariableNode).name === 'b'
			);

			expect(a2?.coefficient.terms[0].rational.n).toBe(1n);
			expect(b2?.coefficient.terms[0].rational.n).toBe(-1n);
		});

		it('verifies (x+1)^4 binomial expansion', () => {
			const p = [term(1n, 'x'), term(1n)];
			const result = powPolynomial(p, 4);

			// (x+1)^4 = x^4 + 4x^3 + 6x^2 + 4x + 1
			expect(result.length).toBe(5);

			const coeffs = new Map<bigint, bigint>();
			for (const t of result) {
				const deg = t.monomial.length > 0 ? t.monomial[0].exponent.n : 0n;
				coeffs.set(deg, t.coefficient.terms[0].rational.n);
			}

			expect(coeffs.get(4n)).toBe(1n);
			expect(coeffs.get(3n)).toBe(4n);
			expect(coeffs.get(2n)).toBe(6n);
			expect(coeffs.get(1n)).toBe(4n);
			expect(coeffs.get(0n)).toBe(1n);
		});

		it('sqrt(2)*x + sqrt(3)*x + sqrt(2)*y combines correctly', () => {
			const coeff1 = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const coeff2 = coef([{ rational: r(1n), radicals: [sqrt3] }]);

			const p = [
				normalTerm(coeff1, [factor(x)]),
				normalTerm(coeff2, [factor(x)]),
				normalTerm(coeff1, [factor(y)])
			];

			const result = collectLikeTerms(p);

			// Should have 2 terms: (sqrt(2)+sqrt(3))x and sqrt(2)y
			expect(result.length).toBe(2);

			// x term should have 2 radical terms in coefficient
			const xTerm = result.find(
				(t) => t.monomial.length === 1 && (t.monomial[0].base as VariableNode).name === 'x'
			);
			expect(xTerm?.coefficient.terms.length).toBe(2);
		});
	});
});
