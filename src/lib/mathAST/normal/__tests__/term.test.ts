/**
 * Unit tests for normal term operations module
 */

import { describe, it, expect } from 'vitest';
import {
	// Constants
	ZERO_TERM,
	ONE_TERM,
	// Constructors
	normalTerm,
	constantTerm,
	monomialTerm,
	// Predicates
	isZeroTerm,
	isOneTerm,
	isConstantTerm,
	// Like terms
	areLikeTerms,
	getMonomialSignature,
	addLikeTerms,
	// Arithmetic
	mulTerms,
	negTerm,
	// Comparison
	compareNormalTerms,
	termsEqual,
	// Sorting
	sortNormalTerms,
	// Conversion
	termToString
} from '../term';
import {
	ALGEBRAIC_ONE,
	ALGEBRAIC_ZERO,
	algebraicFromRational,
	algebraicCoefficient,
	algebraicTerm
} from '../algebraic';
import { symbolicFactor } from '../monomial';
import type { Rational, SimplifiedRadical, AlgebraicCoefficient } from '../types';
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

// Common radicals
const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };

// Helper to create symbolic factors
const factor = (base: VariableNode, exp: Rational = r(1n)) => symbolicFactor(base, exp);

// Helper to create algebraic coefficients
function coef(
	terms: Array<{ rational: Rational; radicals: SimplifiedRadical[] }>
): AlgebraicCoefficient {
	return algebraicCoefficient(terms.map((t) => algebraicTerm(t.rational, t.radicals)));
}

describe('term', () => {
	// ===========================================================================
	// Constants
	// ===========================================================================

	describe('constants', () => {
		it('ZERO_TERM has zero coefficient', () => {
			expect(ZERO_TERM.coefficient.terms.length).toBe(0);
		});

		it('ONE_TERM has coefficient 1 and no monomial', () => {
			expect(ONE_TERM.coefficient.terms.length).toBe(1);
			expect(ONE_TERM.coefficient.terms[0].rational.n).toBe(1n);
			expect(ONE_TERM.monomial.length).toBe(0);
		});
	});

	// ===========================================================================
	// Constructors
	// ===========================================================================

	describe('normalTerm', () => {
		it('creates term with coefficient and monomial', () => {
			const coeff = algebraicFromRational(r(3n));
			const mono = [factor(x, r(2n))];
			const term = normalTerm(coeff, mono);
			expect(term.coefficient.terms[0].rational.n).toBe(3n);
			expect(term.monomial.length).toBe(1);
		});

		it('returns zero term for zero coefficient', () => {
			const term = normalTerm(ALGEBRAIC_ZERO, [factor(x)]);
			expect(isZeroTerm(term)).toBe(true);
		});
	});

	describe('constantTerm', () => {
		it('creates constant term', () => {
			const term = constantTerm(algebraicFromRational(r(5n)));
			expect(term.coefficient.terms[0].rational.n).toBe(5n);
			expect(term.monomial.length).toBe(0);
		});

		it('returns zero term for zero coefficient', () => {
			expect(isZeroTerm(constantTerm(ALGEBRAIC_ZERO))).toBe(true);
		});

		it('returns one term for coefficient 1', () => {
			expect(isOneTerm(constantTerm(ALGEBRAIC_ONE))).toBe(true);
		});
	});

	describe('monomialTerm', () => {
		it('creates term with coefficient 1', () => {
			const term = monomialTerm([factor(x, r(2n))]);
			expect(term.coefficient.terms[0].rational.n).toBe(1n);
			expect(term.monomial.length).toBe(1);
		});

		it('returns one term for empty monomial', () => {
			expect(isOneTerm(monomialTerm([]))).toBe(true);
		});
	});

	// ===========================================================================
	// Predicates
	// ===========================================================================

	describe('isZeroTerm', () => {
		it('returns true for zero term', () => {
			expect(isZeroTerm(ZERO_TERM)).toBe(true);
		});

		it('returns false for non-zero term', () => {
			expect(isZeroTerm(ONE_TERM)).toBe(false);
		});
	});

	describe('isOneTerm', () => {
		it('returns true for one term', () => {
			expect(isOneTerm(ONE_TERM)).toBe(true);
		});

		it('returns false for zero term', () => {
			expect(isOneTerm(ZERO_TERM)).toBe(false);
		});

		it('returns false for term with non-one coefficient', () => {
			const term = constantTerm(algebraicFromRational(r(2n)));
			expect(isOneTerm(term)).toBe(false);
		});

		it('returns false for term with non-empty monomial', () => {
			const term = monomialTerm([factor(x)]);
			expect(isOneTerm(term)).toBe(false);
		});
	});

	describe('isConstantTerm', () => {
		it('returns true for constant term', () => {
			expect(isConstantTerm(constantTerm(algebraicFromRational(r(5n))))).toBe(true);
		});

		it('returns true for one term', () => {
			expect(isConstantTerm(ONE_TERM)).toBe(true);
		});

		it('returns false for term with monomial', () => {
			expect(isConstantTerm(monomialTerm([factor(x)]))).toBe(false);
		});
	});

	// ===========================================================================
	// Like Terms
	// ===========================================================================

	describe('areLikeTerms', () => {
		it('returns true for same monomial', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(5n)), [factor(x, r(2n))]);
			expect(areLikeTerms(a, b)).toBe(true);
		});

		it('returns false for different monomials', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(1n))]);
			expect(areLikeTerms(a, b)).toBe(false);
		});

		it('returns true for constant terms', () => {
			const a = constantTerm(algebraicFromRational(r(3n)));
			const b = constantTerm(algebraicFromRational(r(5n)));
			expect(areLikeTerms(a, b)).toBe(true);
		});
	});

	describe('getMonomialSignature', () => {
		it('returns empty string for constant term', () => {
			expect(getMonomialSignature(ONE_TERM)).toBe('');
		});

		it('returns same signature for like terms', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(5n)), [factor(x, r(2n))]);
			expect(getMonomialSignature(a)).toBe(getMonomialSignature(b));
		});
	});

	describe('addLikeTerms', () => {
		it('adds like terms: 3x^2 + 2x^2 = 5x^2', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(2n)), [factor(x, r(2n))]);
			const result = addLikeTerms(a, b);
			expect(result).not.toBe(null);
			expect(result!.coefficient.terms[0].rational.n).toBe(5n);
		});

		it('returns null for non-like terms', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(2n)), [factor(y, r(2n))]);
			expect(addLikeTerms(a, b)).toBe(null);
		});

		it('returns zero term when coefficients cancel', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(-3n)), [factor(x, r(2n))]);
			const result = addLikeTerms(a, b);
			expect(isZeroTerm(result!)).toBe(true);
		});

		it('adds radical coefficients: sqrt(2)*x + 2*sqrt(2)*x = 3*sqrt(2)*x', () => {
			const coeff1 = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const coeff2 = coef([{ rational: r(2n), radicals: [sqrt2] }]);
			const a = normalTerm(coeff1, [factor(x)]);
			const b = normalTerm(coeff2, [factor(x)]);
			const result = addLikeTerms(a, b);
			expect(result!.coefficient.terms[0].rational.n).toBe(3n);
		});
	});

	// ===========================================================================
	// Arithmetic Operations
	// ===========================================================================

	describe('mulTerms', () => {
		it('3x^2 * 2x = 6x^3', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(2n)), [factor(x, r(1n))]);
			const result = mulTerms(a, b);
			expect(result.coefficient.terms[0].rational.n).toBe(6n);
			expect(result.monomial[0].exponent.n).toBe(3n);
		});

		it('multiplying by zero gives zero', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			expect(isZeroTerm(mulTerms(a, ZERO_TERM))).toBe(true);
			expect(isZeroTerm(mulTerms(ZERO_TERM, a))).toBe(true);
		});

		it('multiplying by one gives same', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			expect(termsEqual(mulTerms(a, ONE_TERM), a)).toBe(true);
			expect(termsEqual(mulTerms(ONE_TERM, a), a)).toBe(true);
		});

		it('x * y = xy', () => {
			const a = monomialTerm([factor(x)]);
			const b = monomialTerm([factor(y)]);
			const result = mulTerms(a, b);
			expect(result.monomial.length).toBe(2);
		});

		it('sqrt(2)*x * sqrt(2)*y = 2*xy', () => {
			const coeff = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const a = normalTerm(coeff, [factor(x)]);
			const b = normalTerm(coeff, [factor(y)]);
			const result = mulTerms(a, b);
			// sqrt(2) * sqrt(2) = 2
			expect(result.coefficient.terms[0].rational.n).toBe(2n);
			expect(result.coefficient.terms[0].radicals.length).toBe(0);
			expect(result.monomial.length).toBe(2);
		});
	});

	describe('negTerm', () => {
		it('negates coefficient', () => {
			const term = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const result = negTerm(term);
			expect(result.coefficient.terms[0].rational.n).toBe(-3n);
		});

		it('negating zero returns zero', () => {
			expect(isZeroTerm(negTerm(ZERO_TERM))).toBe(true);
		});
	});

	// ===========================================================================
	// Comparison
	// ===========================================================================

	describe('compareNormalTerms', () => {
		it('higher degree comes first: x^2 < x', () => {
			const x2 = monomialTerm([factor(x, r(2n))]);
			const x1 = monomialTerm([factor(x, r(1n))]);
			expect(compareNormalTerms(x2, x1)).toBe(-1);
		});

		it('same degree: alphabetical order x < y', () => {
			const termX = monomialTerm([factor(x)]);
			const termY = monomialTerm([factor(y)]);
			expect(compareNormalTerms(termX, termY)).toBe(-1);
		});

		it('equal terms return 0', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			expect(compareNormalTerms(a, b)).toBe(0);
		});
	});

	describe('termsEqual', () => {
		it('equal terms are equal', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			expect(termsEqual(a, b)).toBe(true);
		});

		it('different coefficients are not equal', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(5n)), [factor(x, r(2n))]);
			expect(termsEqual(a, b)).toBe(false);
		});

		it('different monomials are not equal', () => {
			const a = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const b = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(1n))]);
			expect(termsEqual(a, b)).toBe(false);
		});
	});

	// ===========================================================================
	// Sorting
	// ===========================================================================

	describe('sortNormalTerms', () => {
		it('sorts terms by monomial order', () => {
			const x1 = monomialTerm([factor(x)]);
			const x2 = monomialTerm([factor(x, r(2n))]);
			const y1 = monomialTerm([factor(y)]);
			const sorted = sortNormalTerms([x1, y1, x2]);
			// x^2 first (highest degree), then x, then y (alphabetical)
			expect(sorted[0].monomial[0].exponent.n).toBe(2n);
		});

		it('does not modify original array', () => {
			const original = [monomialTerm([factor(y)]), monomialTerm([factor(x)])];
			sortNormalTerms(original);
			expect((original[0].monomial[0].base as VariableNode).name).toBe('y');
		});
	});

	// ===========================================================================
	// Conversion
	// ===========================================================================

	describe('termToString', () => {
		it('converts zero term', () => {
			expect(termToString(ZERO_TERM)).toBe('0');
		});

		it('converts constant term', () => {
			const term = constantTerm(algebraicFromRational(r(5n)));
			expect(termToString(term)).toBe('5');
		});

		it('converts variable term', () => {
			const term = monomialTerm([factor(x)]);
			expect(termToString(term)).toBe('x');
		});

		it('converts term with coefficient and monomial', () => {
			const term = normalTerm(algebraicFromRational(r(3n)), [factor(x, r(2n))]);
			const str = termToString(term);
			expect(str).toContain('3');
			expect(str).toContain('x');
		});
	});

	// ===========================================================================
	// Integration Tests
	// ===========================================================================

	describe('integration', () => {
		it('(2x)(3y) = 6xy', () => {
			const a = normalTerm(algebraicFromRational(r(2n)), [factor(x)]);
			const b = normalTerm(algebraicFromRational(r(3n)), [factor(y)]);
			const result = mulTerms(a, b);
			expect(result.coefficient.terms[0].rational.n).toBe(6n);
			expect(result.monomial.length).toBe(2);
		});

		it('sqrt(2)*x + sqrt(3)*x combines to (sqrt(2)+sqrt(3))*x', () => {
			const coeff1 = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
			const coeff2 = coef([{ rational: r(1n), radicals: [sqrt3] }]);
			const a = normalTerm(coeff1, [factor(x)]);
			const b = normalTerm(coeff2, [factor(x)]);

			// These are like terms (same monomial x)
			expect(areLikeTerms(a, b)).toBe(true);

			const result = addLikeTerms(a, b);
			expect(result!.coefficient.terms.length).toBe(2);
		});
	});
});
