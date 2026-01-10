/**
 * Tests for endpoint.ts
 *
 * Tests endpoint value comparison including infinity handling.
 * Uses MathNode-based endpoints from mathAST.
 */

import { describe, it, expect } from 'vitest';
import {
	compareEndpointValues,
	compare,
	endpointEquals,
	endpointLessThan,
	endpointToNumber,
	isInfinite,
	isPositiveInfinity,
	isNegativeInfinity
} from '../endpoint';
import { number, infinity, func, fraction, greek, variable, power } from '$lib/mathAST/factory';
import type { EndpointValue } from '../types';
import {
	endpointLessThanOrEqual,
	endpointGreaterThan,
	endpointGreaterThanOrEqual
} from '../endpoint';

// Helpers to create endpoint values using MathNode
function numericEndpoint(n: number): EndpointValue {
	return number(n.toString());
}

function rationalEndpoint(num: number, denom: number): EndpointValue {
	return fraction(number(num.toString()), number(denom.toString()));
}

function sqrtEndpoint(radicand: number): EndpointValue {
	return func('sqrt', [number(radicand.toString())]);
}

const posInf: EndpointValue = infinity('positive');
const negInf: EndpointValue = infinity('negative');

describe('compareEndpointValues', () => {
	describe('infinity comparisons', () => {
		it('compares -infinity < +infinity', () => {
			const result = compareEndpointValues(negInf, posInf);
			expect(result.outcome).toBe(-1);
		});

		it('compares +infinity = +infinity', () => {
			const result = compareEndpointValues(posInf, posInf);
			expect(result.outcome).toBe(0);
		});

		it('compares -infinity = -infinity', () => {
			const result = compareEndpointValues(negInf, negInf);
			expect(result.outcome).toBe(0);
		});

		it('compares +infinity > -infinity', () => {
			const result = compareEndpointValues(posInf, negInf);
			expect(result.outcome).toBe(1);
		});
	});

	describe('infinity vs numeric', () => {
		it('compares -infinity < 0', () => {
			const zero = numericEndpoint(0);
			const result = compareEndpointValues(negInf, zero);
			expect(result.outcome).toBe(-1);
		});

		it('compares +infinity > 0', () => {
			const zero = numericEndpoint(0);
			const result = compareEndpointValues(posInf, zero);
			expect(result.outcome).toBe(1);
		});

		it('compares -infinity < sqrt(2)', () => {
			const sqrt2 = sqrtEndpoint(2);
			const result = compareEndpointValues(negInf, sqrt2);
			expect(result.outcome).toBe(-1);
		});

		it('compares sqrt(2) < +infinity', () => {
			const sqrt2 = sqrtEndpoint(2);
			const result = compareEndpointValues(sqrt2, posInf);
			expect(result.outcome).toBe(-1);
		});
	});

	describe('numeric comparisons', () => {
		it('compares 1 < 2', () => {
			const one = numericEndpoint(1);
			const two = numericEndpoint(2);
			const result = compareEndpointValues(one, two);
			expect(result.outcome).toBe(-1);
		});

		it('compares sqrt(2) < 3/2', () => {
			const sqrt2 = sqrtEndpoint(2);
			const threeHalves = rationalEndpoint(3, 2);
			const result = compareEndpointValues(sqrt2, threeHalves);
			expect(result.outcome).toBe(-1);
		});

		it('compares sqrt(2) < sqrt(3)', () => {
			const sqrt2 = sqrtEndpoint(2);
			const sqrt3 = sqrtEndpoint(3);
			const result = compareEndpointValues(sqrt2, sqrt3);
			expect(result.outcome).toBe(-1);
		});

		it('compares 5 = 5', () => {
			const a = numericEndpoint(5);
			const b = numericEndpoint(5);
			const result = compareEndpointValues(a, b);
			expect(result.outcome).toBe(0);
		});
	});
});

describe('compare (simple version)', () => {
	it('returns just the result', () => {
		const one = numericEndpoint(1);
		const two = numericEndpoint(2);
		expect(compare(one, two)).toBe(-1);
	});

	it('handles symbolic expressions', () => {
		const sqrt2 = sqrtEndpoint(2);
		const sqrt3 = sqrtEndpoint(3);
		expect(compare(sqrt2, sqrt3)).toBe(-1);
	});
});

describe('endpointEquals', () => {
	it('returns true for equal values', () => {
		const a = numericEndpoint(5);
		const b = numericEndpoint(5);
		expect(endpointEquals(a, b)).toBe(true);
	});

	it('returns false for different values', () => {
		const a = numericEndpoint(5);
		const b = numericEndpoint(6);
		expect(endpointEquals(a, b)).toBe(false);
	});

	it('returns true for equal infinities', () => {
		expect(endpointEquals(posInf, posInf)).toBe(true);
	});

	it('returns true for equal symbolic expressions', () => {
		const a = sqrtEndpoint(2);
		const b = sqrtEndpoint(2);
		expect(endpointEquals(a, b)).toBe(true);
	});
});

describe('endpointLessThan', () => {
	it('returns true when a < b', () => {
		const one = numericEndpoint(1);
		const two = numericEndpoint(2);
		expect(endpointLessThan(one, two)).toBe(true);
	});

	it('returns false when a >= b', () => {
		const two = numericEndpoint(2);
		const one = numericEndpoint(1);
		expect(endpointLessThan(two, one)).toBe(false);
	});

	it('works with symbolic expressions', () => {
		const sqrt2 = sqrtEndpoint(2);
		const sqrt3 = sqrtEndpoint(3);
		expect(endpointLessThan(sqrt2, sqrt3)).toBe(true);
	});
});

describe('endpointToNumber', () => {
	it('converts positive infinity', () => {
		expect(endpointToNumber(posInf)).toBe(Infinity);
	});

	it('converts negative infinity', () => {
		expect(endpointToNumber(negInf)).toBe(-Infinity);
	});

	it('converts numeric value', () => {
		const five = numericEndpoint(5);
		expect(endpointToNumber(five)).toBe(5);
	});

	it('converts rational (approximate)', () => {
		const threeHalves = rationalEndpoint(3, 2);
		expect(endpointToNumber(threeHalves)).toBe(1.5);
	});

	it('converts radical (approximate)', () => {
		const sqrt2 = sqrtEndpoint(2);
		expect(endpointToNumber(sqrt2)).toBeCloseTo(Math.sqrt(2));
	});
});

describe('infinity predicates', () => {
	it('isInfinite returns true for infinities', () => {
		expect(isInfinite(posInf)).toBe(true);
		expect(isInfinite(negInf)).toBe(true);
	});

	it('isInfinite returns false for numeric values', () => {
		const one = numericEndpoint(1);
		expect(isInfinite(one)).toBe(false);
	});

	it('isPositiveInfinity works correctly', () => {
		expect(isPositiveInfinity(posInf)).toBe(true);
		expect(isPositiveInfinity(negInf)).toBe(false);
	});

	it('isNegativeInfinity works correctly', () => {
		expect(isNegativeInfinity(negInf)).toBe(true);
		expect(isNegativeInfinity(posInf)).toBe(false);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('compareEndpointValues edge cases', () => {
	describe('symbolically different but numerically equal', () => {
		it('compares sqrt(4) = 2', () => {
			const sqrt4 = sqrtEndpoint(4);
			const two = numericEndpoint(2);
			const result = compareEndpointValues(sqrt4, two);
			expect(result.outcome).toBe(0);
		});

		it('compares sqrt(9) = 3', () => {
			const sqrt9 = sqrtEndpoint(9);
			const three = numericEndpoint(3);
			const result = compareEndpointValues(sqrt9, three);
			expect(result.outcome).toBe(0);
		});

		it('compares 2/4 = 1/2', () => {
			const twoFourths = rationalEndpoint(2, 4);
			const oneHalf = rationalEndpoint(1, 2);
			const result = compareEndpointValues(twoFourths, oneHalf);
			expect(result.outcome).toBe(0);
		});

		it('compares sqrt(1) = 1', () => {
			const sqrt1 = sqrtEndpoint(1);
			const one = numericEndpoint(1);
			const result = compareEndpointValues(sqrt1, one);
			expect(result.outcome).toBe(0);
		});
	});

	describe('variables and undefined comparisons', () => {
		it('returns undefined for variable comparison', () => {
			const x = variable('x');
			const one = numericEndpoint(1);
			const result = compareEndpointValues(x, one);
			expect(result.outcome).toBeUndefined();
		});

		it('returns undefined for two different variables', () => {
			const x = variable('x');
			const y = variable('y');
			const result = compareEndpointValues(x, y);
			expect(result.outcome).toBeUndefined();
		});

		it('returns undefined for same variable (structural equality not checked)', () => {
			const x1 = variable('x');
			const x2 = variable('x');
			const result = compareEndpointValues(x1, x2);
			// compareNumericNodes can't evaluate variables, even if they're the same
			expect(result.outcome).toBeUndefined();
		});
	});

	describe('special constants', () => {
		it('compares pi > 3', () => {
			const piVal = greek('pi');
			const three = numericEndpoint(3);
			const result = compareEndpointValues(piVal, three);
			expect(result.outcome).toBe(1);
		});

		it('compares pi < 4', () => {
			const piVal = greek('pi');
			const four = numericEndpoint(4);
			const result = compareEndpointValues(piVal, four);
			expect(result.outcome).toBe(-1);
		});

		it('compares pi = pi', () => {
			const pi1 = greek('pi');
			const pi2 = greek('pi');
			const result = compareEndpointValues(pi1, pi2);
			expect(result.outcome).toBe(0);
		});

		it('compares e > 2', () => {
			const eVal = variable('e');
			const two = numericEndpoint(2);
			const result = compareEndpointValues(eVal, two);
			expect(result.outcome).toBe(1);
		});

		it('compares e < 3', () => {
			const eVal = variable('e');
			const three = numericEndpoint(3);
			const result = compareEndpointValues(eVal, three);
			expect(result.outcome).toBe(-1);
		});
	});

	describe('nested functions', () => {
		it('compares sqrt(sqrt(16)) = 2', () => {
			const sqrtSqrt16 = func('sqrt', [func('sqrt', [number('16')])]);
			const two = numericEndpoint(2);
			const result = compareEndpointValues(sqrtSqrt16, two);
			expect(result.outcome).toBe(0);
		});

		it('compares sqrt(2) < sqrt(3) < sqrt(5)', () => {
			const sqrt2 = sqrtEndpoint(2);
			const sqrt3 = sqrtEndpoint(3);
			const sqrt5 = sqrtEndpoint(5);
			expect(compareEndpointValues(sqrt2, sqrt3).outcome).toBe(-1);
			expect(compareEndpointValues(sqrt3, sqrt5).outcome).toBe(-1);
			expect(compareEndpointValues(sqrt2, sqrt5).outcome).toBe(-1);
		});
	});

	describe('powers', () => {
		it('compares 2^3 = 8', () => {
			const twoToThird = power(number('2'), number('3'));
			const eight = numericEndpoint(8);
			const result = compareEndpointValues(twoToThird, eight);
			expect(result.outcome).toBe(0);
		});

		it('compares 2^10 = 1024', () => {
			const twoToTenth = power(number('2'), number('10'));
			const thousand24 = numericEndpoint(1024);
			const result = compareEndpointValues(twoToTenth, thousand24);
			expect(result.outcome).toBe(0);
		});
	});

	describe('extreme numeric values', () => {
		it('compares large numbers', () => {
			const large1 = numericEndpoint(1e10);
			const large2 = numericEndpoint(1e10 + 1);
			const result = compareEndpointValues(large1, large2);
			expect(result.outcome).toBe(-1);
		});

		it('compares small positive numbers', () => {
			// Use numbers that are small but not too close to zero
			const small1 = numericEndpoint(0.0001);
			const small2 = numericEndpoint(0.0002);
			const result = compareEndpointValues(small1, small2);
			expect(result.outcome).toBe(-1);
		});

		it('compares negative numbers', () => {
			const neg5 = numericEndpoint(-5);
			const neg3 = numericEndpoint(-3);
			const result = compareEndpointValues(neg5, neg3);
			expect(result.outcome).toBe(-1);
		});

		it('compares -1 < 0 < 1', () => {
			const negOne = numericEndpoint(-1);
			const zero = numericEndpoint(0);
			const one = numericEndpoint(1);
			expect(compareEndpointValues(negOne, zero).outcome).toBe(-1);
			expect(compareEndpointValues(zero, one).outcome).toBe(-1);
			expect(compareEndpointValues(negOne, one).outcome).toBe(-1);
		});
	});

	describe('zero edge cases', () => {
		it('compares 0 = 0', () => {
			const zero1 = numericEndpoint(0);
			const zero2 = numericEndpoint(0);
			const result = compareEndpointValues(zero1, zero2);
			expect(result.outcome).toBe(0);
		});

		it('compares -0 = 0', () => {
			const negZero = numericEndpoint(-0);
			const zero = numericEndpoint(0);
			const result = compareEndpointValues(negZero, zero);
			expect(result.outcome).toBe(0);
		});

		it('compares 0/1 = 0', () => {
			const zeroFrac = rationalEndpoint(0, 1);
			const zero = numericEndpoint(0);
			const result = compareEndpointValues(zeroFrac, zero);
			expect(result.outcome).toBe(0);
		});
	});

	describe('rational edge cases', () => {
		it('compares 1/3 < 1/2 < 2/3', () => {
			const oneThird = rationalEndpoint(1, 3);
			const oneHalf = rationalEndpoint(1, 2);
			const twoThirds = rationalEndpoint(2, 3);
			expect(compareEndpointValues(oneThird, oneHalf).outcome).toBe(-1);
			expect(compareEndpointValues(oneHalf, twoThirds).outcome).toBe(-1);
		});

		it('compares negative rationals', () => {
			const negHalf = rationalEndpoint(-1, 2);
			const negThird = rationalEndpoint(-1, 3);
			const result = compareEndpointValues(negHalf, negThird);
			expect(result.outcome).toBe(-1); // -1/2 < -1/3
		});
	});
});

describe('comparison helper functions edge cases', () => {
	describe('endpointLessThanOrEqual', () => {
		it('returns true when a < b', () => {
			const one = numericEndpoint(1);
			const two = numericEndpoint(2);
			expect(endpointLessThanOrEqual(one, two)).toBe(true);
		});

		it('returns true when a = b', () => {
			const five = numericEndpoint(5);
			const fiveAgain = numericEndpoint(5);
			expect(endpointLessThanOrEqual(five, fiveAgain)).toBe(true);
		});

		it('returns false when a > b', () => {
			const three = numericEndpoint(3);
			const two = numericEndpoint(2);
			expect(endpointLessThanOrEqual(three, two)).toBe(false);
		});

		it('works with symbolic expressions', () => {
			const sqrt2 = sqrtEndpoint(2);
			const two = numericEndpoint(2);
			expect(endpointLessThanOrEqual(sqrt2, two)).toBe(true); // sqrt(2) ≈ 1.41 < 2
		});

		it('handles infinity correctly', () => {
			const one = numericEndpoint(1);
			expect(endpointLessThanOrEqual(negInf, one)).toBe(true);
			expect(endpointLessThanOrEqual(one, posInf)).toBe(true);
			expect(endpointLessThanOrEqual(negInf, posInf)).toBe(true);
		});
	});

	describe('endpointGreaterThan', () => {
		it('returns true when a > b', () => {
			const two = numericEndpoint(2);
			const one = numericEndpoint(1);
			expect(endpointGreaterThan(two, one)).toBe(true);
		});

		it('returns false when a = b', () => {
			const five = numericEndpoint(5);
			const fiveAgain = numericEndpoint(5);
			expect(endpointGreaterThan(five, fiveAgain)).toBe(false);
		});

		it('returns false when a < b', () => {
			const one = numericEndpoint(1);
			const two = numericEndpoint(2);
			expect(endpointGreaterThan(one, two)).toBe(false);
		});

		it('works with rationals', () => {
			const twoThirds = rationalEndpoint(2, 3);
			const oneHalf = rationalEndpoint(1, 2);
			expect(endpointGreaterThan(twoThirds, oneHalf)).toBe(true);
		});
	});

	describe('endpointGreaterThanOrEqual', () => {
		it('returns true when a > b', () => {
			const three = numericEndpoint(3);
			const two = numericEndpoint(2);
			expect(endpointGreaterThanOrEqual(three, two)).toBe(true);
		});

		it('returns true when a = b', () => {
			const pi1 = greek('pi');
			const pi2 = greek('pi');
			expect(endpointGreaterThanOrEqual(pi1, pi2)).toBe(true);
		});

		it('returns false when a < b', () => {
			const sqrt2 = sqrtEndpoint(2);
			const sqrt3 = sqrtEndpoint(3);
			expect(endpointGreaterThanOrEqual(sqrt2, sqrt3)).toBe(false);
		});
	});
});

describe('endpointToNumber edge cases', () => {
	it('converts nested sqrt', () => {
		const sqrtSqrt16 = func('sqrt', [func('sqrt', [number('16')])]);
		expect(endpointToNumber(sqrtSqrt16)).toBe(2);
	});

	it('converts power expression', () => {
		const twoSquared = power(number('2'), number('2'));
		expect(endpointToNumber(twoSquared)).toBe(4);
	});

	it('converts negative numbers', () => {
		const negFive = numericEndpoint(-5);
		expect(endpointToNumber(negFive)).toBe(-5);
	});

	it('converts zero', () => {
		const zero = numericEndpoint(0);
		expect(endpointToNumber(zero)).toBe(0);
	});

	it('converts pi (approximate)', () => {
		const piVal = greek('pi');
		expect(endpointToNumber(piVal)).toBeCloseTo(Math.PI);
	});

	it('converts e (approximate)', () => {
		const eVal = variable('e');
		expect(endpointToNumber(eVal)).toBeCloseTo(Math.E);
	});

	it('converts negative sqrt', () => {
		const negSqrt2 = func('neg', [func('sqrt', [number('2')])]);
		// This depends on how neg is evaluated
		// For now, we test that it doesn't throw
		expect(() => endpointToNumber(negSqrt2)).not.toThrow();
	});
});

describe('endpointEquals edge cases', () => {
	it('returns true for structurally identical expressions', () => {
		const sqrt2a = sqrtEndpoint(2);
		const sqrt2b = sqrtEndpoint(2);
		expect(endpointEquals(sqrt2a, sqrt2b)).toBe(true);
	});

	it('returns true for numerically equal but structurally different', () => {
		const sqrt4 = sqrtEndpoint(4);
		const two = numericEndpoint(2);
		expect(endpointEquals(sqrt4, two)).toBe(true);
	});

	it('returns true for equivalent rationals', () => {
		const twoFourths = rationalEndpoint(2, 4);
		const oneHalf = rationalEndpoint(1, 2);
		expect(endpointEquals(twoFourths, oneHalf)).toBe(true);
	});

	it('returns false for different infinities', () => {
		expect(endpointEquals(posInf, negInf)).toBe(false);
	});

	it('handles pi comparisons', () => {
		const pi1 = greek('pi');
		const pi2 = greek('pi');
		expect(endpointEquals(pi1, pi2)).toBe(true);
	});
});
