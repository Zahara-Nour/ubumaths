/**
 * Tests for algebra.ts
 *
 * Tests interval set operations: isEmpty, containsValue, intersect, union, complement, difference
 */

import { describe, it, expect } from 'vitest';
import {
	isEmpty,
	isUniversal,
	containsValue,
	intersect,
	union,
	complement,
	difference,
	excludePoints
} from '../algebra';
import {
	fromNumber,
	radicalBound,
	closedInterval,
	openInterval,
	greaterThan,
	realLine,
	emptySet,
	universalSet,
	intervalSet,
	excludedPoint
} from '../factory';
import { endpointToNumber } from '../endpoint';

describe('isEmpty', () => {
	it('empty set is empty', () => {
		expect(isEmpty(emptySet())).toBe(true);
	});

	it('universal set is not empty', () => {
		expect(isEmpty(universalSet())).toBe(false);
	});

	it('interval set with intervals is not empty', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(isEmpty(domain)).toBe(false);
	});

	it('interval set with no intervals is empty', () => {
		const domain = intervalSet([]);
		expect(isEmpty(domain)).toBe(true);
	});

	it('interval with inverted bounds is empty', () => {
		// [5, 1] is empty because 5 > 1
		const inv = closedInterval(fromNumber(5), fromNumber(1));
		const domain = intervalSet([inv]);
		expect(isEmpty(domain)).toBe(true);
	});
});

describe('isUniversal', () => {
	it('universal set is universal', () => {
		expect(isUniversal(universalSet())).toBe(true);
	});

	it('empty set is not universal', () => {
		expect(isUniversal(emptySet())).toBe(false);
	});

	it('real line without excluded points is universal', () => {
		const domain = intervalSet([realLine()]);
		expect(isUniversal(domain)).toBe(true);
	});

	it('real line with excluded points is not universal', () => {
		const domain = intervalSet([realLine()], [excludedPoint(fromNumber(0))]);
		expect(isUniversal(domain)).toBe(false);
	});
});

describe('containsValue', () => {
	it('universal contains everything', () => {
		expect(containsValue(universalSet(), 0)).toBe(true);
		expect(containsValue(universalSet(), 42)).toBe(true);
		expect(containsValue(universalSet(), -1000)).toBe(true);
	});

	it('empty contains nothing', () => {
		expect(containsValue(emptySet(), 0)).toBe(false);
		expect(containsValue(emptySet(), 42)).toBe(false);
	});

	it('closed interval contains endpoints', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(containsValue(domain, 0)).toBe(true);
		expect(containsValue(domain, 1)).toBe(true);
		expect(containsValue(domain, 0.5)).toBe(true);
	});

	it('open interval excludes endpoints', () => {
		const domain = intervalSet([openInterval(fromNumber(0), fromNumber(1))]);
		expect(containsValue(domain, 0)).toBe(false);
		expect(containsValue(domain, 1)).toBe(false);
		expect(containsValue(domain, 0.5)).toBe(true);
	});

	it('excluded points are not contained', () => {
		const domain = intervalSet([realLine()], [excludedPoint(fromNumber(0))]);
		expect(containsValue(domain, 0)).toBe(false);
		expect(containsValue(domain, 1)).toBe(true);
	});
});

describe('intersect', () => {
	it('intersect with empty is empty', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(intersect(domain, emptySet()).kind).toBe('empty');
		expect(intersect(emptySet(), domain).kind).toBe('empty');
	});

	it('intersect with universal is identity', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = intersect(domain, universalSet());
		expect(result.kind).toBe('interval_set');
	});

	it('intersects overlapping intervals', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(2))]);
		const b = intervalSet([closedInterval(fromNumber(1), fromNumber(3))]);
		const result = intersect(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(1);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(2);
		}
	});

	it('intersects with algebraic bounds exactly', () => {
		// [0, 2] ∩ [1, sqrt(3)] = [1, sqrt(3)]
		const sqrt3 = radicalBound(3n);
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(2))]);
		const b = intervalSet([closedInterval(fromNumber(1), sqrt3)]);
		const result = intersect(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(1);
			// Upper bound should be sqrt(3) (algebraic)
			expect(endpointToNumber(result.intervals[0].upper.value)).toBeCloseTo(Math.sqrt(3));
		}
	});

	it('non-overlapping intervals result in empty', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const b = intervalSet([closedInterval(fromNumber(2), fromNumber(3))]);
		expect(intersect(a, b).kind).toBe('empty');
	});
});

describe('union', () => {
	it('union with empty is identity', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = union(domain, emptySet());
		expect(result.kind).toBe('interval_set');
	});

	it('union with universal is universal', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(union(domain, universalSet()).kind).toBe('universal');
	});

	it('unions overlapping intervals', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(2))]);
		const b = intervalSet([closedInterval(fromNumber(1), fromNumber(3))]);
		const result = union(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(0);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(3);
		}
	});

	it('unions adjacent intervals', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const b = intervalSet([closedInterval(fromNumber(1), fromNumber(2))]);
		const result = union(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(0);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(2);
		}
	});

	it('unions non-overlapping intervals keeps them separate', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const b = intervalSet([closedInterval(fromNumber(2), fromNumber(3))]);
		const result = union(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
		}
	});

	it('unions with algebraic bounds', () => {
		const sqrt2 = radicalBound(2n);
		const a = intervalSet([closedInterval(fromNumber(0), sqrt2)]);
		const b = intervalSet([closedInterval(sqrt2, fromNumber(2))]);
		const result = union(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			// Should merge because they share sqrt(2)
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(0);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(2);
		}
	});
});

describe('complement', () => {
	it('complement of empty is universal', () => {
		expect(complement(emptySet()).kind).toBe('universal');
	});

	it('complement of universal is empty', () => {
		expect(complement(universalSet()).kind).toBe('empty');
	});

	it('complement of ]0, +inf[ is ]-inf, 0]', () => {
		const domain = intervalSet([greaterThan(fromNumber(0))]);
		const result = complement(domain);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(0);
			expect(result.intervals[0].upper.type).toBe('closed');
		}
	});

	it('complement of [0, 1] is ]-inf, 0[ ∪ ]1, +inf[', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = complement(domain);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
		}
	});
});

describe('difference', () => {
	it('A \\ A = empty', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = difference(domain, domain);
		expect(isEmpty(result)).toBe(true);
	});

	it('A \\ empty = A', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = difference(domain, emptySet());
		expect(result.kind).toBe('interval_set');
	});

	it('A \\ universal = empty', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(difference(domain, universalSet()).kind).toBe('empty');
	});
});

describe('excludePoints', () => {
	it('adds excluded point to interval set', () => {
		const domain = intervalSet([realLine()]);
		const result = excludePoints(domain, [fromNumber(0)]);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.excludedPoints.length).toBe(1);
			expect(endpointToNumber(result.excludedPoints[0].value)).toBe(0);
		}
	});

	it('adds excluded point to universal', () => {
		const result = excludePoints(universalSet(), [fromNumber(0)]);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.excludedPoints.length).toBe(1);
		}
	});

	it('excluded points on empty stays empty', () => {
		expect(excludePoints(emptySet(), [fromNumber(0)]).kind).toBe('empty');
	});
});
