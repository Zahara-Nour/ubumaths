/**
 * Tests for endpoint comparison and utilities.
 *
 * Tests endpoint value comparison including infinity handling.
 * Uses MathNode-based endpoints from mathAST.
 */

import { describe, it, expect } from 'vitest';
import {
	endpointToNumber,
	isInfiniteEndpoint,
	isPositiveInfinityEndpoint,
	isNegativeInfinityEndpoint
} from '../endpoint';
import { compare } from '../compare';
import {
	number,
	infinity,
	func,
	fraction,
	variable,
	power,
	piConstant,
	euler
} from '$lib/mathAST/factory';
import type { EndpointValue } from '../types';

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

describe('compare', () => {
	describe('infinity comparisons', () => {
		it('compares -infinity < +infinity', () => {
			expect(compare(negInf, posInf)).toBe(-1);
		});

		it('compares +infinity = +infinity', () => {
			expect(compare(posInf, posInf)).toBe(0);
		});

		it('compares -infinity = -infinity', () => {
			expect(compare(negInf, negInf)).toBe(0);
		});

		it('compares +infinity > -infinity', () => {
			expect(compare(posInf, negInf)).toBe(1);
		});
	});

	describe('infinity vs numeric', () => {
		it('compares -infinity < 0', () => {
			expect(compare(negInf, numericEndpoint(0))).toBe(-1);
		});

		it('compares +infinity > 0', () => {
			expect(compare(posInf, numericEndpoint(0))).toBe(1);
		});

		it('compares -infinity < sqrt(2)', () => {
			expect(compare(negInf, sqrtEndpoint(2))).toBe(-1);
		});

		it('compares sqrt(2) < +infinity', () => {
			expect(compare(sqrtEndpoint(2), posInf)).toBe(-1);
		});
	});

	describe('numeric comparisons', () => {
		it('compares 1 < 2', () => {
			expect(compare(numericEndpoint(1), numericEndpoint(2))).toBe(-1);
		});

		it('compares sqrt(2) < 3/2', () => {
			expect(compare(sqrtEndpoint(2), rationalEndpoint(3, 2))).toBe(-1);
		});

		it('compares sqrt(2) < sqrt(3)', () => {
			expect(compare(sqrtEndpoint(2), sqrtEndpoint(3))).toBe(-1);
		});

		it('compares 5 = 5', () => {
			expect(compare(numericEndpoint(5), numericEndpoint(5))).toBe(0);
		});
	});

	describe('equality: symbolically different but numerically equal', () => {
		it('compares sqrt(4) = 2', () => {
			expect(compare(sqrtEndpoint(4), numericEndpoint(2))).toBe(0);
		});

		it('compares sqrt(9) = 3', () => {
			expect(compare(sqrtEndpoint(9), numericEndpoint(3))).toBe(0);
		});

		it('compares 2/4 = 1/2', () => {
			expect(compare(rationalEndpoint(2, 4), rationalEndpoint(1, 2))).toBe(0);
		});

		it('compares sqrt(1) = 1', () => {
			expect(compare(sqrtEndpoint(1), numericEndpoint(1))).toBe(0);
		});
	});

	describe('variables and undefined comparisons', () => {
		it('returns undefined for variable comparison', () => {
			expect(compare(variable('x'), numericEndpoint(1))).toBeUndefined();
		});

		it('returns undefined for two different variables', () => {
			expect(compare(variable('x'), variable('y'))).toBeUndefined();
		});

		it('returns undefined for same variable (structural equality not checked)', () => {
			expect(compare(variable('x'), variable('x'))).toBeUndefined();
		});
	});

	describe('special constants', () => {
		it('compares pi > 3', () => {
			expect(compare(piConstant(), numericEndpoint(3))).toBe(1);
		});

		it('compares pi < 4', () => {
			expect(compare(piConstant(), numericEndpoint(4))).toBe(-1);
		});

		it('compares pi = pi', () => {
			expect(compare(piConstant(), piConstant())).toBe(0);
		});

		it('compares e > 2', () => {
			expect(compare(euler(), numericEndpoint(2))).toBe(1);
		});

		it('compares e < 3', () => {
			expect(compare(euler(), numericEndpoint(3))).toBe(-1);
		});
	});

	describe('nested functions', () => {
		it('compares sqrt(sqrt(16)) = 2', () => {
			const sqrtSqrt16 = func('sqrt', [func('sqrt', [number('16')])]);
			expect(compare(sqrtSqrt16, numericEndpoint(2))).toBe(0);
		});

		it('compares sqrt(2) < sqrt(3) < sqrt(5)', () => {
			expect(compare(sqrtEndpoint(2), sqrtEndpoint(3))).toBe(-1);
			expect(compare(sqrtEndpoint(3), sqrtEndpoint(5))).toBe(-1);
			expect(compare(sqrtEndpoint(2), sqrtEndpoint(5))).toBe(-1);
		});
	});

	describe('powers', () => {
		it('compares 2^3 = 8', () => {
			expect(compare(power(number('2'), number('3')), numericEndpoint(8))).toBe(0);
		});

		it('compares 2^10 = 1024', () => {
			expect(compare(power(number('2'), number('10')), numericEndpoint(1024))).toBe(0);
		});
	});

	describe('extreme numeric values', () => {
		it('compares large numbers', () => {
			expect(compare(numericEndpoint(1e10), numericEndpoint(1e10 + 1))).toBe(-1);
		});

		it('compares small positive numbers', () => {
			expect(compare(numericEndpoint(0.0001), numericEndpoint(0.0002))).toBe(-1);
		});

		it('compares negative numbers', () => {
			expect(compare(numericEndpoint(-5), numericEndpoint(-3))).toBe(-1);
		});

		it('compares -1 < 0 < 1', () => {
			expect(compare(numericEndpoint(-1), numericEndpoint(0))).toBe(-1);
			expect(compare(numericEndpoint(0), numericEndpoint(1))).toBe(-1);
			expect(compare(numericEndpoint(-1), numericEndpoint(1))).toBe(-1);
		});
	});

	describe('zero edge cases', () => {
		it('compares 0 = 0', () => {
			expect(compare(numericEndpoint(0), numericEndpoint(0))).toBe(0);
		});

		it('compares -0 = 0', () => {
			expect(compare(numericEndpoint(-0), numericEndpoint(0))).toBe(0);
		});

		it('compares 0/1 = 0', () => {
			expect(compare(rationalEndpoint(0, 1), numericEndpoint(0))).toBe(0);
		});
	});

	describe('rational edge cases', () => {
		it('compares 1/3 < 1/2 < 2/3', () => {
			expect(compare(rationalEndpoint(1, 3), rationalEndpoint(1, 2))).toBe(-1);
			expect(compare(rationalEndpoint(1, 2), rationalEndpoint(2, 3))).toBe(-1);
		});

		it('compares negative rationals', () => {
			expect(compare(rationalEndpoint(-1, 2), rationalEndpoint(-1, 3))).toBe(-1);
		});
	});

	describe('inequality checks via compare', () => {
		it('a < b', () => {
			expect(compare(numericEndpoint(1), numericEndpoint(2))! < 0).toBe(true);
		});

		it('a <= b (equal)', () => {
			expect(compare(numericEndpoint(5), numericEndpoint(5))! <= 0).toBe(true);
		});

		it('a <= b (less)', () => {
			expect(compare(sqrtEndpoint(2), numericEndpoint(2))! <= 0).toBe(true);
		});

		it('a > b', () => {
			expect(compare(numericEndpoint(2), numericEndpoint(1))! > 0).toBe(true);
		});

		it('a >= b (equal)', () => {
			expect(compare(piConstant(), piConstant())! >= 0).toBe(true);
		});

		it('a >= b (greater)', () => {
			expect(compare(numericEndpoint(3), numericEndpoint(2))! > 0).toBe(true);
		});

		it('handles infinity correctly', () => {
			expect(compare(negInf, numericEndpoint(1))! <= 0).toBe(true);
			expect(compare(numericEndpoint(1), posInf)! <= 0).toBe(true);
			expect(compare(negInf, posInf)! <= 0).toBe(true);
		});

		it('works with rationals', () => {
			expect(compare(rationalEndpoint(2, 3), rationalEndpoint(1, 2))! > 0).toBe(true);
		});
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
		expect(endpointToNumber(numericEndpoint(5))).toBe(5);
	});

	it('converts rational (approximate)', () => {
		expect(endpointToNumber(rationalEndpoint(3, 2))).toBe(1.5);
	});

	it('converts radical (approximate)', () => {
		expect(endpointToNumber(sqrtEndpoint(2))).toBeCloseTo(Math.sqrt(2));
	});

	it('converts nested sqrt', () => {
		const sqrtSqrt16 = func('sqrt', [func('sqrt', [number('16')])]);
		expect(endpointToNumber(sqrtSqrt16)).toBe(2);
	});

	it('converts power expression', () => {
		expect(endpointToNumber(power(number('2'), number('2')))).toBe(4);
	});

	it('converts negative numbers', () => {
		expect(endpointToNumber(numericEndpoint(-5))).toBe(-5);
	});

	it('converts zero', () => {
		expect(endpointToNumber(numericEndpoint(0))).toBe(0);
	});

	it('converts pi (approximate)', () => {
		expect(endpointToNumber(piConstant())).toBeCloseTo(Math.PI);
	});

	it('converts e (approximate)', () => {
		expect(endpointToNumber(euler())).toBeCloseTo(Math.E);
	});

	it('converts negative sqrt', () => {
		const negSqrt2 = func('neg', [func('sqrt', [number('2')])]);
		expect(() => endpointToNumber(negSqrt2)).not.toThrow();
	});
});

describe('infinity predicates', () => {
	it('isInfinite returns true for infinities', () => {
		expect(isInfiniteEndpoint(posInf)).toBe(true);
		expect(isInfiniteEndpoint(negInf)).toBe(true);
	});

	it('isInfinite returns false for numeric values', () => {
		expect(isInfiniteEndpoint(numericEndpoint(1))).toBe(false);
	});

	it('isPositiveInfinity works correctly', () => {
		expect(isPositiveInfinityEndpoint(posInf)).toBe(true);
		expect(isPositiveInfinityEndpoint(negInf)).toBe(false);
	});

	it('isNegativeInfinity works correctly', () => {
		expect(isNegativeInfinityEndpoint(negInf)).toBe(true);
		expect(isNegativeInfinityEndpoint(posInf)).toBe(false);
	});
});
