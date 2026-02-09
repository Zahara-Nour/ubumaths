/**
 * Interval normalization - sort and merge overlapping/adjacent intervals.
 *
 * Extracted into its own module to avoid circular dependencies:
 * algebra.ts imports from factory.ts (for intervalSet, interval, etc.),
 * so factory.ts cannot import from algebra.ts. This module depends only
 * on endpoint.ts and types.ts, allowing both factory.ts and algebra.ts
 * to import from it.
 */

import type { Interval, Endpoint } from './types';
import { compare } from './compare';

/**
 * Check if two intervals overlap or are adjacent.
 */
function intervalsOverlapOrAdjacent(a: Interval, b: Interval): boolean {
	const cmp1 = compare(a.upper.value, b.lower.value);
	const cmp2 = compare(b.upper.value, a.lower.value);

	// If comparison is undefined, assume they don't overlap (conservative)
	if (cmp1 === undefined || cmp2 === undefined) return false;

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
	const cmpLower = compare(a.lower.value, b.lower.value);
	let lower: Endpoint;
	if (cmpLower === undefined || cmpLower < 0) {
		lower = a.lower;
	} else if (cmpLower > 0) {
		lower = b.lower;
	} else {
		// Same value - use the more permissive type
		const type = a.lower.type === 'closed' || b.lower.type === 'closed' ? 'closed' : 'open';
		lower = { value: a.lower.value, type };
	}

	// Take max of upper bounds
	const cmpUpper = compare(a.upper.value, b.upper.value);
	let upper: Endpoint;
	if (cmpUpper === undefined || cmpUpper > 0) {
		upper = a.upper;
	} else if (cmpUpper < 0) {
		upper = b.upper;
	} else {
		const type = a.upper.type === 'closed' || b.upper.type === 'closed' ? 'closed' : 'open';
		upper = { value: a.upper.value, type };
	}

	// Inline interval construction to avoid importing from factory.ts
	return { kind: 'interval', lower, upper };
}

/**
 * Sort intervals by lower bound and merge overlapping/adjacent ones.
 *
 * Guarantees the output is a list of disjoint, sorted intervals.
 * This is the single source of truth for the disjointness invariant
 * of IntervalSet - called by intervalSet() at construction time.
 */
export function normalizeIntervals(intervals: readonly Interval[]): Interval[] {
	if (intervals.length <= 1) return [...intervals];

	// Sort by lower bound
	const sorted = [...intervals].sort((a, b) => {
		const cmp = compare(a.lower.value, b.lower.value);
		// If comparison is undefined, keep original order
		return cmp ?? 0;
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
