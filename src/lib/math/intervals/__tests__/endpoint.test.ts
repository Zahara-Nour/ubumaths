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
import { compareNumericNodes as compareEndpoints } from '$lib/mathAST/eval/compare-numeric';
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
import type { MathNode } from '$lib/mathAST/types';

// Helpers to create endpoint values using MathNode
function numericEndpoint(n: number): MathNode {
	return number(n.toString());
}

function rationalEndpoint(num: number, denom: number): MathNode {
	return fraction(number(num.toString()), number(denom.toString()));
}

function sqrtEndpoint(radicand: number): MathNode {
	return func('sqrt', [number(radicand.toString())]);
}

const posInf: MathNode = infinity('positive');
const negInf: MathNode = infinity('negative');

describe('compare', () => {
	describe('infinity comparisons', () => {
		it('compares -infinity < +infinity', () => {
			expect(compareEndpoints(negInf, posInf)).toBe(-1);
		});

		it('compares +infinity = +infinity', () => {
			expect(compareEndpoints(posInf, posInf)).toBe(0);
		});

		it('compares -infinity = -infinity', () => {
			expect(compareEndpoints(negInf, negInf)).toBe(0);
		});

		it('compares +infinity > -infinity', () => {
			expect(compareEndpoints(posInf, negInf)).toBe(1);
		});
	});

	describe('infinity vs numeric', () => {
		it('compares -infinity < 0', () => {
			expect(compareEndpoints(negInf, numericEndpoint(0))).toBe(-1);
		});

		it('compares +infinity > 0', () => {
			expect(compareEndpoints(posInf, numericEndpoint(0))).toBe(1);
		});

		it('compares -infinity < sqrt(2)', () => {
			expect(compareEndpoints(negInf, sqrtEndpoint(2))).toBe(-1);
		});

		it('compares sqrt(2) < +infinity', () => {
			expect(compareEndpoints(sqrtEndpoint(2), posInf)).toBe(-1);
		});
	});

	describe('numeric comparisons', () => {
		it('compares 1 < 2', () => {
			expect(compareEndpoints(numericEndpoint(1), numericEndpoint(2))).toBe(-1);
		});

		it('compares sqrt(2) < 3/2', () => {
			expect(compareEndpoints(sqrtEndpoint(2), rationalEndpoint(3, 2))).toBe(-1);
		});

		it('compares sqrt(2) < sqrt(3)', () => {
			expect(compareEndpoints(sqrtEndpoint(2), sqrtEndpoint(3))).toBe(-1);
		});

		it('compares 5 = 5', () => {
			expect(compareEndpoints(numericEndpoint(5), numericEndpoint(5))).toBe(0);
		});
	});

	describe('equality: symbolically different but numerically equal', () => {
		it('compares sqrt(4) = 2', () => {
			expect(compareEndpoints(sqrtEndpoint(4), numericEndpoint(2))).toBe(0);
		});

		it('compares sqrt(9) = 3', () => {
			expect(compareEndpoints(sqrtEndpoint(9), numericEndpoint(3))).toBe(0);
		});

		it('compares 2/4 = 1/2', () => {
			expect(compareEndpoints(rationalEndpoint(2, 4), rationalEndpoint(1, 2))).toBe(0);
		});

		it('compares sqrt(1) = 1', () => {
			expect(compareEndpoints(sqrtEndpoint(1), numericEndpoint(1))).toBe(0);
		});
	});

	describe('variables and undefined comparisons', () => {
		it('returns undefined for variable comparison', () => {
			expect(compareEndpoints(variable('x'), numericEndpoint(1))).toBeUndefined();
		});

		it('returns undefined for two different variables', () => {
			expect(compareEndpoints(variable('x'), variable('y'))).toBeUndefined();
		});

		it('returns undefined for same variable (structural equality not checked)', () => {
			expect(compareEndpoints(variable('x'), variable('x'))).toBeUndefined();
		});
	});

	describe('special constants', () => {
		it('compares pi > 3', () => {
			expect(compareEndpoints(piConstant(), numericEndpoint(3))).toBe(1);
		});

		it('compares pi < 4', () => {
			expect(compareEndpoints(piConstant(), numericEndpoint(4))).toBe(-1);
		});

		it('compares pi = pi', () => {
			expect(compareEndpoints(piConstant(), piConstant())).toBe(0);
		});

		it('compares e > 2', () => {
			expect(compareEndpoints(euler(), numericEndpoint(2))).toBe(1);
		});

		it('compares e < 3', () => {
			expect(compareEndpoints(euler(), numericEndpoint(3))).toBe(-1);
		});
	});

	describe('nested functions', () => {
		it('compares sqrt(sqrt(16)) = 2', () => {
			const sqrtSqrt16 = func('sqrt', [func('sqrt', [number('16')])]);
			expect(compareEndpoints(sqrtSqrt16, numericEndpoint(2))).toBe(0);
		});

		it('compares sqrt(2) < sqrt(3) < sqrt(5)', () => {
			expect(compareEndpoints(sqrtEndpoint(2), sqrtEndpoint(3))).toBe(-1);
			expect(compareEndpoints(sqrtEndpoint(3), sqrtEndpoint(5))).toBe(-1);
			expect(compareEndpoints(sqrtEndpoint(2), sqrtEndpoint(5))).toBe(-1);
		});
	});

	describe('powers', () => {
		it('compares 2^3 = 8', () => {
			expect(compareEndpoints(power(number('2'), number('3')), numericEndpoint(8))).toBe(0);
		});

		it('compares 2^10 = 1024', () => {
			expect(compareEndpoints(power(number('2'), number('10')), numericEndpoint(1024))).toBe(0);
		});
	});

	describe('extreme numeric values', () => {
		it('compares large numbers', () => {
			expect(compareEndpoints(numericEndpoint(1e10), numericEndpoint(1e10 + 1))).toBe(-1);
		});

		it('compares small positive numbers', () => {
			expect(compareEndpoints(numericEndpoint(0.0001), numericEndpoint(0.0002))).toBe(-1);
		});

		it('compares negative numbers', () => {
			expect(compareEndpoints(numericEndpoint(-5), numericEndpoint(-3))).toBe(-1);
		});

		it('compares -1 < 0 < 1', () => {
			expect(compareEndpoints(numericEndpoint(-1), numericEndpoint(0))).toBe(-1);
			expect(compareEndpoints(numericEndpoint(0), numericEndpoint(1))).toBe(-1);
			expect(compareEndpoints(numericEndpoint(-1), numericEndpoint(1))).toBe(-1);
		});
	});

	describe('zero edge cases', () => {
		it('compares 0 = 0', () => {
			expect(compareEndpoints(numericEndpoint(0), numericEndpoint(0))).toBe(0);
		});

		it('compares -0 = 0', () => {
			expect(compareEndpoints(numericEndpoint(-0), numericEndpoint(0))).toBe(0);
		});

		it('compares 0/1 = 0', () => {
			expect(compareEndpoints(rationalEndpoint(0, 1), numericEndpoint(0))).toBe(0);
		});
	});

	describe('rational edge cases', () => {
		it('compares 1/3 < 1/2 < 2/3', () => {
			expect(compareEndpoints(rationalEndpoint(1, 3), rationalEndpoint(1, 2))).toBe(-1);
			expect(compareEndpoints(rationalEndpoint(1, 2), rationalEndpoint(2, 3))).toBe(-1);
		});

		it('compares negative rationals', () => {
			expect(compareEndpoints(rationalEndpoint(-1, 2), rationalEndpoint(-1, 3))).toBe(-1);
		});
	});

	describe('inequality checks via compare', () => {
		it('a < b', () => {
			expect(compareEndpoints(numericEndpoint(1), numericEndpoint(2))! < 0).toBe(true);
		});

		it('a <= b (equal)', () => {
			expect(compareEndpoints(numericEndpoint(5), numericEndpoint(5))! <= 0).toBe(true);
		});

		it('a <= b (less)', () => {
			expect(compareEndpoints(sqrtEndpoint(2), numericEndpoint(2))! <= 0).toBe(true);
		});

		it('a > b', () => {
			expect(compareEndpoints(numericEndpoint(2), numericEndpoint(1))! > 0).toBe(true);
		});

		it('a >= b (equal)', () => {
			expect(compareEndpoints(piConstant(), piConstant())! >= 0).toBe(true);
		});

		it('a >= b (greater)', () => {
			expect(compareEndpoints(numericEndpoint(3), numericEndpoint(2))! > 0).toBe(true);
		});

		it('handles infinity correctly', () => {
			expect(compareEndpoints(negInf, numericEndpoint(1))! <= 0).toBe(true);
			expect(compareEndpoints(numericEndpoint(1), posInf)! <= 0).toBe(true);
			expect(compareEndpoints(negInf, posInf)! <= 0).toBe(true);
		});

		it('works with rationals', () => {
			expect(compareEndpoints(rationalEndpoint(2, 3), rationalEndpoint(1, 2))! > 0).toBe(true);
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
