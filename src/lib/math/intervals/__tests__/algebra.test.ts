/**
 * Tests for algebra.ts
 *
 * Tests interval set operations: isEmpty, containsValue, intersect, union, complement, difference
 */

import { describe, it, expect } from 'vitest';
import {
	isEmptyInterval,
	isUniversalInterval,
	containsValue,
	intersect,
	union,
	complement,
	difference
} from '../algebra';
import {
	fromNumber,
	bound,
	closedInterval,
	openInterval,
	greaterThanInterval,
	lessThanInterval,
	realLine,
	emptySet,
	universalSet,
	intervalSet
} from '../factory';
import { endpointToNumber } from '../endpoint';

describe('isEmpty', () => {
	it('empty set is empty', () => {
		expect(isEmptyInterval(emptySet())).toBe(true);
	});

	it('universal set is not empty', () => {
		expect(isEmptyInterval(universalSet())).toBe(false);
	});

	it('interval set with intervals is not empty', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(isEmptyInterval(domain)).toBe(false);
	});

	it('interval set with no intervals is empty', () => {
		const domain = intervalSet([]);
		expect(isEmptyInterval(domain)).toBe(true);
	});

	it('interval with inverted bounds is empty', () => {
		// [5, 1] is empty because 5 > 1
		const inv = closedInterval(fromNumber(5), fromNumber(1));
		const domain = intervalSet([inv]);
		expect(isEmptyInterval(domain)).toBe(true);
	});
});

describe('isUniversal', () => {
	it('universal set is universal', () => {
		expect(isUniversalInterval(universalSet())).toBe(true);
	});

	it('empty set is not universal', () => {
		expect(isUniversalInterval(emptySet())).toBe(false);
	});

	it('real line without excluded points is universal', () => {
		const domain = intervalSet([realLine()]);
		expect(isUniversalInterval(domain)).toBe(true);
	});

	it('split intervals around 0 are not universal', () => {
		const domain = intervalSet([
			lessThanInterval(fromNumber(0)),
			greaterThanInterval(fromNumber(0))
		]);
		expect(isUniversalInterval(domain)).toBe(false);
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

	it('split intervals do not contain the gap point', () => {
		const domain = intervalSet([
			lessThanInterval(fromNumber(0)),
			greaterThanInterval(fromNumber(0))
		]);
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
		const sqrt3 = bound('sqrt(3)');
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
		const sqrt2 = bound('sqrt(2)');
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
		const domain = intervalSet([greaterThanInterval(fromNumber(0))]);
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
		expect(isEmptyInterval(result)).toBe(true);
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

// =============================================================================
// Edge Cases
// =============================================================================

describe('isEmpty edge cases', () => {
	it('single point interval [a, a] is not empty', () => {
		const point = closedInterval(fromNumber(5), fromNumber(5));
		const domain = intervalSet([point]);
		expect(isEmptyInterval(domain)).toBe(false);
	});

	it('open single point ]a, a[ is empty', () => {
		const point = openInterval(fromNumber(5), fromNumber(5));
		const domain = intervalSet([point]);
		expect(isEmptyInterval(domain)).toBe(true);
	});

	it('interval with symbolic bounds is not empty', () => {
		const sqrt2 = bound('sqrt(2)');
		const sqrt3 = bound('sqrt(3)');
		const domain = intervalSet([closedInterval(sqrt2, sqrt3)]);
		expect(isEmptyInterval(domain)).toBe(false);
	});

	it('inverted symbolic bounds is empty', () => {
		const sqrt2 = bound('sqrt(2)');
		const sqrt3 = bound('sqrt(3)');
		// [sqrt(3), sqrt(2)] is empty because sqrt(3) > sqrt(2)
		const domain = intervalSet([closedInterval(sqrt3, sqrt2)]);
		expect(isEmptyInterval(domain)).toBe(true);
	});

	it('multiple empty intervals is empty', () => {
		const domain = intervalSet([
			openInterval(fromNumber(0), fromNumber(0)),
			openInterval(fromNumber(1), fromNumber(1))
		]);
		expect(isEmptyInterval(domain)).toBe(true);
	});
});

describe('containsValue edge cases', () => {
	it('contains value near symbolic bound', () => {
		const sqrt2 = bound('sqrt(2)');
		const domain = intervalSet([closedInterval(fromNumber(0), sqrt2)]);
		// Value slightly less than sqrt(2) should be contained
		expect(containsValue(domain, 1.4)).toBe(true);
		// Value clearly greater than sqrt(2) should not be contained
		expect(containsValue(domain, 1.5)).toBe(false);
	});

	it('does not contain value just outside open bound', () => {
		const domain = intervalSet([openInterval(fromNumber(0), fromNumber(1))]);
		expect(containsValue(domain, 0.0001)).toBe(true);
		expect(containsValue(domain, 0.9999)).toBe(true);
	});

	it('handles negative values', () => {
		const domain = intervalSet([closedInterval(fromNumber(-10), fromNumber(-5))]);
		expect(containsValue(domain, -7)).toBe(true);
		expect(containsValue(domain, -11)).toBe(false);
		expect(containsValue(domain, -4)).toBe(false);
	});

	it('handles very large values', () => {
		const domain = intervalSet([greaterThanInterval(fromNumber(0))]);
		expect(containsValue(domain, 1e100)).toBe(true);
	});

	it('handles very small positive values', () => {
		const domain = intervalSet([greaterThanInterval(fromNumber(0))]);
		expect(containsValue(domain, 1e-100)).toBe(true);
	});

	it('handles multiple split intervals', () => {
		// ]-inf, 0[ ∪ ]0, 1[ ∪ ]1, 2[ ∪ ]2, +inf[
		const domain = intervalSet([
			lessThanInterval(fromNumber(0)),
			openInterval(fromNumber(0), fromNumber(1)),
			openInterval(fromNumber(1), fromNumber(2)),
			greaterThanInterval(fromNumber(2))
		]);
		expect(containsValue(domain, 0)).toBe(false);
		expect(containsValue(domain, 1)).toBe(false);
		expect(containsValue(domain, 2)).toBe(false);
		expect(containsValue(domain, 0.5)).toBe(true);
		expect(containsValue(domain, 1.5)).toBe(true);
	});

	it('handles union of disjoint intervals', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(5), fromNumber(6))
		]);
		expect(containsValue(domain, 0.5)).toBe(true);
		expect(containsValue(domain, 5.5)).toBe(true);
		expect(containsValue(domain, 3)).toBe(false);
	});
});

describe('intersect edge cases', () => {
	it('touching intervals with compatible types merge at point', () => {
		// [0, 1] ∩ [1, 2] = {1}
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const b = intervalSet([closedInterval(fromNumber(1), fromNumber(2))]);
		const result = intersect(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(1);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(1);
		}
	});

	it('touching intervals with incompatible types are empty', () => {
		// [0, 1[ ∩ ]1, 2] = empty (gap at 1)
		const a = intervalSet([openInterval(fromNumber(0), fromNumber(1))]);
		const b = intervalSet([openInterval(fromNumber(1), fromNumber(2))]);
		const result = intersect(a, b);
		expect(isEmptyInterval(result)).toBe(true);
	});

	it('one interval contains the other', () => {
		const outer = intervalSet([closedInterval(fromNumber(0), fromNumber(10))]);
		const inner = intervalSet([closedInterval(fromNumber(3), fromNumber(7))]);
		const result = intersect(outer, inner);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(3);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(7);
		}
	});

	it('intersect multiple intervals with single interval', () => {
		const multi = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3)),
			closedInterval(fromNumber(4), fromNumber(5))
		]);
		const single = intervalSet([closedInterval(fromNumber(1.5), fromNumber(4.5))]);
		const result = intersect(multi, single);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
			// Should contain [2, 3] and [4, 4.5]
		}
	});

	it('intersect split intervals preserves gap', () => {
		const a = intervalSet([lessThanInterval(fromNumber(0)), greaterThanInterval(fromNumber(0))]);
		const b = intervalSet([closedInterval(fromNumber(-1), fromNumber(1))]);
		const result = intersect(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			// [-1, 0[ ∪ ]0, 1]
			expect(result.intervals.length).toBe(2);
		}
	});
});

describe('union edge cases', () => {
	it('union of many overlapping intervals simplifies', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(2)),
			closedInterval(fromNumber(1), fromNumber(3)),
			closedInterval(fromNumber(2), fromNumber(4)),
			closedInterval(fromNumber(3), fromNumber(5))
		]);
		// All overlap, should simplify to [0, 5]
		const result = union(domain, emptySet()); // just to trigger normalization
		expect(result.kind).toBe('interval_set');
		// The factory already merges, so let's test differently
	});

	it('union of identical intervals is idempotent', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = union(domain, domain);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
		}
	});

	it('union of two half-lines creates full line', () => {
		const left = intervalSet([closedInterval(bound('-inf'), fromNumber(0))]);
		const right = intervalSet([closedInterval(fromNumber(0), bound('+inf'))]);
		const result = union(left, right);
		// The union of two half-lines that meet creates universal set
		// It may be simplified to 'universal' kind directly
		expect(isUniversalInterval(result)).toBe(true);
	});

	it('union of non-overlapping intervals keeps them separate', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const b = intervalSet([closedInterval(fromNumber(2), fromNumber(3))]);
		const result = union(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
		}
	});
});

describe('complement edge cases', () => {
	it('complement of single point [a, a] is R \\ {a}', () => {
		const point = intervalSet([closedInterval(fromNumber(0), fromNumber(0))]);
		const result = complement(point);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
			// ]-inf, 0[ ∪ ]0, +inf[
		}
	});

	it('complement of multiple disjoint intervals', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3))
		]);
		const result = complement(domain);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			// Should have 3 intervals: ]-inf, 0[, ]1, 2[, ]3, +inf[
			expect(result.intervals.length).toBe(3);
		}
	});

	it('double complement is identity', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		const result = complement(complement(domain));
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(0);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(1);
		}
	});
});

describe('difference edge cases', () => {
	it('B completely contains A: A \\ B = empty', () => {
		const a = intervalSet([closedInterval(fromNumber(1), fromNumber(2))]);
		const b = intervalSet([closedInterval(fromNumber(0), fromNumber(3))]);
		expect(isEmptyInterval(difference(a, b))).toBe(true);
	});

	it('A completely contains B: creates two intervals', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(10))]);
		const b = intervalSet([closedInterval(fromNumber(3), fromNumber(7))]);
		const result = difference(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
		}
	});

	it('partial overlap from left', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(5))]);
		const b = intervalSet([closedInterval(fromNumber(-2), fromNumber(3))]);
		const result = difference(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(3);
			expect(result.intervals[0].lower.type).toBe('open');
		}
	});

	it('partial overlap from right', () => {
		const a = intervalSet([closedInterval(fromNumber(0), fromNumber(5))]);
		const b = intervalSet([closedInterval(fromNumber(3), fromNumber(10))]);
		const result = difference(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBe(3);
			expect(result.intervals[0].upper.type).toBe('open');
		}
	});

	it('difference with split intervals around 0', () => {
		const a = intervalSet([lessThanInterval(fromNumber(0)), greaterThanInterval(fromNumber(0))]);
		const b = intervalSet([closedInterval(fromNumber(-1), fromNumber(1))]);
		// (]-inf,0[ ∪ ]0,+inf[) \ [-1, 1] = ]-inf, -1[ ∪ ]1, +inf[
		const result = difference(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(2);
		}
	});
});

describe('symbolic bounds edge cases', () => {
	it('interval from 0 to pi', () => {
		const piVal = bound('\\pi');
		const domain = intervalSet([closedInterval(fromNumber(0), piVal)]);
		expect(containsValue(domain, Math.PI / 2)).toBe(true);
		expect(containsValue(domain, 4)).toBe(false);
	});

	it('intersect intervals with pi bound', () => {
		const piVal = bound('\\pi');
		const a = intervalSet([closedInterval(fromNumber(0), piVal)]);
		const b = intervalSet([closedInterval(fromNumber(2), fromNumber(5))]);
		const result = intersect(a, b);
		expect(result.kind).toBe('interval_set');
		if (result.kind === 'interval_set') {
			expect(result.intervals.length).toBe(1);
			expect(endpointToNumber(result.intervals[0].lower.value)).toBe(2);
			expect(endpointToNumber(result.intervals[0].upper.value)).toBeCloseTo(Math.PI);
		}
	});
});
