/**
 * Interval Algebra - Set operations and arithmetic on intervals
 *
 * Set operations: isEmpty, containsValue, intersect, union, complement, difference
 * Arithmetic: addBounds, subtractBounds, negateBounds, multiplyBounds, divideBounds
 * Specialized: absBounds, powerBounds
 * Utilities: getEndpoints, combineEndpointTypes, buildInterval
 *
 * Uses mathAST's compareNumericNodes for exact symbolic comparison.
 * Arithmetic preserves symbolic MathNode endpoints throughout.
 */

import type { IntervalDomain, Interval, Endpoint, EndpointType, IntervalSet } from './types';
import {
	universalSet,
	intervalSet,
	interval,
	negInfinityEndpoint,
	posInfinityEndpoint,
	realLine,
	EMPTY_SET,
	UNIVERSAL_SET
} from './factory';
import { numericNode } from '$lib/mathAST/common/numeric';
import {
	endpointToNumber,
	isNegativeInfinityEndpoint,
	isPositiveInfinityEndpoint
} from './endpoint';
import { normalizeIntervals } from './normalize';
import type { MathNode } from '$lib/mathAST/types';
import {
	add as addNode,
	subtract as subtractNode,
	opposite as oppositeNode,
	implicitMultiply as multiplyNode,
	fraction as divideNode,
	infinity,
	number as numberNode,
	power as powerNode
} from '$lib/mathAST/factory';
import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a MathNode value is contained in an interval.
 * Uses symbolic comparison via compareNumericNodes for exact results.
 */
function nodeInInterval(value: MathNode, int: Interval): boolean {
	// Check lower bound
	const cmpLo = compareNumericNodes(value, int.lower.value);
	if (cmpLo === undefined) return false;
	if (int.lower.type === 'closed' ? cmpLo < 0 : cmpLo <= 0) return false;

	// Check upper bound
	const cmpHi = compareNumericNodes(value, int.upper.value);
	if (cmpHi === undefined) return false;
	if (int.upper.type === 'closed' ? cmpHi > 0 : cmpHi >= 0) return false;

	return true;
}

/**
 * Check if an interval is empty (degenerate or inverted).
 * Returns undefined if comparison is not possible.
 */
function isIntervalEmpty(int: Interval): boolean {
	const cmp = compareNumericNodes(int.lower.value, int.upper.value);

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
export function isEmptyInterval(d: IntervalDomain): boolean {
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
export function isUniversalInterval(d: IntervalDomain): boolean {
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
 * containsValue(positiveReals, opposite(number('3')))    // false
 * containsValue(unitInterval, piConstant())      // false (π > 1)
 * containsValue(interval_0_pi, sqrt(2))         // true (√2 ≈ 1.41 < π)
 * containsValue(positiveReals, 5)               // true (accepts raw numbers)
 */
export function containsValue(d: IntervalDomain, value: MathNode | number): boolean {
	// Convert raw numbers to MathNode
	if (typeof value === 'number') {
		return containsValue(d, numericNode(value));
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
	const cmpLower = compareNumericNodes(a.lower.value, b.lower.value);

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
	const cmpUpper = compareNumericNodes(a.upper.value, b.upper.value);

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
	return isNegativeInfinityEndpoint(i.lower.value) && isPositiveInfinityEndpoint(i.upper.value);
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
	if (!isNegativeInfinityEndpoint(int.lower.value)) {
		const upperType = int.lower.type === 'open' ? 'closed' : 'open';
		result.push(interval(negInfinityEndpoint(), { value: int.lower.value, type: upperType }));
	}

	// Right part: [upper, +inf[ (flipped type)
	if (!isPositiveInfinityEndpoint(int.upper.value)) {
		const lowerType = int.upper.type === 'open' ? 'closed' : 'open';
		result.push(interval({ value: int.upper.value, type: lowerType }, posInfinityEndpoint()));
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
// Symbolic Interval Utilities
// =============================================================================

const ZERO = numberNode('0');

/**
 * Extract the overall lower and upper endpoints (convex hull) from an IntervalDomain.
 * Returns null for empty domains.
 *
 * For multi-interval sets, returns the first lower and last upper endpoint,
 * which is the convex hull of the union.
 */
export function getEndpoints(domain: IntervalDomain): { lo: Endpoint; hi: Endpoint } | null {
	if (domain.kind === 'empty') return null;
	if (domain.kind === 'universal') {
		return {
			lo: { value: infinity('negative'), type: 'open' as EndpointType },
			hi: { value: infinity('positive'), type: 'open' as EndpointType }
		};
	}
	const { intervals } = domain;
	if (intervals.length === 0) return null;
	return {
		lo: intervals[0].lower,
		hi: intervals[intervals.length - 1].upper
	};
}

/**
 * Combine two endpoint types: both must be closed for result to be closed.
 */
export function combineEndpointTypes(a: EndpointType, b: EndpointType): EndpointType {
	return a === 'closed' && b === 'closed' ? 'closed' : 'open';
}

/**
 * Build an IntervalDomain from lower and upper endpoints.
 * Returns universal if both endpoints are infinite.
 */
export function buildInterval(
	lo: { value: MathNode; type: EndpointType },
	hi: { value: MathNode; type: EndpointType }
): IntervalDomain {
	if (isNegativeInfinityEndpoint(lo.value) && isPositiveInfinityEndpoint(hi.value)) {
		return universalSet();
	}
	return intervalSet([interval(lo, hi)]);
}

// =============================================================================
// Symbolic Interval Arithmetic
// =============================================================================

/**
 * Addition: [a,b] + [c,d] = [a+c, b+d] — always exact (Tier 1).
 */
export function addBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = getEndpoints(a);
	const be = getEndpoints(b);
	if (!ae || !be) return undefined;

	const loInf = isNegativeInfinityEndpoint(ae.lo.value) || isNegativeInfinityEndpoint(be.lo.value);
	const hiInf = isPositiveInfinityEndpoint(ae.hi.value) || isPositiveInfinityEndpoint(be.hi.value);

	return buildInterval(
		{
			value: loInf ? infinity('negative') : addNode(ae.lo.value, be.lo.value),
			type: loInf ? 'open' : combineEndpointTypes(ae.lo.type, be.lo.type)
		},
		{
			value: hiInf ? infinity('positive') : addNode(ae.hi.value, be.hi.value),
			type: hiInf ? 'open' : combineEndpointTypes(ae.hi.type, be.hi.type)
		}
	);
}

/**
 * Subtraction: [a,b] - [c,d] = [a-d, b-c] — always exact (Tier 1).
 */
export function subtractBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = getEndpoints(a);
	const be = getEndpoints(b);
	if (!ae || !be) return undefined;

	const loInf = isNegativeInfinityEndpoint(ae.lo.value) || isPositiveInfinityEndpoint(be.hi.value);
	const hiInf = isPositiveInfinityEndpoint(ae.hi.value) || isNegativeInfinityEndpoint(be.lo.value);

	return buildInterval(
		{
			value: loInf ? infinity('negative') : subtractNode(ae.lo.value, be.hi.value),
			type: loInf ? 'open' : combineEndpointTypes(ae.lo.type, be.hi.type)
		},
		{
			value: hiInf ? infinity('positive') : subtractNode(ae.hi.value, be.lo.value),
			type: hiInf ? 'open' : combineEndpointTypes(ae.hi.type, be.lo.type)
		}
	);
}

/**
 * Negation: -[a,b] = [-b, -a] — always exact (Tier 1).
 */
export function negateBounds(d: IntervalDomain): IntervalDomain | undefined {
	const e = getEndpoints(d);
	if (!e) return undefined;

	const loIsNegInf = isNegativeInfinityEndpoint(e.lo.value);
	const hiIsPosInf = isPositiveInfinityEndpoint(e.hi.value);

	return buildInterval(
		{
			value: hiIsPosInf ? infinity('negative') : oppositeNode(e.hi.value),
			type: e.hi.type
		},
		{
			value: loIsNegInf ? infinity('positive') : oppositeNode(e.lo.value),
			type: e.lo.type
		}
	);
}

/**
 * Multiplication using four-corners theorem (Tier 2/3).
 *
 * Evaluates all four corner products numerically to find min/max,
 * but builds result endpoints as symbolic MathNode trees.
 * Uses the convention 0 * Infinity = 0 for set-theoretic soundness.
 */
export function multiplyBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = getEndpoints(a);
	const be = getEndpoints(b);
	if (!ae || !be) return undefined;

	const aLoNum = endpointToNumber(ae.lo.value);
	const aHiNum = endpointToNumber(ae.hi.value);
	const bLoNum = endpointToNumber(be.lo.value);
	const bHiNum = endpointToNumber(be.hi.value);

	if (isNaN(aLoNum) || isNaN(aHiNum) || isNaN(bLoNum) || isNaN(bHiNum)) {
		return undefined;
	}

	const corners = [
		{ aEp: ae.lo, bEp: be.lo, val: aLoNum * bLoNum },
		{ aEp: ae.lo, bEp: be.hi, val: aLoNum * bHiNum },
		{ aEp: ae.hi, bEp: be.lo, val: aHiNum * bLoNum },
		{ aEp: ae.hi, bEp: be.hi, val: aHiNum * bHiNum }
	];

	// Handle 0 * Infinity = 0 convention
	for (const c of corners) {
		if (!isFinite(c.val)) {
			const aNum = endpointToNumber(c.aEp.value);
			const bNum = endpointToNumber(c.bEp.value);
			if (aNum === 0 || bNum === 0) {
				c.val = 0;
			}
		}
	}

	let minCorner = corners[0];
	let maxCorner = corners[0];
	for (const c of corners) {
		if (c.val < minCorner.val) minCorner = c;
		if (c.val > maxCorner.val) maxCorner = c;
	}

	const loValue =
		minCorner.val === -Infinity
			? infinity('negative')
			: multiplyNode(minCorner.aEp.value, minCorner.bEp.value);
	const hiValue =
		maxCorner.val === Infinity
			? infinity('positive')
			: multiplyNode(maxCorner.aEp.value, maxCorner.bEp.value);

	const loType: EndpointType = !isFinite(minCorner.val)
		? 'open'
		: combineEndpointTypes(minCorner.aEp.type, minCorner.bEp.type);
	const hiType: EndpointType = !isFinite(maxCorner.val)
		? 'open'
		: combineEndpointTypes(maxCorner.aEp.type, maxCorner.bEp.type);

	return buildInterval({ value: loValue, type: loType }, { value: hiValue, type: hiType });
}

/**
 * Division using four-corners theorem (Tier 2/3).
 *
 * If the divisor contains zero, returns universal set (unbounded).
 * Otherwise evaluates all four corner quotients numerically to find min/max,
 * but builds result endpoints as symbolic MathNode trees.
 */
export function divideBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = getEndpoints(a);
	const be = getEndpoints(b);
	if (!ae || !be) return undefined;

	// Check if divisor contains zero
	if (containsValue(b, 0)) {
		return universalSet();
	}

	const aLoNum = endpointToNumber(ae.lo.value);
	const aHiNum = endpointToNumber(ae.hi.value);
	const bLoNum = endpointToNumber(be.lo.value);
	const bHiNum = endpointToNumber(be.hi.value);

	if (isNaN(aLoNum) || isNaN(aHiNum) || isNaN(bLoNum) || isNaN(bHiNum)) {
		return undefined;
	}

	// If numerator is unbounded, result is universal
	if (!isFinite(aLoNum) || !isFinite(aHiNum)) {
		return universalSet();
	}

	// Four corners for division
	const corners: { aEp: Endpoint; bEp: Endpoint; val: number }[] = [];
	const aEndpoints = [ae.lo, ae.hi];
	const bEndpoints = [be.lo, be.hi];

	for (const aEp of aEndpoints) {
		for (const bEp of bEndpoints) {
			const bNum = endpointToNumber(bEp.value);
			const aNum = endpointToNumber(aEp.value);
			if (!isFinite(bNum)) {
				// a / +/-Infinity -> 0
				corners.push({ aEp, bEp, val: 0 });
			} else {
				corners.push({ aEp, bEp, val: aNum / bNum });
			}
		}
	}

	let minCorner = corners[0];
	let maxCorner = corners[0];
	for (const c of corners) {
		if (c.val < minCorner.val) minCorner = c;
		if (c.val > maxCorner.val) maxCorner = c;
	}

	const loValue = divideNode(minCorner.aEp.value, minCorner.bEp.value);
	const hiValue = divideNode(maxCorner.aEp.value, maxCorner.bEp.value);

	// For corners where b was infinite, endpoint is open (approached but not reached)
	const minBIsInf = !isFinite(endpointToNumber(minCorner.bEp.value));
	const maxBIsInf = !isFinite(endpointToNumber(maxCorner.bEp.value));

	const loType: EndpointType = minBIsInf
		? 'open'
		: combineEndpointTypes(minCorner.aEp.type, minCorner.bEp.type);
	const hiType: EndpointType = maxBIsInf
		? 'open'
		: combineEndpointTypes(maxCorner.aEp.type, maxCorner.bEp.type);

	return buildInterval({ value: loValue, type: loType }, { value: hiValue, type: hiType });
}

// =============================================================================
// Specialized Interval Operations
// =============================================================================

/**
 * Compute symbolic abs bounds: |[a, b]|
 *
 * - If a >= 0: [a, b] (identity)
 * - If b <= 0: [-b, -a] (negate)
 * - If a < 0 < b: [0, max(|a|, b)] — compare numerically, keep symbolic
 */
export function absBounds(d: IntervalDomain): IntervalDomain | undefined {
	const e = getEndpoints(d);
	if (!e) return undefined;

	const { lo, hi } = e;
	const loIsNegInf = isNegativeInfinityEndpoint(lo.value);
	const hiIsPosInf = isPositiveInfinityEndpoint(hi.value);

	const loCmp = loIsNegInf ? -1 : compareNumericNodes(lo.value, ZERO);
	const hiCmp = hiIsPosInf ? 1 : compareNumericNodes(hi.value, ZERO);

	if (loCmp === undefined || hiCmp === undefined) return undefined;

	// Entirely non-negative: lo >= 0
	if (loCmp >= 0) {
		return d;
	}

	// Entirely non-positive: hi <= 0
	if (hiCmp <= 0) {
		return buildInterval(
			{
				value: hiCmp === 0 ? ZERO : oppositeNode(hi.value),
				type: hi.type
			},
			{
				value: loIsNegInf ? infinity('positive') : oppositeNode(lo.value),
				type: loIsNegInf ? 'open' : lo.type
			}
		);
	}

	// Crosses zero: lo < 0 < hi → [0, max(|lo|, hi)]
	if (loIsNegInf || hiIsPosInf) {
		return buildInterval(
			{ value: ZERO, type: 'closed' },
			{ value: infinity('positive'), type: 'open' }
		);
	}

	// Compare |lo| vs hi numerically
	const absLoNum = Math.abs(endpointToNumber(lo.value));
	const hiNum = endpointToNumber(hi.value);

	if (isNaN(absLoNum) || isNaN(hiNum)) return undefined;

	let upperValue: MathNode;
	let upperType: EndpointType;
	if (absLoNum > hiNum) {
		upperValue = oppositeNode(lo.value);
		upperType = lo.type;
	} else if (hiNum > absLoNum) {
		upperValue = hi.value;
		upperType = hi.type;
	} else {
		// Equal absolute values
		upperValue = hi.value;
		upperType = lo.type === 'closed' || hi.type === 'closed' ? 'closed' : 'open';
	}

	return buildInterval({ value: ZERO, type: 'closed' }, { value: upperValue, type: upperType });
}

/**
 * Build a symbolic power MathNode: endpoint^n
 */
function powEndpoint(ep: MathNode, n: number): MathNode {
	return powerNode(ep, numberNode(String(n)));
}

/**
 * Compute symbolic bounds for base^n where n is a known positive integer.
 *
 * Uses monotonicity analysis with symbolic MathNode endpoints:
 * - Odd exponent (monotonically increasing): [a,b]^n = [a^n, b^n]
 * - Even exponent (x^n >= 0 always):
 *   - lo >= 0: [lo^n, hi^n]
 *   - hi <= 0: [hi^n, lo^n]
 *   - lo < 0 < hi: [0, max(|lo|^n, |hi|^n)]
 */
export function powerBounds(d: IntervalDomain, exponent: number): IntervalDomain | undefined {
	if (exponent <= 0) return undefined;

	const e = getEndpoints(d);
	if (!e) return undefined;

	const { lo, hi } = e;
	const loIsNegInf = isNegativeInfinityEndpoint(lo.value);
	const hiIsPosInf = isPositiveInfinityEndpoint(hi.value);
	const isEven = exponent % 2 === 0;

	if (isEven) {
		const loCmp = loIsNegInf ? -1 : compareNumericNodes(lo.value, ZERO);
		const hiCmp = hiIsPosInf ? 1 : compareNumericNodes(hi.value, ZERO);

		if (loCmp === undefined || hiCmp === undefined) return undefined;

		// Entirely non-negative: lo >= 0
		if (loCmp >= 0) {
			return buildInterval(
				{
					value: powEndpoint(lo.value, exponent),
					type: lo.type
				},
				{
					value: hiIsPosInf ? infinity('positive') : powEndpoint(hi.value, exponent),
					type: hiIsPosInf ? 'open' : hi.type
				}
			);
		}

		// Entirely non-positive: hi <= 0
		if (hiCmp <= 0) {
			return buildInterval(
				{
					value: powEndpoint(hi.value, exponent),
					type: hi.type
				},
				{
					value: loIsNegInf ? infinity('positive') : powEndpoint(lo.value, exponent),
					type: loIsNegInf ? 'open' : lo.type
				}
			);
		}

		// Crosses zero: [0, max(|lo|^n, |hi|^n)]
		if (loIsNegInf || hiIsPosInf) {
			return buildInterval(
				{ value: ZERO, type: 'closed' },
				{ value: infinity('positive'), type: 'open' }
			);
		}

		const loNum = Math.abs(endpointToNumber(lo.value));
		const hiNum = Math.abs(endpointToNumber(hi.value));

		if (isNaN(loNum) || isNaN(hiNum)) return undefined;

		let upperValue: MathNode;
		let upperType: EndpointType;
		if (loNum > hiNum) {
			upperValue = powEndpoint(lo.value, exponent);
			upperType = lo.type;
		} else if (hiNum > loNum) {
			upperValue = powEndpoint(hi.value, exponent);
			upperType = hi.type;
		} else {
			upperValue = powEndpoint(hi.value, exponent);
			upperType = lo.type === 'closed' || hi.type === 'closed' ? 'closed' : 'open';
		}

		return buildInterval({ value: ZERO, type: 'closed' }, { value: upperValue, type: upperType });
	}

	// Odd exponent: monotonically increasing, [lo^n, hi^n]
	return buildInterval(
		{
			value: loIsNegInf ? infinity('negative') : powEndpoint(lo.value, exponent),
			type: loIsNegInf ? 'open' : lo.type
		},
		{
			value: hiIsPosInf ? infinity('positive') : powEndpoint(hi.value, exponent),
			type: hiIsPosInf ? 'open' : hi.type
		}
	);
}
