/**
 * Tests for endpoint.ts
 *
 * Tests endpoint value comparison including infinity handling.
 */

import { describe, it, expect } from 'vitest';
import {
	compareEndpointValues,
	compareEndpoints,
	endpointEquals,
	endpointLessThan,
	endpointToNumber,
	isInfinite,
	isPositiveInfinity,
	isNegativeInfinity
} from '../endpoint';
import type { EndpointValue } from '../types';
import type { SimplifiedRadical } from '$lib/mathAST/normal/types';

// Helpers to create endpoint values
function algebraicEndpoint(n: bigint, d: bigint = 1n): EndpointValue {
	return {
		kind: 'algebraic',
		value: {
			terms: [{ rational: { n, d }, radicals: [] }]
		}
	};
}

function radicalEndpoint(radicand: bigint, coefN: bigint = 1n, coefD: bigint = 1n): EndpointValue {
	const radical: SimplifiedRadical = { radicand, index: 2n };
	return {
		kind: 'algebraic',
		value: {
			terms: [{ rational: { n: coefN, d: coefD }, radicals: [radical] }]
		}
	};
}

const posInf: EndpointValue = { kind: 'infinity', value: 'positive_infinity' };
const negInf: EndpointValue = { kind: 'infinity', value: 'negative_infinity' };

describe('compareEndpointValues', () => {
	describe('infinity comparisons', () => {
		it('compares -infinity < +infinity', () => {
			const result = compareEndpointValues(negInf, posInf);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares +infinity = +infinity', () => {
			const result = compareEndpointValues(posInf, posInf);
			expect(result.result).toBe(0);
			expect(result.exact).toBe(true);
		});

		it('compares -infinity = -infinity', () => {
			const result = compareEndpointValues(negInf, negInf);
			expect(result.result).toBe(0);
			expect(result.exact).toBe(true);
		});

		it('compares +infinity > -infinity', () => {
			const result = compareEndpointValues(posInf, negInf);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});
	});

	describe('infinity vs algebraic', () => {
		it('compares -infinity < 0', () => {
			const zero = algebraicEndpoint(0n);
			const result = compareEndpointValues(negInf, zero);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares +infinity > 0', () => {
			const zero = algebraicEndpoint(0n);
			const result = compareEndpointValues(posInf, zero);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});

		it('compares -infinity < sqrt(2)', () => {
			const sqrt2 = radicalEndpoint(2n);
			const result = compareEndpointValues(negInf, sqrt2);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares sqrt(2) < +infinity', () => {
			const sqrt2 = radicalEndpoint(2n);
			const result = compareEndpointValues(sqrt2, posInf);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});
	});

	describe('algebraic comparisons', () => {
		it('compares 1 < 2 exactly', () => {
			const one = algebraicEndpoint(1n);
			const two = algebraicEndpoint(2n);
			const result = compareEndpointValues(one, two);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares sqrt(2) < 3/2 exactly', () => {
			const sqrt2 = radicalEndpoint(2n);
			const threeHalves = algebraicEndpoint(3n, 2n);
			const result = compareEndpointValues(sqrt2, threeHalves);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares sqrt(2) < sqrt(3) exactly', () => {
			const sqrt2 = radicalEndpoint(2n);
			const sqrt3 = radicalEndpoint(3n);
			const result = compareEndpointValues(sqrt2, sqrt3);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});
	});
});

describe('compareEndpoints (simple version)', () => {
	it('returns just the result without exactness', () => {
		const one = algebraicEndpoint(1n);
		const two = algebraicEndpoint(2n);
		expect(compareEndpoints(one, two)).toBe(-1);
	});
});

describe('endpointEquals', () => {
	it('returns true for equal values', () => {
		const a = algebraicEndpoint(5n);
		const b = algebraicEndpoint(5n);
		expect(endpointEquals(a, b)).toBe(true);
	});

	it('returns false for different values', () => {
		const a = algebraicEndpoint(5n);
		const b = algebraicEndpoint(6n);
		expect(endpointEquals(a, b)).toBe(false);
	});

	it('returns true for equal infinities', () => {
		expect(endpointEquals(posInf, posInf)).toBe(true);
	});
});

describe('endpointLessThan', () => {
	it('returns true when a < b', () => {
		const one = algebraicEndpoint(1n);
		const two = algebraicEndpoint(2n);
		expect(endpointLessThan(one, two)).toBe(true);
	});

	it('returns false when a >= b', () => {
		const two = algebraicEndpoint(2n);
		const one = algebraicEndpoint(1n);
		expect(endpointLessThan(two, one)).toBe(false);
	});
});

describe('endpointToNumber', () => {
	it('converts positive infinity', () => {
		expect(endpointToNumber(posInf)).toBe(Infinity);
	});

	it('converts negative infinity', () => {
		expect(endpointToNumber(negInf)).toBe(-Infinity);
	});

	it('converts algebraic rational', () => {
		const threeHalves = algebraicEndpoint(3n, 2n);
		expect(endpointToNumber(threeHalves)).toBe(1.5);
	});

	it('converts algebraic radical (approximate)', () => {
		const sqrt2 = radicalEndpoint(2n);
		expect(endpointToNumber(sqrt2)).toBeCloseTo(Math.sqrt(2));
	});
});

describe('infinity predicates', () => {
	it('isInfinite returns true for infinities', () => {
		expect(isInfinite(posInf)).toBe(true);
		expect(isInfinite(negInf)).toBe(true);
	});

	it('isInfinite returns false for algebraic', () => {
		const one = algebraicEndpoint(1n);
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
