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
import { number, infinity, func, fraction } from '$lib/mathAST/factory';
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
