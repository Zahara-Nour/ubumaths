/**
 * Unit tests for algebraic coefficient operations module
 */

import { describe, it, expect } from 'vitest';
import {
	// Constants
	ALGEBRAIC_ZERO,
	ALGEBRAIC_ONE,
	// Constructors
	algebraicTerm,
	algebraicCoefficient,
	algebraicFromRational,
	algebraicFromRadical,
	hashRadicals,
	// Arithmetic
	addAlgebraic,
	subAlgebraic,
	negAlgebraic,
	mulAlgebraic,
	// Predicates
	isZeroAlgebraic,
	isOneAlgebraic,
	isPureRational,
	getRationalValue,
	algebraicEquals,
	// Conversion
	algebraicToString,
	algebraicToNumber
} from '../algebraic';
import type { SimplifiedRadical, Rational, AlgebraicCoefficient } from '../types';

// =============================================================================
// Test Helpers
// =============================================================================

// Helper to create rationals
const r = (n: bigint, d: bigint = 1n): Rational => ({ n, d });

// Common test radicals
const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
const sqrt5: SimplifiedRadical = { radicand: 5n, index: 2n };
const _sqrt6: SimplifiedRadical = { radicand: 6n, index: 2n };
const _cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };

// Helper to create algebraic coefficients for testing
function coef(
	terms: Array<{ rational: Rational; radicals: SimplifiedRadical[] }>
): AlgebraicCoefficient {
	return algebraicCoefficient(terms.map((t) => algebraicTerm(t.rational, t.radicals)));
}

describe('algebraic', () => {
	// ===========================================================================
	// Constants
	// ===========================================================================

	describe('constants', () => {
		it('ALGEBRAIC_ZERO has no terms', () => {
			expect(ALGEBRAIC_ZERO.terms.length).toBe(0);
		});

		it('ALGEBRAIC_ONE has one term with rational 1 and no radicals', () => {
			expect(ALGEBRAIC_ONE.terms.length).toBe(1);
			expect(ALGEBRAIC_ONE.terms[0].rational.n).toBe(1n);
			expect(ALGEBRAIC_ONE.terms[0].rational.d).toBe(1n);
			expect(ALGEBRAIC_ONE.terms[0].radicals.length).toBe(0);
		});
	});

	// ===========================================================================
	// Constructors
	// ===========================================================================

	describe('algebraicTerm', () => {
		it('creates term with rational and no radicals', () => {
			const term = algebraicTerm(r(3n));
			expect(term.rational.n).toBe(3n);
			expect(term.rational.d).toBe(1n);
			expect(term.radicals.length).toBe(0);
		});

		it('creates term with rational and radicals', () => {
			const term = algebraicTerm(r(2n), [sqrt2]);
			expect(term.rational.n).toBe(2n);
			expect(term.radicals.length).toBe(1);
			expect(term.radicals[0].radicand).toBe(2n);
		});

		it('sorts radicals in canonical order', () => {
			const term = algebraicTerm(r(1n), [sqrt3, sqrt2]);
			expect(term.radicals[0].radicand).toBe(2n);
			expect(term.radicals[1].radicand).toBe(3n);
		});
	});

	describe('algebraicCoefficient', () => {
		it('combines like terms', () => {
			const terms = [algebraicTerm(r(3n), [sqrt2]), algebraicTerm(r(2n), [sqrt2])];
			const coef = algebraicCoefficient(terms);
			expect(coef.terms.length).toBe(1);
			expect(coef.terms[0].rational.n).toBe(5n);
		});

		it('eliminates zero coefficients', () => {
			const terms = [algebraicTerm(r(3n), [sqrt2]), algebraicTerm(r(-3n), [sqrt2])];
			const coef = algebraicCoefficient(terms);
			expect(coef.terms.length).toBe(0);
		});

		it('keeps different radical signatures separate', () => {
			const terms = [algebraicTerm(r(1n), [sqrt2]), algebraicTerm(r(1n), [sqrt3])];
			const coef = algebraicCoefficient(terms);
			expect(coef.terms.length).toBe(2);
		});

		it('sorts terms canonically', () => {
			const terms = [
				algebraicTerm(r(1n), [sqrt3]),
				algebraicTerm(r(2n)),
				algebraicTerm(r(1n), [sqrt2])
			];
			const coef = algebraicCoefficient(terms);
			// Pure rational comes first, then sqrt(2), then sqrt(3)
			expect(coef.terms[0].radicals.length).toBe(0);
			expect(coef.terms[1].radicals[0].radicand).toBe(2n);
			expect(coef.terms[2].radicals[0].radicand).toBe(3n);
		});
	});

	describe('algebraicFromRational', () => {
		it('creates coefficient from rational', () => {
			const coef = algebraicFromRational(r(5n, 2n));
			expect(coef.terms.length).toBe(1);
			expect(coef.terms[0].rational.n).toBe(5n);
			expect(coef.terms[0].rational.d).toBe(2n);
		});

		it('returns zero for zero rational', () => {
			const coef = algebraicFromRational(r(0n));
			expect(coef.terms.length).toBe(0);
		});
	});

	describe('algebraicFromRadical', () => {
		it('creates coefficient from radical with coefficient 1', () => {
			const coef = algebraicFromRadical(sqrt2);
			expect(coef.terms.length).toBe(1);
			expect(coef.terms[0].rational.n).toBe(1n);
			expect(coef.terms[0].radicals[0].radicand).toBe(2n);
		});
	});

	describe('hashRadicals', () => {
		it('returns empty string for empty array', () => {
			expect(hashRadicals([])).toBe('');
		});

		it('returns consistent hash for same radicals', () => {
			expect(hashRadicals([sqrt2])).toBe(hashRadicals([sqrt2]));
			expect(hashRadicals([sqrt2, sqrt3])).toBe(hashRadicals([sqrt2, sqrt3]));
		});

		it('returns different hash for different radicals', () => {
			expect(hashRadicals([sqrt2])).not.toBe(hashRadicals([sqrt3]));
		});
	});

	// ===========================================================================
	// Arithmetic Operations
	// ===========================================================================

	describe('addAlgebraic', () => {
		it('3*sqrt(2) + 2*sqrt(2) = 5*sqrt(2)', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(2n), radicals: [sqrt2] }]);
			const result = addAlgebraic(a, b);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].rational.n).toBe(5n);
			expect(result.terms[0].radicals[0].radicand).toBe(2n);
		});

		it('sqrt(2) + sqrt(3) stays as sqrt(2) + sqrt(3)', () => {
			const a = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(1n), radicals: [sqrt3] }]);
			const result = addAlgebraic(a, b);
			expect(result.terms.length).toBe(2);
		});

		it('adding zero returns other operand', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			expect(addAlgebraic(a, ALGEBRAIC_ZERO)).toEqual(a);
			expect(addAlgebraic(ALGEBRAIC_ZERO, a)).toEqual(a);
		});

		it('combining with negative gives zero', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(-3n), radicals: [sqrt2] }]);
			const result = addAlgebraic(a, b);
			expect(result.terms.length).toBe(0);
		});

		it('5 + 3 = 8', () => {
			const a = algebraicFromRational(r(5n));
			const b = algebraicFromRational(r(3n));
			const result = addAlgebraic(a, b);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].rational.n).toBe(8n);
		});

		it('(sqrt(2) + sqrt(3)) + (2*sqrt(2) + sqrt(5)) = 3*sqrt(2) + sqrt(3) + sqrt(5)', () => {
			const a = coef([
				{ rational: r(1n), radicals: [sqrt2] },
				{ rational: r(1n), radicals: [sqrt3] }
			]);
			const b = coef([
				{ rational: r(2n), radicals: [sqrt2] },
				{ rational: r(1n), radicals: [sqrt5] }
			]);
			const result = addAlgebraic(a, b);
			expect(result.terms.length).toBe(3);
			// sqrt(2) term should have coefficient 3
			const sqrt2Term = result.terms.find(
				(t) => t.radicals.length === 1 && t.radicals[0].radicand === 2n
			);
			expect(sqrt2Term?.rational.n).toBe(3n);
		});
	});

	describe('subAlgebraic', () => {
		it('5*sqrt(2) - 3*sqrt(2) = 2*sqrt(2)', () => {
			const a = coef([{ rational: r(5n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const result = subAlgebraic(a, b);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].rational.n).toBe(2n);
		});

		it('a - a = 0', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const result = subAlgebraic(a, a);
			expect(result.terms.length).toBe(0);
		});
	});

	describe('negAlgebraic', () => {
		it('negates all terms', () => {
			const a = coef([
				{ rational: r(3n), radicals: [sqrt2] },
				{ rational: r(2n), radicals: [sqrt3] }
			]);
			const result = negAlgebraic(a);
			expect(result.terms[0].rational.n).toBe(-3n);
			expect(result.terms[1].rational.n).toBe(-2n);
		});

		it('negating zero returns zero', () => {
			const result = negAlgebraic(ALGEBRAIC_ZERO);
			expect(result.terms.length).toBe(0);
		});
	});

	describe('mulAlgebraic', () => {
		it('sqrt(2) * sqrt(3) = sqrt(6)', () => {
			const a = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(1n), radicals: [sqrt3] }]);
			const result = mulAlgebraic(a, b);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].radicals.length).toBe(1);
			expect(result.terms[0].radicals[0].radicand).toBe(6n);
		});

		it('sqrt(2) * sqrt(2) = 2', () => {
			const a = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const result = mulAlgebraic(a, a);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].radicals.length).toBe(0);
			expect(result.terms[0].rational.n).toBe(2n);
		});

		it('(sqrt(2) + sqrt(3)) * sqrt(2) = 2 + sqrt(6)', () => {
			const a = coef([
				{ rational: r(1n), radicals: [sqrt2] },
				{ rational: r(1n), radicals: [sqrt3] }
			]);
			const b = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const result = mulAlgebraic(a, b);
			expect(result.terms.length).toBe(2);
			// Should have a pure rational 2 and sqrt(6)
			const pureRational = result.terms.find((t) => t.radicals.length === 0);
			const radicalTerm = result.terms.find((t) => t.radicals.length > 0);
			expect(pureRational?.rational.n).toBe(2n);
			expect(radicalTerm?.radicals[0].radicand).toBe(6n);
		});

		it('2 * 3 = 6', () => {
			const a = algebraicFromRational(r(2n));
			const b = algebraicFromRational(r(3n));
			const result = mulAlgebraic(a, b);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].rational.n).toBe(6n);
		});

		it('multiplying by zero returns zero', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			expect(mulAlgebraic(a, ALGEBRAIC_ZERO).terms.length).toBe(0);
			expect(mulAlgebraic(ALGEBRAIC_ZERO, a).terms.length).toBe(0);
		});

		it('multiplying by one returns same', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			expect(algebraicEquals(mulAlgebraic(a, ALGEBRAIC_ONE), a)).toBe(true);
			expect(algebraicEquals(mulAlgebraic(ALGEBRAIC_ONE, a), a)).toBe(true);
		});

		it('3*sqrt(2) * 2*sqrt(3) = 6*sqrt(6)', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(2n), radicals: [sqrt3] }]);
			const result = mulAlgebraic(a, b);
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].rational.n).toBe(6n);
			expect(result.terms[0].radicals[0].radicand).toBe(6n);
		});

		it('(1 + sqrt(2))^2 = 3 + 2*sqrt(2)', () => {
			const a = coef([
				{ rational: r(1n), radicals: [] },
				{ rational: r(1n), radicals: [sqrt2] }
			]);
			const result = mulAlgebraic(a, a);
			// (1 + sqrt(2))^2 = 1 + 2*sqrt(2) + 2 = 3 + 2*sqrt(2)
			expect(result.terms.length).toBe(2);
			const pureRational = result.terms.find((t) => t.radicals.length === 0);
			const radicalTerm = result.terms.find((t) => t.radicals.length > 0);
			expect(pureRational?.rational.n).toBe(3n);
			expect(radicalTerm?.rational.n).toBe(2n);
			expect(radicalTerm?.radicals[0].radicand).toBe(2n);
		});
	});

	// ===========================================================================
	// Predicates
	// ===========================================================================

	describe('isZeroAlgebraic', () => {
		it('returns true for zero', () => {
			expect(isZeroAlgebraic(ALGEBRAIC_ZERO)).toBe(true);
		});

		it('returns false for non-zero', () => {
			expect(isZeroAlgebraic(ALGEBRAIC_ONE)).toBe(false);
			expect(isZeroAlgebraic(coef([{ rational: r(1n), radicals: [sqrt2] }]))).toBe(false);
		});
	});

	describe('isOneAlgebraic', () => {
		it('returns true for one', () => {
			expect(isOneAlgebraic(ALGEBRAIC_ONE)).toBe(true);
		});

		it('returns false for zero', () => {
			expect(isOneAlgebraic(ALGEBRAIC_ZERO)).toBe(false);
		});

		it('returns false for other values', () => {
			expect(isOneAlgebraic(algebraicFromRational(r(2n)))).toBe(false);
			expect(isOneAlgebraic(coef([{ rational: r(1n), radicals: [sqrt2] }]))).toBe(false);
		});
	});

	describe('isPureRational', () => {
		it('returns true for zero', () => {
			expect(isPureRational(ALGEBRAIC_ZERO)).toBe(true);
		});

		it('returns true for rational', () => {
			expect(isPureRational(algebraicFromRational(r(3n, 2n)))).toBe(true);
		});

		it('returns false for radical', () => {
			expect(isPureRational(coef([{ rational: r(1n), radicals: [sqrt2] }]))).toBe(false);
		});

		it('returns false for sum of rationals and radicals', () => {
			expect(
				isPureRational(
					coef([
						{ rational: r(1n), radicals: [] },
						{ rational: r(1n), radicals: [sqrt2] }
					])
				)
			).toBe(false);
		});
	});

	describe('getRationalValue', () => {
		it('returns zero for zero coefficient', () => {
			const val = getRationalValue(ALGEBRAIC_ZERO);
			expect(val?.n).toBe(0n);
		});

		it('returns rational for pure rational', () => {
			const val = getRationalValue(algebraicFromRational(r(3n, 2n)));
			expect(val?.n).toBe(3n);
			expect(val?.d).toBe(2n);
		});

		it('returns null for radical', () => {
			expect(getRationalValue(coef([{ rational: r(1n), radicals: [sqrt2] }]))).toBe(null);
		});
	});

	describe('algebraicEquals', () => {
		it('equal coefficients are equal', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			expect(algebraicEquals(a, b)).toBe(true);
		});

		it('different coefficients are not equal', () => {
			const a = coef([{ rational: r(3n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(2n), radicals: [sqrt2] }]);
			expect(algebraicEquals(a, b)).toBe(false);
		});

		it('different radicals are not equal', () => {
			const a = coef([{ rational: r(1n), radicals: [sqrt2] }]);
			const b = coef([{ rational: r(1n), radicals: [sqrt3] }]);
			expect(algebraicEquals(a, b)).toBe(false);
		});

		it('zero equals zero', () => {
			expect(algebraicEquals(ALGEBRAIC_ZERO, ALGEBRAIC_ZERO)).toBe(true);
		});
	});

	// ===========================================================================
	// Conversion
	// ===========================================================================

	describe('algebraicToString', () => {
		it('converts zero', () => {
			expect(algebraicToString(ALGEBRAIC_ZERO)).toBe('0');
		});

		it('converts pure rational', () => {
			expect(algebraicToString(algebraicFromRational(r(5n)))).toBe('5');
		});

		it('converts single radical', () => {
			const str = algebraicToString(coef([{ rational: r(1n), radicals: [sqrt2] }]));
			expect(str).toContain('sqrt(2)');
		});

		it('converts coefficient times radical', () => {
			const str = algebraicToString(coef([{ rational: r(3n), radicals: [sqrt2] }]));
			expect(str).toContain('3');
			expect(str).toContain('sqrt(2)');
		});
	});

	describe('algebraicToNumber', () => {
		it('converts zero', () => {
			expect(algebraicToNumber(ALGEBRAIC_ZERO)).toBe(0);
		});

		it('converts pure rational', () => {
			expect(algebraicToNumber(algebraicFromRational(r(3n, 2n)))).toBe(1.5);
		});

		it('converts sqrt(2)', () => {
			const val = algebraicToNumber(coef([{ rational: r(1n), radicals: [sqrt2] }]));
			expect(val).toBeCloseTo(Math.sqrt(2), 10);
		});

		it('converts 3 + 2*sqrt(2)', () => {
			const c = coef([
				{ rational: r(3n), radicals: [] },
				{ rational: r(2n), radicals: [sqrt2] }
			]);
			const val = algebraicToNumber(c);
			expect(val).toBeCloseTo(3 + 2 * Math.sqrt(2), 10);
		});
	});

	// ===========================================================================
	// Integration Tests
	// ===========================================================================

	describe('integration', () => {
		it('(sqrt(2) + sqrt(3))^2 = 5 + 2*sqrt(6)', () => {
			const a = coef([
				{ rational: r(1n), radicals: [sqrt2] },
				{ rational: r(1n), radicals: [sqrt3] }
			]);
			const result = mulAlgebraic(a, a);
			// (sqrt(2) + sqrt(3))^2 = 2 + 2*sqrt(6) + 3 = 5 + 2*sqrt(6)
			const pureRational = result.terms.find((t) => t.radicals.length === 0);
			const radicalTerm = result.terms.find((t) => t.radicals.length > 0);
			expect(pureRational?.rational.n).toBe(5n);
			expect(radicalTerm?.rational.n).toBe(2n);
			expect(radicalTerm?.radicals[0].radicand).toBe(6n);
		});

		it('(sqrt(2) - 1)(sqrt(2) + 1) = 1', () => {
			const sqrt2Plus1 = coef([
				{ rational: r(1n), radicals: [sqrt2] },
				{ rational: r(1n), radicals: [] }
			]);
			const sqrt2Minus1 = coef([
				{ rational: r(1n), radicals: [sqrt2] },
				{ rational: r(-1n), radicals: [] }
			]);
			const result = mulAlgebraic(sqrt2Plus1, sqrt2Minus1);
			// (sqrt(2) + 1)(sqrt(2) - 1) = 2 - 1 = 1
			expect(result.terms.length).toBe(1);
			expect(result.terms[0].radicals.length).toBe(0);
			expect(result.terms[0].rational.n).toBe(1n);
		});

		it('verifies numerical value of complex expression', () => {
			const a = coef([
				{ rational: r(2n), radicals: [sqrt2] },
				{ rational: r(3n), radicals: [sqrt3] }
			]);
			const expected = 2 * Math.sqrt(2) + 3 * Math.sqrt(3);
			expect(algebraicToNumber(a)).toBeCloseTo(expected, 10);
		});
	});
});
