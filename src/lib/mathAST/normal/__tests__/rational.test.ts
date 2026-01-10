/**
 * Unit tests for rational arithmetic module
 */

import { describe, it, expect } from 'vitest';
import {
	// Constants
	ZERO,
	ONE,
	MINUS_ONE,
	TWO,
	HALF,
	// Helpers
	gcd,
	lcm,
	absBigInt,
	// Constructor
	rational,
	fromInteger,
	// Arithmetic
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	absRational,
	reciprocal,
	powRational,
	// Rounding
	floorRational,
	ceilRational,
	roundRational,
	// Comparison
	compareRational,
	equalRational,
	// Predicates
	isZero,
	isOne,
	isMinusOne,
	isNegative,
	isPositive,
	isInteger,
	// Conversion
	rationalToNumber,
	rationalToString,
	parseRational
} from '../rational';

describe('rational', () => {
	// ===========================================================================
	// Constants
	// ===========================================================================

	describe('constants', () => {
		it('ZERO is 0/1', () => {
			expect(ZERO.n).toBe(0n);
			expect(ZERO.d).toBe(1n);
		});

		it('ONE is 1/1', () => {
			expect(ONE.n).toBe(1n);
			expect(ONE.d).toBe(1n);
		});

		it('MINUS_ONE is -1/1', () => {
			expect(MINUS_ONE.n).toBe(-1n);
			expect(MINUS_ONE.d).toBe(1n);
		});

		it('TWO is 2/1', () => {
			expect(TWO.n).toBe(2n);
			expect(TWO.d).toBe(1n);
		});

		it('HALF is 1/2', () => {
			expect(HALF.n).toBe(1n);
			expect(HALF.d).toBe(2n);
		});
	});

	// ===========================================================================
	// Helper Functions
	// ===========================================================================

	describe('gcd', () => {
		it('computes gcd of positive numbers', () => {
			expect(gcd(12n, 8n)).toBe(4n);
			expect(gcd(8n, 12n)).toBe(4n);
			expect(gcd(17n, 13n)).toBe(1n);
			expect(gcd(100n, 25n)).toBe(25n);
		});

		it('handles negative numbers', () => {
			expect(gcd(-12n, 8n)).toBe(4n);
			expect(gcd(12n, -8n)).toBe(4n);
			expect(gcd(-12n, -8n)).toBe(4n);
		});

		it('handles zero', () => {
			expect(gcd(0n, 5n)).toBe(5n);
			expect(gcd(5n, 0n)).toBe(5n);
			expect(gcd(0n, 0n)).toBe(0n);
		});

		it('gcd(a, a) = a', () => {
			expect(gcd(7n, 7n)).toBe(7n);
		});
	});

	describe('lcm', () => {
		it('computes lcm of positive numbers', () => {
			expect(lcm(4n, 6n)).toBe(12n);
			expect(lcm(3n, 5n)).toBe(15n);
			expect(lcm(12n, 8n)).toBe(24n);
		});

		it('handles negative numbers', () => {
			expect(lcm(-4n, 6n)).toBe(12n);
			expect(lcm(4n, -6n)).toBe(12n);
		});

		it('handles zero', () => {
			expect(lcm(0n, 5n)).toBe(0n);
			expect(lcm(5n, 0n)).toBe(0n);
		});

		it('lcm(a, a) = a', () => {
			expect(lcm(7n, 7n)).toBe(7n);
		});
	});

	describe('absBigInt', () => {
		it('returns absolute value', () => {
			expect(absBigInt(5n)).toBe(5n);
			expect(absBigInt(-5n)).toBe(5n);
			expect(absBigInt(0n)).toBe(0n);
		});
	});

	// ===========================================================================
	// Constructor
	// ===========================================================================

	describe('rational', () => {
		it('creates rational from numerator and denominator', () => {
			const r = rational(3n, 4n);
			expect(r.n).toBe(3n);
			expect(r.d).toBe(4n);
		});

		it('reduces fractions', () => {
			const r = rational(6n, 9n);
			expect(r.n).toBe(2n);
			expect(r.d).toBe(3n);
		});

		it('reduces complex fractions', () => {
			const r = rational(100n, 25n);
			expect(r.n).toBe(4n);
			expect(r.d).toBe(1n);
		});

		it('normalizes sign to numerator', () => {
			const r1 = rational(-6n, 9n);
			expect(r1.n).toBe(-2n);
			expect(r1.d).toBe(3n);

			const r2 = rational(6n, -9n);
			expect(r2.n).toBe(-2n);
			expect(r2.d).toBe(3n);

			const r3 = rational(-6n, -9n);
			expect(r3.n).toBe(2n);
			expect(r3.d).toBe(3n);
		});

		it('returns ZERO for zero numerator', () => {
			const r = rational(0n, 5n);
			expect(r).toBe(ZERO);
		});

		it('throws for zero denominator', () => {
			expect(() => rational(5n, 0n)).toThrow('denominator cannot be zero');
		});
	});

	describe('fromInteger', () => {
		it('creates rational from BigInt', () => {
			const r = fromInteger(5n);
			expect(r.n).toBe(5n);
			expect(r.d).toBe(1n);
		});

		it('creates rational from number', () => {
			const r = fromInteger(5);
			expect(r.n).toBe(5n);
			expect(r.d).toBe(1n);
		});

		it('returns constants for special values', () => {
			expect(fromInteger(0)).toBe(ZERO);
			expect(fromInteger(1)).toBe(ONE);
			expect(fromInteger(-1)).toBe(MINUS_ONE);
		});
	});

	// ===========================================================================
	// Arithmetic Operations
	// ===========================================================================

	describe('addRational', () => {
		it('adds fractions with same denominator', () => {
			const r = addRational(rational(1n, 4n), rational(2n, 4n));
			expect(r.n).toBe(3n);
			expect(r.d).toBe(4n);
		});

		it('adds fractions with different denominators', () => {
			const r = addRational(rational(1n, 2n), rational(1n, 3n));
			expect(r.n).toBe(5n);
			expect(r.d).toBe(6n);
		});

		it('adds and reduces', () => {
			const r = addRational(rational(1n, 4n), rational(3n, 4n));
			expect(r.n).toBe(1n);
			expect(r.d).toBe(1n);
		});

		it('adds negative fractions', () => {
			const r = addRational(rational(1n, 2n), rational(-1n, 3n));
			expect(r.n).toBe(1n);
			expect(r.d).toBe(6n);
		});

		it('a + 0 = a', () => {
			const a = rational(3n, 4n);
			expect(addRational(a, ZERO)).toEqual(a);
		});
	});

	describe('subRational', () => {
		it('subtracts fractions', () => {
			const r = subRational(rational(1n, 2n), rational(1n, 3n));
			expect(r.n).toBe(1n);
			expect(r.d).toBe(6n);
		});

		it('subtracts to zero', () => {
			const a = rational(3n, 4n);
			const r = subRational(a, a);
			expect(r).toBe(ZERO);
		});

		it('subtracts to negative', () => {
			const r = subRational(rational(1n, 3n), rational(1n, 2n));
			expect(r.n).toBe(-1n);
			expect(r.d).toBe(6n);
		});
	});

	describe('mulRational', () => {
		it('multiplies fractions', () => {
			const r = mulRational(rational(2n, 3n), rational(3n, 4n));
			expect(r.n).toBe(1n);
			expect(r.d).toBe(2n);
		});

		it('a * 0 = 0', () => {
			const a = rational(3n, 4n);
			expect(mulRational(a, ZERO)).toBe(ZERO);
		});

		it('a * 1 = a', () => {
			const a = rational(3n, 4n);
			expect(mulRational(a, ONE)).toEqual(a);
		});

		it('handles negative fractions', () => {
			const r = mulRational(rational(-2n, 3n), rational(3n, 4n));
			expect(r.n).toBe(-1n);
			expect(r.d).toBe(2n);
		});
	});

	describe('divRational', () => {
		it('divides fractions', () => {
			const r = divRational(rational(2n, 3n), rational(4n, 5n));
			expect(r.n).toBe(5n);
			expect(r.d).toBe(6n);
		});

		it('0 / a = 0', () => {
			const a = rational(3n, 4n);
			expect(divRational(ZERO, a)).toBe(ZERO);
		});

		it('a / 1 = a', () => {
			const a = rational(3n, 4n);
			expect(divRational(a, ONE)).toEqual(a);
		});

		it('throws on division by zero', () => {
			expect(() => divRational(ONE, ZERO)).toThrow('division by zero');
		});
	});

	describe('negRational', () => {
		it('negates positive', () => {
			const r = negRational(rational(3n, 4n));
			expect(r.n).toBe(-3n);
			expect(r.d).toBe(4n);
		});

		it('negates negative', () => {
			const r = negRational(rational(-3n, 4n));
			expect(r.n).toBe(3n);
			expect(r.d).toBe(4n);
		});

		it('negates zero', () => {
			expect(negRational(ZERO)).toBe(ZERO);
		});
	});

	describe('absRational', () => {
		it('returns absolute value', () => {
			expect(absRational(rational(3n, 4n))).toEqual(rational(3n, 4n));
			expect(absRational(rational(-3n, 4n))).toEqual(rational(3n, 4n));
		});
	});

	describe('reciprocal', () => {
		it('computes reciprocal', () => {
			const r = reciprocal(rational(3n, 4n));
			expect(r.n).toBe(4n);
			expect(r.d).toBe(3n);
		});

		it('handles negative', () => {
			const r = reciprocal(rational(-3n, 4n));
			expect(r.n).toBe(-4n);
			expect(r.d).toBe(3n);
		});

		it('throws for zero', () => {
			expect(() => reciprocal(ZERO)).toThrow('reciprocal of zero');
		});
	});

	describe('powRational', () => {
		it('computes positive integer power', () => {
			const r = powRational(rational(2n, 3n), 2);
			expect(r.n).toBe(4n);
			expect(r.d).toBe(9n);
		});

		it('computes negative integer power', () => {
			const r = powRational(rational(2n, 3n), -1);
			expect(r.n).toBe(3n);
			expect(r.d).toBe(2n);
		});

		it('x^0 = 1', () => {
			expect(powRational(rational(5n, 7n), 0)).toEqual(ONE);
		});

		it('x^1 = x', () => {
			const a = rational(5n, 7n);
			expect(powRational(a, 1)).toEqual(a);
		});

		it('0^n = 0 for positive n', () => {
			expect(powRational(ZERO, 5)).toBe(ZERO);
		});

		it('throws for 0^negative', () => {
			expect(() => powRational(ZERO, -1)).toThrow('0 raised to negative power');
		});

		it('throws for non-integer exponent', () => {
			expect(() => powRational(rational(2n, 3n), 1.5)).toThrow('must be an integer');
		});
	});

	// ===========================================================================
	// Comparison Operations
	// ===========================================================================

	describe('compareRational', () => {
		it('compares less than', () => {
			expect(compareRational(rational(1n, 3n), rational(1n, 2n))).toBe(-1);
		});

		it('compares greater than', () => {
			expect(compareRational(rational(1n, 2n), rational(1n, 3n))).toBe(1);
		});

		it('compares equal', () => {
			expect(compareRational(rational(2n, 4n), rational(1n, 2n))).toBe(0);
		});

		it('compares negative numbers', () => {
			expect(compareRational(rational(-1n, 2n), rational(-1n, 3n))).toBe(-1);
			expect(compareRational(rational(-1n, 3n), rational(-1n, 2n))).toBe(1);
		});

		it('compares across zero', () => {
			expect(compareRational(rational(-1n, 2n), rational(1n, 2n))).toBe(-1);
		});
	});

	describe('equalRational', () => {
		it('returns true for equal rationals', () => {
			expect(equalRational(rational(2n, 4n), rational(1n, 2n))).toBe(true);
		});

		it('returns false for unequal rationals', () => {
			expect(equalRational(rational(1n, 2n), rational(1n, 3n))).toBe(false);
		});
	});

	// ===========================================================================
	// Predicates
	// ===========================================================================

	describe('predicates', () => {
		it('isZero', () => {
			expect(isZero(ZERO)).toBe(true);
			expect(isZero(ONE)).toBe(false);
			expect(isZero(rational(0n, 5n))).toBe(true);
		});

		it('isOne', () => {
			expect(isOne(ONE)).toBe(true);
			expect(isOne(ZERO)).toBe(false);
			expect(isOne(rational(2n, 2n))).toBe(true);
		});

		it('isMinusOne', () => {
			expect(isMinusOne(MINUS_ONE)).toBe(true);
			expect(isMinusOne(ONE)).toBe(false);
			expect(isMinusOne(rational(-2n, 2n))).toBe(true);
		});

		it('isNegative', () => {
			expect(isNegative(rational(-1n, 2n))).toBe(true);
			expect(isNegative(rational(1n, 2n))).toBe(false);
			expect(isNegative(ZERO)).toBe(false);
		});

		it('isPositive', () => {
			expect(isPositive(rational(1n, 2n))).toBe(true);
			expect(isPositive(rational(-1n, 2n))).toBe(false);
			expect(isPositive(ZERO)).toBe(false);
		});

		it('isInteger', () => {
			expect(isInteger(ONE)).toBe(true);
			expect(isInteger(rational(4n, 2n))).toBe(true);
			expect(isInteger(rational(3n, 4n))).toBe(false);
		});
	});

	// ===========================================================================
	// Conversion
	// ===========================================================================

	describe('rationalToNumber', () => {
		it('converts to number', () => {
			expect(rationalToNumber(rational(1n, 2n))).toBe(0.5);
			expect(rationalToNumber(rational(1n, 3n))).toBeCloseTo(0.333333, 5);
			expect(rationalToNumber(rational(5n, 1n))).toBe(5);
		});
	});

	describe('rationalToString', () => {
		it('converts fraction to string', () => {
			expect(rationalToString(rational(3n, 4n))).toBe('3/4');
		});

		it('converts integer to string without denominator', () => {
			expect(rationalToString(rational(5n, 1n))).toBe('5');
		});

		it('converts negative to string', () => {
			expect(rationalToString(rational(-3n, 4n))).toBe('-3/4');
		});
	});

	describe('parseRational', () => {
		it('parses fraction string', () => {
			const r = parseRational('3/4');
			expect(r.n).toBe(3n);
			expect(r.d).toBe(4n);
		});

		it('parses integer string', () => {
			const r = parseRational('5');
			expect(r.n).toBe(5n);
			expect(r.d).toBe(1n);
		});

		it('parses negative fraction', () => {
			const r = parseRational('-3/4');
			expect(r.n).toBe(-3n);
			expect(r.d).toBe(4n);
		});

		it('parses with whitespace', () => {
			const r = parseRational('  3 / 4  ');
			expect(r.n).toBe(3n);
			expect(r.d).toBe(4n);
		});

		it('reduces parsed fraction', () => {
			const r = parseRational('6/9');
			expect(r.n).toBe(2n);
			expect(r.d).toBe(3n);
		});
	});

	// ===========================================================================
	// Edge Cases and Integration
	// ===========================================================================

	describe('edge cases', () => {
		it('handles large numbers', () => {
			const large = 10n ** 20n;
			const r = rational(large, large * 2n);
			expect(r.n).toBe(1n);
			expect(r.d).toBe(2n);
		});

		it('arithmetic with large numbers', () => {
			const a = rational(10n ** 15n, 10n ** 10n);
			const b = rational(10n ** 10n, 10n ** 15n);
			const product = mulRational(a, b);
			expect(product).toEqual(ONE);
		});
	});

	// ===========================================================================
	// Rounding Functions
	// ===========================================================================

	describe('floorRational', () => {
		it('floor of positive integer returns same', () => {
			expect(floorRational(rational(5n, 1n))).toBe(5n);
		});

		it('floor of positive fraction rounds down', () => {
			expect(floorRational(rational(7n, 2n))).toBe(3n); // 3.5 -> 3
			expect(floorRational(rational(7n, 3n))).toBe(2n); // 2.33 -> 2
			expect(floorRational(rational(10n, 3n))).toBe(3n); // 3.33 -> 3
		});

		it('floor of negative integer returns same', () => {
			expect(floorRational(rational(-5n, 1n))).toBe(-5n);
		});

		it('floor of negative fraction rounds toward -∞', () => {
			expect(floorRational(rational(-7n, 2n))).toBe(-4n); // -3.5 -> -4
			expect(floorRational(rational(-7n, 3n))).toBe(-3n); // -2.33 -> -3
			expect(floorRational(rational(-1n, 2n))).toBe(-1n); // -0.5 -> -1
		});

		it('floor of zero is zero', () => {
			expect(floorRational(ZERO)).toBe(0n);
		});
	});

	describe('ceilRational', () => {
		it('ceil of positive integer returns same', () => {
			expect(ceilRational(rational(5n, 1n))).toBe(5n);
		});

		it('ceil of positive fraction rounds up', () => {
			expect(ceilRational(rational(7n, 2n))).toBe(4n); // 3.5 -> 4
			expect(ceilRational(rational(7n, 3n))).toBe(3n); // 2.33 -> 3
			expect(ceilRational(rational(1n, 2n))).toBe(1n); // 0.5 -> 1
		});

		it('ceil of negative integer returns same', () => {
			expect(ceilRational(rational(-5n, 1n))).toBe(-5n);
		});

		it('ceil of negative fraction rounds toward +∞', () => {
			expect(ceilRational(rational(-7n, 2n))).toBe(-3n); // -3.5 -> -3
			expect(ceilRational(rational(-7n, 3n))).toBe(-2n); // -2.33 -> -2
			expect(ceilRational(rational(-1n, 2n))).toBe(0n); // -0.5 -> 0
		});

		it('ceil of zero is zero', () => {
			expect(ceilRational(ZERO)).toBe(0n);
		});
	});

	describe('roundRational', () => {
		it('round of integer returns same', () => {
			expect(roundRational(rational(5n, 1n))).toBe(5n);
			expect(roundRational(rational(-5n, 1n))).toBe(-5n);
		});

		it('round rounds to nearest integer', () => {
			expect(roundRational(rational(7n, 3n))).toBe(2n); // 2.33 -> 2
			expect(roundRational(rational(8n, 3n))).toBe(3n); // 2.67 -> 3
		});

		it('round at 0.5 rounds away from zero (half-up)', () => {
			expect(roundRational(rational(1n, 2n))).toBe(1n); // 0.5 -> 1
			expect(roundRational(rational(3n, 2n))).toBe(2n); // 1.5 -> 2
			expect(roundRational(rational(5n, 2n))).toBe(3n); // 2.5 -> 3
			expect(roundRational(rational(7n, 2n))).toBe(4n); // 3.5 -> 4
		});

		it('round negative at 0.5 rounds away from zero', () => {
			expect(roundRational(rational(-1n, 2n))).toBe(-1n); // -0.5 -> -1
			expect(roundRational(rational(-3n, 2n))).toBe(-2n); // -1.5 -> -2
			expect(roundRational(rational(-5n, 2n))).toBe(-3n); // -2.5 -> -3
			expect(roundRational(rational(-7n, 2n))).toBe(-4n); // -3.5 -> -4
		});

		it('round of zero is zero', () => {
			expect(roundRational(ZERO)).toBe(0n);
		});
	});
});
