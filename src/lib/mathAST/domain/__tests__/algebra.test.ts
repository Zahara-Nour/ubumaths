/**
 * Tests for domain algebra operations
 */

import { describe, it, expect } from 'vitest';
import { isEmpty, intersect, union, complement, excludePoints, containsValue } from '../algebra';
import {
	emptyDomain,
	universalDomain,
	intervalDomain,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	openInterval,
	closedInterval,
	realLine,
	excludedPoint
} from '../factory';

describe('isEmpty()', () => {
	it('returns true for empty domain', () => {
		expect(isEmpty(emptyDomain())).toBe(true);
	});

	it('returns false for universal domain', () => {
		expect(isEmpty(universalDomain())).toBe(false);
	});

	it('returns true for intervalDomain with no intervals', () => {
		expect(isEmpty(intervalDomain([]))).toBe(true);
	});

	it('returns false for intervalDomain with intervals', () => {
		expect(isEmpty(positiveReals())).toBe(false);
	});

	it('returns true for degenerate interval ]a, a[', () => {
		const degenerate = intervalDomain([openInterval(0, 0)]);
		expect(isEmpty(degenerate)).toBe(true);
	});

	it('returns true for inverted interval ]1, 0[', () => {
		const inverted = intervalDomain([openInterval(1, 0)]);
		expect(isEmpty(inverted)).toBe(true);
	});

	it('returns false for single point [a, a]', () => {
		const point = intervalDomain([closedInterval(0, 0)]);
		expect(isEmpty(point)).toBe(false);
	});
});

describe('intersect()', () => {
	describe('with empty domain', () => {
		it('intersect(empty, any) returns empty', () => {
			expect(intersect(emptyDomain(), positiveReals()).kind).toBe('empty');
		});

		it('intersect(any, empty) returns empty', () => {
			expect(intersect(positiveReals(), emptyDomain()).kind).toBe('empty');
		});
	});

	describe('with universal domain', () => {
		it('intersect(universal, any) returns any', () => {
			const result = intersect(universalDomain(), positiveReals());
			expect(result.kind).toBe('interval_domain');
		});

		it('intersect(any, universal) returns any', () => {
			const result = intersect(positiveReals(), universalDomain());
			expect(result.kind).toBe('interval_domain');
		});
	});

	describe('with interval domains', () => {
		it('intersect(]0, +inf[, ]-inf, 1]) = ]0, 1]', () => {
			const a = positiveReals(); // ]0, +inf[
			const b = intervalDomain([lessThanOrEqual(1)]); // ]-inf, 1]
			const result = intersect(a, b);

			expect(result.kind).toBe('interval_domain');
			if (result.kind === 'interval_domain') {
				expect(result.intervals).toHaveLength(1);
				const i = result.intervals[0];
				expect(i.lower.value).toBe(0);
				expect(i.lower.type).toBe('open');
				expect(i.upper.value).toBe(1);
				expect(i.upper.type).toBe('closed');
			}
		});

		it('intersect([0, +inf[, [-1, 1]) = [0, 1]', () => {
			const a = nonNegativeReals(); // [0, +inf[
			const b = unitInterval(); // [-1, 1]
			const result = intersect(a, b);

			expect(result.kind).toBe('interval_domain');
			if (result.kind === 'interval_domain') {
				expect(result.intervals).toHaveLength(1);
				const i = result.intervals[0];
				expect(i.lower.value).toBe(0);
				expect(i.lower.type).toBe('closed');
				expect(i.upper.value).toBe(1);
				expect(i.upper.type).toBe('closed');
			}
		});

		it('intersect of disjoint intervals returns empty', () => {
			const a = intervalDomain([lessThan(0)]); // ]-inf, 0[
			const b = positiveReals(); // ]0, +inf[
			const result = intersect(a, b);

			expect(isEmpty(result)).toBe(true);
		});

		it('combines excluded points from both domains', () => {
			const a = intervalDomain([realLine()], [excludedPoint(0)]);
			const b = intervalDomain([realLine()], [excludedPoint(1)]);
			const result = intersect(a, b);

			expect(result.kind).toBe('interval_domain');
			if (result.kind === 'interval_domain') {
				expect(result.excludedPoints).toHaveLength(2);
			}
		});
	});
});

describe('union()', () => {
	describe('with empty domain', () => {
		it('union(empty, any) returns any', () => {
			const result = union(emptyDomain(), positiveReals());
			expect(result.kind).toBe('interval_domain');
		});

		it('union(any, empty) returns any', () => {
			const result = union(positiveReals(), emptyDomain());
			expect(result.kind).toBe('interval_domain');
		});
	});

	describe('with universal domain', () => {
		it('union(universal, any) returns universal', () => {
			expect(union(universalDomain(), positiveReals()).kind).toBe('universal');
		});

		it('union(any, universal) returns universal', () => {
			expect(union(positiveReals(), universalDomain()).kind).toBe('universal');
		});
	});

	describe('with interval domains', () => {
		it('union of adjacent intervals merges them', () => {
			const a = intervalDomain([lessThanOrEqual(0)]); // ]-inf, 0]
			const b = intervalDomain([greaterThanOrEqual(0)]); // [0, +inf[
			const result = union(a, b);

			// Should be universal (entire real line)
			expect(result.kind).toBe('universal');
		});

		it('union of overlapping intervals merges them', () => {
			const a = intervalDomain([lessThan(1)]); // ]-inf, 1[
			const b = intervalDomain([greaterThan(0)]); // ]0, +inf[
			const result = union(a, b);

			// Should cover all reals
			expect(result.kind).toBe('universal');
		});

		it('union of disjoint intervals keeps both', () => {
			const a = intervalDomain([lessThan(-1)]); // ]-inf, -1[
			const b = intervalDomain([greaterThan(1)]); // ]1, +inf[
			const result = union(a, b);

			expect(result.kind).toBe('interval_domain');
			if (result.kind === 'interval_domain') {
				expect(result.intervals).toHaveLength(2);
			}
		});
	});
});

describe('complement()', () => {
	it('complement(empty) = universal', () => {
		expect(complement(emptyDomain()).kind).toBe('universal');
	});

	it('complement(universal) = empty', () => {
		expect(complement(universalDomain()).kind).toBe('empty');
	});

	it('complement(]0, +inf[) = ]-inf, 0]', () => {
		const result = complement(positiveReals());

		expect(result.kind).toBe('interval_domain');
		if (result.kind === 'interval_domain') {
			expect(result.intervals).toHaveLength(1);
			const i = result.intervals[0];
			expect(i.lower.value).toBe('negative_infinity');
			expect(i.upper.value).toBe(0);
			expect(i.upper.type).toBe('closed');
		}
	});

	it('complement([0, +inf[) = ]-inf, 0[', () => {
		const result = complement(nonNegativeReals());

		expect(result.kind).toBe('interval_domain');
		if (result.kind === 'interval_domain') {
			expect(result.intervals).toHaveLength(1);
			const i = result.intervals[0];
			expect(i.upper.value).toBe(0);
			expect(i.upper.type).toBe('open');
		}
	});

	it('complement([-1, 1]) = ]-inf, -1[ union ]1, +inf[', () => {
		const result = complement(unitInterval());

		expect(result.kind).toBe('interval_domain');
		if (result.kind === 'interval_domain') {
			expect(result.intervals).toHaveLength(2);
			// First: ]-inf, -1[
			expect(result.intervals[0].upper.value).toBe(-1);
			expect(result.intervals[0].upper.type).toBe('open');
			// Second: ]1, +inf[
			expect(result.intervals[1].lower.value).toBe(1);
			expect(result.intervals[1].lower.type).toBe('open');
		}
	});
});

describe('excludePoints()', () => {
	it('excludePoints(R, [0]) = R \\ {0}', () => {
		const result = excludePoints(universalDomain(), [0]);

		expect(result.kind).toBe('interval_domain');
		if (result.kind === 'interval_domain') {
			expect(result.intervals).toHaveLength(1);
			expect(result.excludedPoints).toHaveLength(1);
			expect(result.excludedPoints[0].value).toBe(0);
		}
	});

	it('excludePoints(]0, +inf[, [1, 2]) excludes the points', () => {
		const result = excludePoints(positiveReals(), [1, 2]);

		expect(result.kind).toBe('interval_domain');
		if (result.kind === 'interval_domain') {
			expect(result.excludedPoints).toHaveLength(2);
		}
	});

	it('excludePoints(empty, [0]) = empty', () => {
		expect(excludePoints(emptyDomain(), [0]).kind).toBe('empty');
	});

	it('does not duplicate existing excluded points', () => {
		const base = nonZeroReals(); // Already excludes 0
		const result = excludePoints(base, [0, 1]);

		expect(result.kind).toBe('interval_domain');
		if (result.kind === 'interval_domain') {
			// Should have 0 and 1, not 0, 0, 1
			expect(result.excludedPoints).toHaveLength(2);
		}
	});
});

describe('containsValue()', () => {
	describe('with empty domain', () => {
		it('never contains any value', () => {
			expect(containsValue(emptyDomain(), 0)).toBe(false);
			expect(containsValue(emptyDomain(), 100)).toBe(false);
		});
	});

	describe('with universal domain', () => {
		it('contains all finite values', () => {
			expect(containsValue(universalDomain(), 0)).toBe(true);
			expect(containsValue(universalDomain(), -1000)).toBe(true);
			expect(containsValue(universalDomain(), 1000)).toBe(true);
		});
	});

	describe('with interval domains', () => {
		it('positiveReals contains 1 but not 0 or -1', () => {
			const d = positiveReals();
			expect(containsValue(d, 1)).toBe(true);
			expect(containsValue(d, 0.001)).toBe(true);
			expect(containsValue(d, 0)).toBe(false);
			expect(containsValue(d, -1)).toBe(false);
		});

		it('nonNegativeReals contains 0 and 1 but not -1', () => {
			const d = nonNegativeReals();
			expect(containsValue(d, 0)).toBe(true);
			expect(containsValue(d, 1)).toBe(true);
			expect(containsValue(d, -1)).toBe(false);
		});

		it('unitInterval contains -1, 0, 1 but not 2', () => {
			const d = unitInterval();
			expect(containsValue(d, -1)).toBe(true);
			expect(containsValue(d, 0)).toBe(true);
			expect(containsValue(d, 1)).toBe(true);
			expect(containsValue(d, 2)).toBe(false);
		});

		it('nonZeroReals contains 1, -1 but not 0', () => {
			const d = nonZeroReals();
			expect(containsValue(d, 1)).toBe(true);
			expect(containsValue(d, -1)).toBe(true);
			expect(containsValue(d, 0)).toBe(false);
		});

		it('respects excluded points', () => {
			const d = intervalDomain([realLine()], [excludedPoint(5)]);
			expect(containsValue(d, 0)).toBe(true);
			expect(containsValue(d, 5)).toBe(false);
		});
	});
});
