/**
 * Domain algebra operations: intersection, union, complement, etc.
 */

import type {
	Domain,
	Interval,
	Endpoint,
	EndpointValue,
	ExcludedPoint,
	IntervalDomain
} from './types';
import {
	universalDomain,
	intervalDomain,
	interval,
	negInfinity,
	posInfinity,
	realLine,
	excludedPoint,
	EMPTY_DOMAIN,
	UNIVERSAL_DOMAIN
} from './factory';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert EndpointValue to a comparable number.
 * Returns -Infinity or +Infinity for symbolic infinities.
 * For MathNode values, returns NaN (not directly comparable).
 */
function endpointToNumber(value: EndpointValue): number {
	if (value === 'negative_infinity') return -Infinity;
	if (value === 'positive_infinity') return Infinity;
	if (typeof value === 'number') return value;
	// MathNode - cannot directly compare
	return NaN;
}

/**
 * Compare two endpoint values.
 * Returns -1 if a < b, 0 if a = b, 1 if a > b.
 * Returns NaN if values are not comparable (symbolic MathNodes).
 */
function compareEndpointValues(a: EndpointValue, b: EndpointValue): number {
	const na = endpointToNumber(a);
	const nb = endpointToNumber(b);
	if (Number.isNaN(na) || Number.isNaN(nb)) return NaN;
	if (na < nb) return -1;
	if (na > nb) return 1;
	return 0;
}

/**
 * Check if a numeric value is contained in an interval.
 */
function valueInInterval(value: number, int: Interval): boolean {
	const lower = endpointToNumber(int.lower.value);
	const upper = endpointToNumber(int.upper.value);

	if (Number.isNaN(lower) || Number.isNaN(upper)) {
		// Cannot determine for symbolic bounds
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
	const cmp = compareEndpointValues(int.lower.value, int.upper.value);
	if (Number.isNaN(cmp)) return false; // Cannot determine for symbolic

	if (cmp > 0) return true; // Inverted: lower > upper
	if (cmp === 0) {
		// Single point: only valid if both endpoints are closed
		return !(int.lower.type === 'closed' && int.upper.type === 'closed');
	}
	return false;
}

/**
 * Convert domain to IntervalDomain if possible.
 */
function toIntervalDomain(d: Domain): IntervalDomain | null {
	if (d.kind === 'empty') return null;
	if (d.kind === 'universal') return intervalDomain([realLine()]);
	if (d.kind === 'interval_domain') return d;
	// ConditionDomain would need conversion logic
	return null;
}

// =============================================================================
// isEmpty
// =============================================================================

/**
 * Check if a domain is empty (contains no values).
 */
export function isEmpty(d: Domain): boolean {
	switch (d.kind) {
		case 'empty':
			return true;
		case 'universal':
			return false;
		case 'interval_domain':
			// Empty if no intervals or all intervals are empty
			if (d.intervals.length === 0) return true;
			return d.intervals.every(isIntervalEmpty);
		case 'condition_domain':
			// Cannot easily determine for condition domains
			return false;
	}
}

// =============================================================================
// containsValue
// =============================================================================

/**
 * Check if a domain contains a specific numeric value.
 */
export function containsValue(d: Domain, value: number): boolean {
	switch (d.kind) {
		case 'empty':
			return false;
		case 'universal':
			return true;
		case 'interval_domain': {
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
		case 'condition_domain':
			// Would need to evaluate conditions
			return false;
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
	const cmpLower = compareEndpointValues(a.lower.value, b.lower.value);
	let lower: Endpoint;
	if (Number.isNaN(cmpLower)) {
		// Cannot compare symbolic - take a's lower
		lower = a.lower;
	} else if (cmpLower > 0) {
		lower = a.lower;
	} else if (cmpLower < 0) {
		lower = b.lower;
	} else {
		// Same value - use the more restrictive type
		const type = a.lower.type === 'open' || b.lower.type === 'open' ? 'open' : 'closed';
		lower = { value: a.lower.value, type };
	}

	// Find the min of upper bounds
	const cmpUpper = compareEndpointValues(a.upper.value, b.upper.value);
	let upper: Endpoint;
	if (Number.isNaN(cmpUpper)) {
		upper = a.upper;
	} else if (cmpUpper < 0) {
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
export function intersect(a: Domain, b: Domain): Domain {
	// Empty intersected with anything is empty
	if (a.kind === 'empty' || b.kind === 'empty') {
		return EMPTY_DOMAIN;
	}

	// Universal intersected with anything is that thing
	if (a.kind === 'universal') return b;
	if (b.kind === 'universal') return a;

	// Both are interval domains
	const aInt = toIntervalDomain(a);
	const bInt = toIntervalDomain(b);

	if (!aInt || !bInt) {
		// Cannot intersect condition domains yet
		return EMPTY_DOMAIN;
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
		return EMPTY_DOMAIN;
	}

	// Combine excluded points from both
	const allExcluded = [...aInt.excludedPoints, ...bInt.excludedPoints];
	const uniqueExcluded = deduplicateExcludedPoints(allExcluded);

	return intervalDomain(resultIntervals, uniqueExcluded);
}

// =============================================================================
// union
// =============================================================================

/**
 * Check if two intervals overlap or are adjacent.
 */
function intervalsOverlapOrAdjacent(a: Interval, b: Interval): boolean {
	// Check if a's upper meets/exceeds b's lower
	const cmp1 = compareEndpointValues(a.upper.value, b.lower.value);
	const cmp2 = compareEndpointValues(b.upper.value, a.lower.value);

	if (Number.isNaN(cmp1) || Number.isNaN(cmp2)) return false;

	// They overlap if neither is entirely before the other
	// Adjacent if endpoints meet (one closed, one open at same point counts)
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
	const cmpLower = compareEndpointValues(a.lower.value, b.lower.value);
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
	const cmpUpper = compareEndpointValues(a.upper.value, b.upper.value);
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
		const cmp = compareEndpointValues(a.lower.value, b.lower.value);
		if (Number.isNaN(cmp)) return 0;
		return cmp;
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
 * Check if an interval domain covers all reals.
 */
function coversAllReals(intervals: Interval[]): boolean {
	if (intervals.length === 0) return false;

	const normalized = normalizeIntervals(intervals);
	if (normalized.length !== 1) return false;

	const i = normalized[0];
	return i.lower.value === 'negative_infinity' && i.upper.value === 'positive_infinity';
}

/**
 * Compute the union of two domains.
 */
export function union(a: Domain, b: Domain): Domain {
	// Universal unioned with anything is universal
	if (a.kind === 'universal' || b.kind === 'universal') {
		return UNIVERSAL_DOMAIN;
	}

	// Empty unioned with anything is that thing
	if (a.kind === 'empty') return b;
	if (b.kind === 'empty') return a;

	// Both are interval domains
	const aInt = toIntervalDomain(a);
	const bInt = toIntervalDomain(b);

	if (!aInt || !bInt) {
		// Cannot union condition domains yet
		return a;
	}

	// Combine all intervals and normalize
	const allIntervals = [...aInt.intervals, ...bInt.intervals];
	const normalized = normalizeIntervals(allIntervals);

	// Check if covers all reals
	if (coversAllReals(normalized)) {
		// Check excluded points - if none remain, it's universal
		// Intersect excluded points (point must be excluded in both to remain excluded)
		const aExcludedValues = new Set(aInt.excludedPoints.map((e) => endpointToNumber(e.value)));
		const commonExcluded = bInt.excludedPoints.filter((e) =>
			aExcludedValues.has(endpointToNumber(e.value))
		);

		if (commonExcluded.length === 0) {
			return UNIVERSAL_DOMAIN;
		}

		return intervalDomain(normalized, commonExcluded);
	}

	// Keep only excluded points that are in the union's intervals
	// (excluded points outside the intervals don't matter)
	const allExcluded = [...aInt.excludedPoints, ...bInt.excludedPoints];

	return intervalDomain(normalized, deduplicateExcludedPoints(allExcluded));
}

// =============================================================================
// complement
// =============================================================================

/**
 * Compute the complement of a single interval.
 */
function complementInterval(int: Interval): Interval[] {
	const result: Interval[] = [];

	// Left part: ]-inf, lower]  (flipped type)
	if (int.lower.value !== 'negative_infinity') {
		const upperType = int.lower.type === 'open' ? 'closed' : 'open';
		result.push(interval(negInfinity(), { value: int.lower.value, type: upperType }));
	}

	// Right part: [upper, +inf[ (flipped type)
	if (int.upper.value !== 'positive_infinity') {
		const lowerType = int.upper.type === 'open' ? 'closed' : 'open';
		result.push(interval({ value: int.upper.value, type: lowerType }, posInfinity()));
	}

	return result;
}

/**
 * Compute the complement of a domain.
 */
export function complement(d: Domain): Domain {
	switch (d.kind) {
		case 'empty':
			return UNIVERSAL_DOMAIN;
		case 'universal':
			return EMPTY_DOMAIN;
		case 'interval_domain': {
			if (d.intervals.length === 0) {
				return UNIVERSAL_DOMAIN;
			}

			// For single interval, complement directly
			if (d.intervals.length === 1 && d.excludedPoints.length === 0) {
				const compIntervals = complementInterval(d.intervals[0]);
				if (compIntervals.length === 0) {
					return EMPTY_DOMAIN;
				}
				return intervalDomain(compIntervals);
			}

			// For multiple intervals: complement = intersection of complements
			// Start with universal and subtract each interval
			let result: Domain = universalDomain();
			for (const int of d.intervals) {
				const compInt = complementInterval(int);
				if (compInt.length === 0) {
					return EMPTY_DOMAIN;
				}
				result = intersect(result, intervalDomain(compInt));
			}

			// TODO: Handle excluded points becoming included in complement
			return result;
		}
		case 'condition_domain':
			// Cannot complement condition domains easily
			return EMPTY_DOMAIN;
	}
}

// =============================================================================
// excludePoints
// =============================================================================

/**
 * Deduplicate excluded points by value.
 */
function deduplicateExcludedPoints(points: ExcludedPoint[]): ExcludedPoint[] {
	const seen = new Set<number>();
	const result: ExcludedPoint[] = [];

	for (const p of points) {
		const val = endpointToNumber(p.value);
		if (!Number.isNaN(val) && !seen.has(val)) {
			seen.add(val);
			result.push(p);
		} else if (Number.isNaN(val)) {
			// Keep symbolic excluded points (may have duplicates)
			result.push(p);
		}
	}

	return result;
}

/**
 * Add excluded points to a domain.
 */
export function excludePoints(d: Domain, values: number[]): Domain {
	if (d.kind === 'empty') return EMPTY_DOMAIN;

	const newExcluded = values.map((v) => excludedPoint(v));

	if (d.kind === 'universal') {
		return intervalDomain([realLine()], newExcluded);
	}

	if (d.kind === 'interval_domain') {
		const combined = [...d.excludedPoints, ...newExcluded];
		return intervalDomain(d.intervals, deduplicateExcludedPoints(combined));
	}

	// Cannot add excluded points to condition domain easily
	return d;
}
