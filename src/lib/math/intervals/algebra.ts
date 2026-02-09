/**
 * Interval Algebra - Set operations on intervals
 *
 * Operations: isEmpty, containsValue, intersect, union, complement, difference
 * Uses mathAST's compareNumericNodes for exact symbolic comparison.
 */

import type { IntervalDomain, Interval, Endpoint, IntervalSet } from './types';
import {
	universalSet,
	intervalSet,
	interval,
	negInfinity,
	posInfinity,
	realLine,
	EMPTY_SET,
	UNIVERSAL_SET,
	fromNumber
} from './factory';
import {
	compare,
	endpointToNumber,
	isNegativeInfinity,
	isPositiveInfinity,
	endpointGreaterThan,
	endpointGreaterThanOrEqual,
	endpointLessThan,
	endpointLessThanOrEqual
} from './endpoint';
import { normalizeIntervals } from './normalize';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a MathNode value is contained in an interval.
 * Uses symbolic comparison via compareNumericNodes for exact results.
 */
function nodeInInterval(value: MathNode, int: Interval): boolean {
	// Check lower bound
	const aboveLower =
		int.lower.type === 'closed'
			? endpointGreaterThanOrEqual(value, int.lower.value)
			: endpointGreaterThan(value, int.lower.value);

	// If comparison failed or value is below lower bound, not in interval
	if (aboveLower !== true) return false;

	// Check upper bound
	const belowUpper =
		int.upper.type === 'closed'
			? endpointLessThanOrEqual(value, int.upper.value)
			: endpointLessThan(value, int.upper.value);

	// If comparison failed or value is above upper bound, not in interval
	if (belowUpper !== true) return false;

	return true;
}

/**
 * Check if an interval is empty (degenerate or inverted).
 * Returns undefined if comparison is not possible.
 */
function isIntervalEmpty(int: Interval): boolean {
	const cmp = compare(int.lower.value, int.upper.value);

	// If comparison is undefined, assume not empty (conservative)
	if (cmp === undefined) return false;

	if (cmp > 0) return true; // Inverted: lower > upper
	if (cmp === 0) {
		// Single point: only valid if both endpoints are closed
		return !(int.lower.type === 'closed' && int.upper.type === 'closed');
	}
	return false;
}

/**
 * Convert domain to IntervalSet if possible.
 */
function toIntervalSet(d: IntervalDomain): IntervalSet | null {
	if (d.kind === 'empty') return null;
	if (d.kind === 'universal') return intervalSet([realLine()]);
	if (d.kind === 'interval_set') return d;
	return null;
}

// =============================================================================
// isEmpty
// =============================================================================

/**
 * Check if a domain is empty (contains no values).
 */
export function isEmpty(d: IntervalDomain): boolean {
	switch (d.kind) {
		case 'empty':
			return true;
		case 'universal':
			return false;
		case 'interval_set':
			if (d.intervals.length === 0) return true;
			return d.intervals.every(isIntervalEmpty);
	}
}

/**
 * Check if a domain is the universal set.
 */
export function isUniversal(d: IntervalDomain): boolean {
	if (d.kind === 'universal') return true;
	if (d.kind === 'empty') return false;

	return coversAllReals([...d.intervals]);
}

// =============================================================================
// containsValue
// =============================================================================

/**
 * Check if a domain contains a specific MathNode value.
 * Uses symbolic comparison via compareNumericNodes for exact results.
 *
 * @param d - The interval domain to check
 * @param value - A MathNode representing the value to check
 * @returns true if value is in the domain, false otherwise
 *
 * @example
 * containsValue(positiveReals, number('5'))     // true
 * containsValue(positiveReals, number('-3'))    // false
 * containsValue(unitInterval, piConstant())      // false (π > 1)
 * containsValue(interval_0_pi, sqrt(2))         // true (√2 ≈ 1.41 < π)
 * containsValue(positiveReals, 5)               // true (accepts raw numbers)
 */
export function containsValue(d: IntervalDomain, value: MathNode | number): boolean {
	// Convert raw numbers to MathNode
	if (typeof value === 'number') {
		return containsValue(d, fromNumber(value));
	}
	switch (d.kind) {
		case 'empty':
			return false;
		case 'universal':
			return true;
		case 'interval_set': {
			// Check if value is in any interval
			for (const int of d.intervals) {
				if (nodeInInterval(value, int)) return true;
			}
			return false;
		}
	}
}

// =============================================================================
// intersect
// =============================================================================

/**
 * Compute the intersection of two intervals.
 * Returns null if the intersection is empty.
 */
function intersectIntervals(a: Interval, b: Interval): Interval | null {
	// Find the max of lower bounds
	const cmpLower = compare(a.lower.value, b.lower.value);

	// If comparison is undefined, keep interval a's lower (conservative)
	let lower: Endpoint;
	if (cmpLower === undefined || cmpLower > 0) {
		lower = a.lower;
	} else if (cmpLower < 0) {
		lower = b.lower;
	} else {
		// Same value - use the more restrictive type
		const type = a.lower.type === 'open' || b.lower.type === 'open' ? 'open' : 'closed';
		lower = { value: a.lower.value, type };
	}

	// Find the min of upper bounds
	const cmpUpper = compare(a.upper.value, b.upper.value);

	let upper: Endpoint;
	if (cmpUpper === undefined || cmpUpper < 0) {
		upper = a.upper;
	} else if (cmpUpper > 0) {
		upper = b.upper;
	} else {
		const type = a.upper.type === 'open' || b.upper.type === 'open' ? 'open' : 'closed';
		upper = { value: a.upper.value, type };
	}

	const result = interval(lower, upper);
	return isIntervalEmpty(result) ? null : result;
}

/**
 * Compute the intersection of two domains.
 */
export function intersect(a: IntervalDomain, b: IntervalDomain): IntervalDomain {
	// Empty intersected with anything is empty
	if (a.kind === 'empty' || b.kind === 'empty') {
		return EMPTY_SET;
	}

	// Universal intersected with anything is that thing
	if (a.kind === 'universal') return b;
	if (b.kind === 'universal') return a;

	// Both are interval sets
	const aInt = toIntervalSet(a);
	const bInt = toIntervalSet(b);

	if (!aInt || !bInt) {
		return EMPTY_SET;
	}

	// Intersect each pair of intervals
	const resultIntervals: Interval[] = [];
	for (const ai of aInt.intervals) {
		for (const bi of bInt.intervals) {
			const inter = intersectIntervals(ai, bi);
			if (inter) {
				resultIntervals.push(inter);
			}
		}
	}

	if (resultIntervals.length === 0) {
		return EMPTY_SET;
	}

	return intervalSet(resultIntervals);
}

// =============================================================================
// union
// =============================================================================

/**
 * Check if an interval set covers all reals.
 */
function coversAllReals(intervals: Interval[]): boolean {
	if (intervals.length === 0) return false;

	const normalized = normalizeIntervals(intervals);
	if (normalized.length !== 1) return false;

	const i = normalized[0];
	return isNegativeInfinity(i.lower.value) && isPositiveInfinity(i.upper.value);
}

/**
 * Compute the union of two domains.
 */
export function union(a: IntervalDomain, b: IntervalDomain): IntervalDomain {
	// Universal unioned with anything is universal
	if (a.kind === 'universal' || b.kind === 'universal') {
		return UNIVERSAL_SET;
	}

	// Empty unioned with anything is that thing
	if (a.kind === 'empty') return b;
	if (b.kind === 'empty') return a;

	// Both are interval sets
	const aInt = toIntervalSet(a);
	const bInt = toIntervalSet(b);

	if (!aInt || !bInt) {
		return a;
	}

	// Combine all intervals and normalize
	const allIntervals = [...aInt.intervals, ...bInt.intervals];
	const normalized = normalizeIntervals(allIntervals);

	// Check if covers all reals
	if (coversAllReals(normalized)) {
		return UNIVERSAL_SET;
	}

	return intervalSet(normalized);
}

// =============================================================================
// complement
// =============================================================================

/**
 * Compute the complement of a single interval.
 */
function complementInterval(int: Interval): Interval[] {
	const result: Interval[] = [];

	// Left part: ]-inf, lower] (flipped type)
	if (!isNegativeInfinity(int.lower.value)) {
		const upperType = int.lower.type === 'open' ? 'closed' : 'open';
		result.push(interval(negInfinity(), { value: int.lower.value, type: upperType }));
	}

	// Right part: [upper, +inf[ (flipped type)
	if (!isPositiveInfinity(int.upper.value)) {
		const lowerType = int.upper.type === 'open' ? 'closed' : 'open';
		result.push(interval({ value: int.upper.value, type: lowerType }, posInfinity()));
	}

	return result;
}

/**
 * Compute the complement of a domain.
 */
export function complement(d: IntervalDomain): IntervalDomain {
	switch (d.kind) {
		case 'empty':
			return UNIVERSAL_SET;
		case 'universal':
			return EMPTY_SET;
		case 'interval_set': {
			if (d.intervals.length === 0) {
				return UNIVERSAL_SET;
			}

			// For single interval, complement directly
			if (d.intervals.length === 1) {
				const compIntervals = complementInterval(d.intervals[0]);
				if (compIntervals.length === 0) {
					return EMPTY_SET;
				}
				return intervalSet(compIntervals);
			}

			// For multiple intervals: complement = intersection of complements
			let result: IntervalDomain = universalSet();
			for (const int of d.intervals) {
				const compInt = complementInterval(int);
				if (compInt.length === 0) {
					return EMPTY_SET;
				}
				result = intersect(result, intervalSet(compInt));
			}

			// TODO: Handle excluded points becoming included in complement
			return result;
		}
	}
}

/**
 * Compute the difference of two domains: a \ b = a ∩ complement(b)
 */
export function difference(a: IntervalDomain, b: IntervalDomain): IntervalDomain {
	return intersect(a, complement(b));
}

// =============================================================================
// Interval Arithmetic
// =============================================================================

/**
 * Interface representing numeric bounds for interval arithmetic.
 */
export interface Bounds {
	lower: number | null; // null = -∞
	upper: number | null; // null = +∞
	lowerInclusive: boolean;
	upperInclusive: boolean;
}

/**
 * Extract numeric bounds from an IntervalDomain.
 * Returns null if domain is empty or has multiple disjoint intervals.
 */
export function getBoundsFromDomain(domain: IntervalDomain): Bounds | null {
	if (domain.kind === 'empty') return null;

	if (domain.kind === 'universal') {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}

	if (domain.kind === 'interval_set') {
		if (domain.intervals.length === 0) return null;
		if (domain.intervals.length > 1) {
			// Multiple disjoint intervals - can't represent as single bounds
			// Return convex hull (min lower, max upper) for approximation
			let lower: number | null = null;
			let upper: number | null = null;
			let lowerInclusive = false;
			let upperInclusive = false;

			for (const int of domain.intervals) {
				const l = endpointToNumber(int.lower.value);
				const u = endpointToNumber(int.upper.value);

				if (l === -Infinity) {
					lower = null;
					lowerInclusive = false;
				} else if (lower === null || l < lower) {
					lower = l;
					lowerInclusive = int.lower.type === 'closed';
				} else if (l === lower && int.lower.type === 'closed') {
					lowerInclusive = true;
				}

				if (u === Infinity) {
					upper = null;
					upperInclusive = false;
				} else if (upper === null || u > upper) {
					upper = u;
					upperInclusive = int.upper.type === 'closed';
				} else if (u === upper && int.upper.type === 'closed') {
					upperInclusive = true;
				}
			}

			return { lower, upper, lowerInclusive, upperInclusive };
		}

		const int = domain.intervals[0];
		const lower = endpointToNumber(int.lower.value);
		const upper = endpointToNumber(int.upper.value);

		return {
			lower: lower === -Infinity ? null : lower,
			upper: upper === Infinity ? null : upper,
			lowerInclusive: int.lower.type === 'closed',
			upperInclusive: int.upper.type === 'closed'
		};
	}

	return null;
}

/**
 * Create an IntervalDomain from numeric bounds.
 */
export function domainFromBounds(bounds: Bounds): IntervalDomain {
	const { lower, lowerInclusive, upper, upperInclusive } = bounds;

	if (lower === null && upper === null) {
		return universalSet();
	}

	if (lower !== null && upper !== null && lower > upper) {
		return EMPTY_SET;
	}

	if (lower !== null && upper !== null) {
		if (lowerInclusive && upperInclusive) {
			return intervalSet([
				interval(
					{ value: fromNumber(lower), type: 'closed' },
					{ value: fromNumber(upper), type: 'closed' }
				)
			]);
		} else if (!lowerInclusive && !upperInclusive) {
			return intervalSet([
				interval(
					{ value: fromNumber(lower), type: 'open' },
					{ value: fromNumber(upper), type: 'open' }
				)
			]);
		} else if (lowerInclusive && !upperInclusive) {
			return intervalSet([
				interval(
					{ value: fromNumber(lower), type: 'closed' },
					{ value: fromNumber(upper), type: 'open' }
				)
			]);
		} else {
			return intervalSet([
				interval(
					{ value: fromNumber(lower), type: 'open' },
					{ value: fromNumber(upper), type: 'closed' }
				)
			]);
		}
	}

	if (lower !== null) {
		if (lowerInclusive) {
			return intervalSet([interval({ value: fromNumber(lower), type: 'closed' }, posInfinity())]);
		} else {
			return intervalSet([interval({ value: fromNumber(lower), type: 'open' }, posInfinity())]);
		}
	}

	// upper !== null
	if (upperInclusive) {
		return intervalSet([interval(negInfinity(), { value: fromNumber(upper!), type: 'closed' })]);
	} else {
		return intervalSet([interval(negInfinity(), { value: fromNumber(upper!), type: 'open' })]);
	}
}
