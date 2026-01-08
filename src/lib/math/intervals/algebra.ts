/**
 * Interval Algebra - Set operations on intervals
 *
 * Operations: isEmpty, containsValue, intersect, union, complement, difference
 * Uses exact algebraic comparison when possible.
 */

import type {
	IntervalDomain,
	Interval,
	Endpoint,
	EndpointValue,
	ExcludedPoint,
	IntervalSet
} from './types';
import {
	universalSet,
	intervalSet,
	interval,
	negInfinity,
	posInfinity,
	realLine,
	excludedPoint as createExcludedPoint,
	EMPTY_SET,
	UNIVERSAL_SET
} from './factory';
import {
	compareEndpointValues,
	endpointToNumber,
	isNegativeInfinity,
	isPositiveInfinity
} from './endpoint';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a numeric value is contained in an interval.
 */
function valueInInterval(value: number, int: Interval): boolean {
	const lower = endpointToNumber(int.lower.value);
	const upper = endpointToNumber(int.upper.value);

	if (Number.isNaN(lower) || Number.isNaN(upper)) {
		return false;
	}

	const aboveLower = int.lower.type === 'closed' ? value >= lower : value > lower;
	const belowUpper = int.upper.type === 'closed' ? value <= upper : value < upper;

	return aboveLower && belowUpper;
}

/**
 * Check if an interval is empty (degenerate or inverted).
 */
function isIntervalEmpty(int: Interval): boolean {
	const { result: cmp } = compareEndpointValues(int.lower.value, int.upper.value);

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

	// Check if interval set covers all reals with no excluded points
	if (d.excludedPoints.length > 0) return false;

	return coversAllReals([...d.intervals]);
}

// =============================================================================
// containsValue
// =============================================================================

/**
 * Check if a domain contains a specific numeric value.
 */
export function containsValue(d: IntervalDomain, value: number): boolean {
	switch (d.kind) {
		case 'empty':
			return false;
		case 'universal':
			return true;
		case 'interval_set': {
			// Check if value is excluded
			for (const ep of d.excludedPoints) {
				const epVal = endpointToNumber(ep.value);
				if (value === epVal) return false;
			}
			// Check if value is in any interval
			for (const int of d.intervals) {
				if (valueInInterval(value, int)) return true;
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
	const { result: cmpLower } = compareEndpointValues(a.lower.value, b.lower.value);
	let lower: Endpoint;
	if (cmpLower > 0) {
		lower = a.lower;
	} else if (cmpLower < 0) {
		lower = b.lower;
	} else {
		// Same value - use the more restrictive type
		const type = a.lower.type === 'open' || b.lower.type === 'open' ? 'open' : 'closed';
		lower = { value: a.lower.value, type };
	}

	// Find the min of upper bounds
	const { result: cmpUpper } = compareEndpointValues(a.upper.value, b.upper.value);
	let upper: Endpoint;
	if (cmpUpper < 0) {
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

	// Combine excluded points from both
	const allExcluded = [...aInt.excludedPoints, ...bInt.excludedPoints];
	const uniqueExcluded = deduplicateExcludedPoints(allExcluded);

	return intervalSet(resultIntervals, uniqueExcluded);
}

// =============================================================================
// union
// =============================================================================

/**
 * Check if two intervals overlap or are adjacent.
 */
function intervalsOverlapOrAdjacent(a: Interval, b: Interval): boolean {
	const { result: cmp1 } = compareEndpointValues(a.upper.value, b.lower.value);
	const { result: cmp2 } = compareEndpointValues(b.upper.value, a.lower.value);

	// They don't overlap if one is entirely before the other
	if (cmp1 < 0) return false; // a entirely before b
	if (cmp2 < 0) return false; // b entirely before a

	// At boundary: adjacent if at least one is closed
	if (cmp1 === 0) {
		return a.upper.type === 'closed' || b.lower.type === 'closed';
	}
	if (cmp2 === 0) {
		return b.upper.type === 'closed' || a.lower.type === 'closed';
	}

	return true;
}

/**
 * Merge two overlapping or adjacent intervals into one.
 */
function mergeIntervals(a: Interval, b: Interval): Interval {
	// Take min of lower bounds
	const { result: cmpLower } = compareEndpointValues(a.lower.value, b.lower.value);
	let lower: Endpoint;
	if (cmpLower < 0) {
		lower = a.lower;
	} else if (cmpLower > 0) {
		lower = b.lower;
	} else {
		// Same value - use the more permissive type
		const type = a.lower.type === 'closed' || b.lower.type === 'closed' ? 'closed' : 'open';
		lower = { value: a.lower.value, type };
	}

	// Take max of upper bounds
	const { result: cmpUpper } = compareEndpointValues(a.upper.value, b.upper.value);
	let upper: Endpoint;
	if (cmpUpper > 0) {
		upper = a.upper;
	} else if (cmpUpper < 0) {
		upper = b.upper;
	} else {
		const type = a.upper.type === 'closed' || b.upper.type === 'closed' ? 'closed' : 'open';
		upper = { value: a.upper.value, type };
	}

	return interval(lower, upper);
}

/**
 * Normalize a list of intervals by merging overlapping ones.
 */
function normalizeIntervals(intervals: Interval[]): Interval[] {
	if (intervals.length <= 1) return intervals;

	// Sort by lower bound
	const sorted = [...intervals].sort((a, b) => {
		const { result } = compareEndpointValues(a.lower.value, b.lower.value);
		return result;
	});

	const result: Interval[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		const last = result[result.length - 1];
		const current = sorted[i];

		if (intervalsOverlapOrAdjacent(last, current)) {
			result[result.length - 1] = mergeIntervals(last, current);
		} else {
			result.push(current);
		}
	}

	return result;
}

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
		// Intersect excluded points (point must be excluded in both to remain excluded)
		const aExcludedValues = new Set(aInt.excludedPoints.map((e) => endpointToNumber(e.value)));
		const commonExcluded = bInt.excludedPoints.filter((e) =>
			aExcludedValues.has(endpointToNumber(e.value))
		);

		if (commonExcluded.length === 0) {
			return UNIVERSAL_SET;
		}

		return intervalSet(normalized, commonExcluded);
	}

	// Keep only excluded points that are in the union's intervals
	const allExcluded = [...aInt.excludedPoints, ...bInt.excludedPoints];

	return intervalSet(normalized, deduplicateExcludedPoints(allExcluded));
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

			// For single interval without excluded points, complement directly
			if (d.intervals.length === 1 && d.excludedPoints.length === 0) {
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
// excludePoints
// =============================================================================

/**
 * Deduplicate excluded points by value.
 */
function deduplicateExcludedPoints(points: readonly ExcludedPoint[]): ExcludedPoint[] {
	const seen = new Set<number>();
	const result: ExcludedPoint[] = [];

	for (const p of points) {
		const val = endpointToNumber(p.value);
		if (!Number.isNaN(val) && !seen.has(val)) {
			seen.add(val);
			result.push(p);
		} else if (Number.isNaN(val)) {
			// For algebraic values that can't be converted to numbers,
			// we keep all of them (may result in duplicates for complex algebraic expressions)
			result.push(p);
		}
	}

	return result;
}

/**
 * Add excluded points to a domain.
 */
export function excludePoints(d: IntervalDomain, values: EndpointValue[]): IntervalDomain {
	if (d.kind === 'empty') return EMPTY_SET;

	const newExcluded = values.map((v) => createExcludedPoint(v));

	if (d.kind === 'universal') {
		return intervalSet([realLine()], newExcluded);
	}

	if (d.kind === 'interval_set') {
		const combined = [...d.excludedPoints, ...newExcluded];
		return intervalSet([...d.intervals], deduplicateExcludedPoints(combined));
	}

	return d;
}
