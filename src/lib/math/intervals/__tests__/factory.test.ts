/**
 * Tests for factory.ts
 *
 * Tests interval and endpoint factory functions.
 */

import { describe, it, expect } from 'vitest';
import {
	fromNumber,
	rationalBound,
	radicalBound,
	infinityBound,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual,
	realLine,
	emptySet,
	universalSet,
	intervalSet,
	excludedPoint,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval
} from '../factory';
import { endpointToNumber } from '../endpoint';
import { algebraicToNumber } from '$lib/mathAST/normal/algebraic';

describe('bound value constructors', () => {
	describe('fromNumber', () => {
		it('creates algebraic 0', () => {
			const zero = fromNumber(0);
			expect(zero.kind).toBe('algebraic');
			if (zero.kind === 'algebraic') {
				expect(algebraicToNumber(zero.value)).toBe(0);
			}
		});

		it('creates algebraic 1', () => {
			const one = fromNumber(1);
			expect(one.kind).toBe('algebraic');
			if (one.kind === 'algebraic') {
				expect(algebraicToNumber(one.value)).toBe(1);
			}
		});

		it('creates algebraic -1', () => {
			const minusOne = fromNumber(-1);
			expect(minusOne.kind).toBe('algebraic');
			if (minusOne.kind === 'algebraic') {
				expect(algebraicToNumber(minusOne.value)).toBe(-1);
			}
		});

		it('creates algebraic from integer', () => {
			const five = fromNumber(5);
			expect(five.kind).toBe('algebraic');
			if (five.kind === 'algebraic') {
				expect(algebraicToNumber(five.value)).toBe(5);
			}
		});

		it('creates algebraic from decimal', () => {
			const oneAndHalf = fromNumber(1.5);
			expect(oneAndHalf.kind).toBe('algebraic');
			if (oneAndHalf.kind === 'algebraic') {
				expect(algebraicToNumber(oneAndHalf.value)).toBe(1.5);
			}
		});
	});

	describe('rationalBound', () => {
		it('creates exact 3/2', () => {
			const threeHalves = rationalBound(3n, 2n);
			expect(threeHalves.kind).toBe('algebraic');
			if (threeHalves.kind === 'algebraic') {
				expect(algebraicToNumber(threeHalves.value)).toBe(1.5);
			}
		});

		it('creates exact integer', () => {
			const five = rationalBound(5n);
			expect(five.kind).toBe('algebraic');
			if (five.kind === 'algebraic') {
				expect(algebraicToNumber(five.value)).toBe(5);
			}
		});
	});

	describe('radicalBound', () => {
		it('creates sqrt(2)', () => {
			const sqrt2 = radicalBound(2n);
			expect(sqrt2.kind).toBe('algebraic');
			if (sqrt2.kind === 'algebraic') {
				expect(algebraicToNumber(sqrt2.value)).toBeCloseTo(Math.sqrt(2));
			}
		});

		it('creates 2*sqrt(3)', () => {
			const twoSqrt3 = radicalBound(3n, 2n);
			expect(twoSqrt3.kind).toBe('algebraic');
			if (twoSqrt3.kind === 'algebraic') {
				expect(algebraicToNumber(twoSqrt3.value)).toBeCloseTo(2 * Math.sqrt(3));
			}
		});

		it('creates (1/2)*sqrt(2)', () => {
			const halfSqrt2 = radicalBound(2n, 1n, 2n);
			expect(halfSqrt2.kind).toBe('algebraic');
			if (halfSqrt2.kind === 'algebraic') {
				expect(algebraicToNumber(halfSqrt2.value)).toBeCloseTo(Math.sqrt(2) / 2);
			}
		});

		it('handles sqrt(1) = 1', () => {
			const sqrt1 = radicalBound(1n);
			expect(sqrt1.kind).toBe('algebraic');
			if (sqrt1.kind === 'algebraic') {
				expect(algebraicToNumber(sqrt1.value)).toBe(1);
			}
		});
	});

	describe('infinityBound', () => {
		it('creates positive infinity', () => {
			const inf = infinityBound('positive_infinity');
			expect(inf.kind).toBe('infinity');
			expect(inf.value).toBe('positive_infinity');
		});

		it('creates negative infinity', () => {
			const inf = infinityBound('negative_infinity');
			expect(inf.kind).toBe('infinity');
			expect(inf.value).toBe('negative_infinity');
		});
	});
});

describe('endpoint factories', () => {
	it('creates open endpoint', () => {
		const ep = openEndpoint(fromNumber(5));
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(5);
	});

	it('creates closed endpoint', () => {
		const ep = closedEndpoint(fromNumber(5));
		expect(ep.type).toBe('closed');
		expect(endpointToNumber(ep.value)).toBe(5);
	});

	it('creates negative infinity endpoint', () => {
		const ep = negInfinity();
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(-Infinity);
	});

	it('creates positive infinity endpoint', () => {
		const ep = posInfinity();
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(Infinity);
	});
});

describe('interval factories', () => {
	it('creates open interval ]a, b[', () => {
		const int = openInterval(fromNumber(1), fromNumber(5));
		expect(int.kind).toBe('interval');
		expect(int.lower.type).toBe('open');
		expect(int.upper.type).toBe('open');
		expect(endpointToNumber(int.lower.value)).toBe(1);
		expect(endpointToNumber(int.upper.value)).toBe(5);
	});

	it('creates closed interval [a, b]', () => {
		const int = closedInterval(fromNumber(1), fromNumber(5));
		expect(int.kind).toBe('interval');
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('closed');
	});

	it('creates left-closed interval [a, b[', () => {
		const int = leftClosedInterval(fromNumber(1), fromNumber(5));
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('open');
	});

	it('creates right-closed interval ]a, b]', () => {
		const int = rightClosedInterval(fromNumber(1), fromNumber(5));
		expect(int.lower.type).toBe('open');
		expect(int.upper.type).toBe('closed');
	});

	it('creates lessThan ]-infinity, a[', () => {
		const int = lessThan(fromNumber(5));
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(5);
		expect(int.upper.type).toBe('open');
	});

	it('creates lessThanOrEqual ]-infinity, a]', () => {
		const int = lessThanOrEqual(fromNumber(5));
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(int.upper.type).toBe('closed');
	});

	it('creates greaterThan ]a, +infinity[', () => {
		const int = greaterThan(fromNumber(0));
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates greaterThanOrEqual [a, +infinity[', () => {
		const int = greaterThanOrEqual(fromNumber(0));
		expect(int.lower.type).toBe('closed');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates realLine ]-infinity, +infinity[', () => {
		const int = realLine();
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates interval with algebraic bounds', () => {
		const sqrt2 = radicalBound(2n);
		const sqrt3 = radicalBound(3n);
		const int = closedInterval(sqrt2, sqrt3);
		expect(int.kind).toBe('interval');
		expect(endpointToNumber(int.lower.value)).toBeCloseTo(Math.sqrt(2));
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.sqrt(3));
	});
});

describe('domain factories', () => {
	it('creates empty set', () => {
		const empty = emptySet();
		expect(empty.kind).toBe('empty');
	});

	it('creates universal set', () => {
		const universal = universalSet();
		expect(universal.kind).toBe('universal');
	});

	it('creates interval set', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3))
		]);
		expect(domain.kind).toBe('interval_set');
		expect(domain.intervals.length).toBe(2);
		expect(domain.excludedPoints.length).toBe(0);
	});

	it('creates interval set with excluded points', () => {
		const domain = intervalSet([realLine()], [excludedPoint(fromNumber(0))]);
		expect(domain.kind).toBe('interval_set');
		expect(domain.excludedPoints.length).toBe(1);
	});
});

describe('common domain shortcuts', () => {
	it('creates positive reals ]0, +infinity[', () => {
		const domain = positiveReals();
		expect(domain.kind).toBe('interval_set');
		expect(domain.intervals.length).toBe(1);
		const int = domain.intervals[0];
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates non-negative reals [0, +infinity[', () => {
		const domain = nonNegativeReals();
		expect(domain.kind).toBe('interval_set');
		const int = domain.intervals[0];
		expect(int.lower.type).toBe('closed');
	});

	it('creates non-zero reals R \\ {0}', () => {
		const domain = nonZeroReals();
		expect(domain.kind).toBe('interval_set');
		expect(domain.excludedPoints.length).toBe(1);
		expect(endpointToNumber(domain.excludedPoints[0].value)).toBe(0);
	});

	it('creates unit interval [-1, 1]', () => {
		const domain = unitInterval();
		expect(domain.kind).toBe('interval_set');
		const int = domain.intervals[0];
		expect(endpointToNumber(int.lower.value)).toBe(-1);
		expect(endpointToNumber(int.upper.value)).toBe(1);
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('closed');
	});
});
