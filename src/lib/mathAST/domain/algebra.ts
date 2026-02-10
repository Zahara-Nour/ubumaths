/**
 * Domain algebra operations: intersection, union, complement, etc.
 *
 * Delegates to intervals module for IntervalSet operations.
 * Handles ConditionDomain and PeriodicExclusion as domain-specific types.
 */

import type { MathNode } from '../types';
import type {
	Domain,
	ExcludedPoint,
	Interval,
	IntervalSet,
	PeriodicExclusion,
	ConditionDomain
} from './types';
import { ZERO_TOLERANCE } from '../common';
import { number, subtract, divide } from '$lib/mathAST/factory';
import type { IntervalDomain } from '$lib/math/intervals/types';
import {
	isEmptyInterval as intervalsIsEmpty,
	isUniversalInterval as intervalsIsUniversal,
	intersect as intervalsIntersect,
	union as intervalsUnion,
	complement as intervalsComplement,
	difference as intervalsDifference
} from '$lib/math/intervals/algebra';
import { realLine } from '$lib/math/intervals/factory';
import {
	EMPTY_SET,
	UNIVERSAL_SET,
	greaterThanInterval,
	greaterThanOrEqualInterval,
	lessThanInterval,
	lessThanOrEqualInterval,
	intervalDomain,
	intervalSet,
	excludedPoint as createExcludedPoint,
	closedInterval
} from './factory';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { compareNumericNodes } from '../eval/compare-numeric';

// =============================================================================
// PeriodicExclusion Helpers
// =============================================================================

/**
 * Check if a value is excluded by a periodic exclusion domain.
 * Returns true if value = basePoint + k*period for some integer k.
 */
function isExcludedByPeriodic(pe: PeriodicExclusion, value: number): boolean {
	// Try to evaluate basePoint and period to numbers
	try {
		const base = evaluateNodeToApproximatedNumber(pe.basePoint);
		const period = evaluateNodeToApproximatedNumber(pe.period);

		if (!isFinite(base) || !isFinite(period) || period === 0) {
			return false;
		}

		// Check if (value - base) is an integer multiple of period
		const k = (value - base) / period;
		const tolerance = ZERO_TOLERANCE;

		return Math.abs(k - Math.round(k)) < tolerance;
	} catch {
		// Cannot evaluate symbolically - conservatively assume not excluded
		return false;
	}
}

// =============================================================================
// ExcludedPoint Helpers
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
			// For symbolic values that can't be converted to numbers,
			// we keep all of them (may result in duplicates for complex expressions)
			result.push(p);
		}
	}

	return result;
}

/**
 * Extract excludedPoints from an IntervalSet-compatible domain.
 * Returns empty array for non-IntervalSet domains.
 */
function getExcludedPoints(d: Domain): readonly ExcludedPoint[] {
	if (d.kind === 'interval_set') return d.excludedPoints ?? [];
	return [];
}

/**
 * Wrap an IntervalDomain result from intervals algebra with excluded points,
 * producing a domain-level result.
 */
function wrapWithExcludedPoints(
	result: IntervalDomain,
	excludedPoints: readonly ExcludedPoint[]
): Domain {
	if (result.kind === 'empty') return EMPTY_SET;
	if (result.kind === 'universal') {
		if (excludedPoints.length === 0) return UNIVERSAL_SET;
		return intervalSet([realLine()], excludedPoints);
	}
	if (excludedPoints.length === 0) {
		return intervalSet(result.intervals);
	}
	return intervalSet(result.intervals, excludedPoints);
}

// =============================================================================
// ConditionDomain Conversion Helpers
// =============================================================================

/**
 * Try to convert a ConditionDomain to an IntervalSet.
 * Handles simple cases like:
 * - x > 0 → ]0, +∞[
 * - x >= 0 → [0, +∞[
 * - x < 5 → ]-∞, 5[
 * - x <= 5 → ]-∞, 5]
 * - x != 5 → ℝ \ {5}
 * - x > 0 AND x < 10 → ]0, 10[
 *
 * Returns null if conversion is not possible.
 */
export function tryConvertConditionToInterval(cd: ConditionDomain): IntervalDomain | null {
	const conditions = cd.conditions;

	if (conditions.length === 0) {
		return UNIVERSAL_SET;
	}

	// Single condition
	if (conditions.length === 1) {
		return convertSingleCondition(conditions[0]);
	}

	// Multiple conditions with AND combinator
	if (cd.combinator === 'and') {
		return convertAndConditions(conditions);
	}

	// Multiple conditions with OR combinator
	if (cd.combinator === 'or') {
		return convertOrConditions(conditions);
	}

	return null;
}

/**
 * Convert a single comparison condition to an IntervalSet.
 */
function convertSingleCondition(
	condition: ConditionDomain['conditions'][number]
): IntervalDomain | null {
	if (condition.kind !== 'comparison') {
		return null;
	}

	const bound = condition.bound;

	switch (condition.op) {
		case '>':
			return intervalDomain([greaterThanInterval(bound)]);
		case '>=':
			return intervalDomain([greaterThanOrEqualInterval(bound)]);
		case '<':
			return intervalDomain([lessThanInterval(bound)]);
		case '<=':
			return intervalDomain([lessThanOrEqualInterval(bound)]);
		case '!=':
			// ℝ \ {bound} = ]-∞, bound[ ∪ ]bound, +∞[
			return intervalDomain([lessThanInterval(bound), greaterThanInterval(bound)]);
		case '=':
			// Single point as closed interval [bound, bound]
			return intervalDomain([closedInterval(bound, bound)]);
		default:
			return null;
	}
}

/**
 * Convert AND-combined conditions to an IntervalSet.
 * Handles common patterns like: x > a AND x < b → ]a, b[
 */
function convertAndConditions(
	conditions: readonly ConditionDomain['conditions'][number][]
): IntervalDomain | null {
	// Convert each condition and intersect
	let result: Domain = UNIVERSAL_SET;

	for (const cond of conditions) {
		const interval = convertSingleCondition(cond);
		if (!interval) {
			return null; // Cannot convert this condition
		}
		result = intervalsIntersect(result, interval);
	}

	// Check if result is an IntervalSet
	if (result.kind === 'interval_set') {
		return result;
	}
	if (result.kind === 'empty') {
		return EMPTY_SET;
	}
	if (result.kind === 'universal') {
		return UNIVERSAL_SET;
	}

	return null;
}

/**
 * Convert OR-combined conditions to an IntervalSet.
 * Handles patterns like: x < a OR x > b → ]-∞, a[ ∪ ]b, +∞[
 */
function convertOrConditions(
	conditions: readonly ConditionDomain['conditions'][number][]
): IntervalDomain | null {
	// Convert each condition and union
	let result: Domain = EMPTY_SET;

	for (const cond of conditions) {
		const interval = convertSingleCondition(cond);
		if (!interval) {
			return null; // Cannot convert this condition
		}
		result = intervalsUnion(result, interval);
	}

	// Check if result is an IntervalSet
	if (result.kind === 'interval_set') {
		return result;
	}
	if (result.kind === 'empty') {
		return EMPTY_SET;
	}
	if (result.kind === 'universal') {
		return UNIVERSAL_SET;
	}

	return null;
}

// =============================================================================
// isEmpty
// =============================================================================

/**
 * Check if a domain is empty (contains no values).
 */
export function isEmpty(d: Domain): boolean {
	if (d.kind === 'condition_domain') {
		// Try to convert to intervals first
		const converted = tryConvertConditionToInterval(d);
		if (converted) {
			return isEmpty(converted);
		}
		// Cannot easily determine for condition domains
		return false;
	}
	if (d.kind === 'periodic_exclusion') {
		// ℝ minus countably infinite points is never empty
		return false;
	}
	return intervalsIsEmpty(d);
}

// =============================================================================
// isUniversal
// =============================================================================

/**
 * Check if a domain is the universal set (all real numbers).
 */
export function isUniversal(d: Domain): boolean {
	if (d.kind === 'condition_domain') {
		// Try to convert to intervals first
		const converted = tryConvertConditionToInterval(d);
		if (converted) {
			return isUniversal(converted);
		}
		return false;
	}
	if (d.kind === 'periodic_exclusion') {
		// Has exclusions, so not universal
		return false;
	}
	// Check for excluded points at domain level
	if (d.kind === 'interval_set' && (d.excludedPoints?.length ?? 0) > 0) {
		return false;
	}
	return intervalsIsUniversal(d);
}

// =============================================================================
// containsValue
// =============================================================================

/**
 * Check if a domain contains a specific numeric value.
 *
 * Uses direct numeric comparison against interval endpoints rather than
 * MathNode-based symbolic comparison, which avoids issues with very small
 * numbers in scientific notation (e.g., 1e-10).
 */
export function containsValue(d: Domain, value: number): boolean {
	if (d.kind === 'condition_domain') {
		// Try to convert to intervals first
		const converted = tryConvertConditionToInterval(d);
		if (converted) {
			return containsValue(converted, value);
		}
		// Would need to evaluate conditions - conservative false
		return false;
	}
	if (d.kind === 'periodic_exclusion') {
		// Value is in domain if it's NOT excluded
		return !isExcludedByPeriodic(d, value);
	}
	return numericContainsValue(d, value);
}

/**
 * Check if an IntervalSet-compatible domain contains a numeric value
 * using direct numeric evaluation of endpoints.
 */
function numericContainsValue(d: Domain, value: number): boolean {
	if (d.kind === 'empty') return false;
	if (d.kind === 'universal') return true;
	if (d.kind !== 'interval_set') return false;

	// Check excluded points (may be absent for intervals-level IntervalSets)
	for (const ep of d.excludedPoints ?? []) {
		const epVal = endpointToNumber(ep.value);
		if (!isNaN(epVal) && Math.abs(epVal - value) < ZERO_TOLERANCE) {
			return false;
		}
	}

	// Check if value is in any interval
	for (const interval of d.intervals) {
		if (numericInInterval(value, interval)) return true;
	}
	return false;
}

/**
 * Check if a numeric value is within an interval by evaluating endpoints numerically.
 * Uses strict comparison (no tolerance) - the caller is responsible for probing
 * with appropriate offsets from the boundary.
 */
function numericInInterval(value: number, interval: import('./types').Interval): boolean {
	const lower = endpointToNumber(interval.lower.value);
	const upper = endpointToNumber(interval.upper.value);

	// Check lower bound (isFinite excludes Infinity/-Infinity/NaN)
	if (isFinite(lower)) {
		if (interval.lower.type === 'closed') {
			if (value < lower) return false;
		} else {
			if (value <= lower) return false;
		}
	}

	// Check upper bound
	if (isFinite(upper)) {
		if (interval.upper.type === 'closed') {
			if (value > upper) return false;
		} else {
			if (value >= upper) return false;
		}
	}

	return true;
}

// =============================================================================
// containsNode (symbolic)
// =============================================================================

/**
 * Check if a MathNode value is contained in an interval.
 * Uses symbolic comparison via compareNumericNodes for exact results.
 *
 * Local copy of the private function from intervals/algebra.ts.
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
 * Check if an IntervalSet domain symbolically contains a MathNode value.
 * Uses compareNumericNodes for exact symbolic comparison.
 */
function symbolicContainsNode(d: IntervalSet, value: MathNode): boolean {
	// Check excluded points via compareNumericNodes
	for (const ep of d.excludedPoints ?? []) {
		const cmp = compareNumericNodes(value, ep.value);
		if (cmp === 0) return false;
	}
	// Check if value is in any interval
	for (const interval of d.intervals) {
		if (nodeInInterval(value, interval)) return true;
	}
	return false;
}

/**
 * Check if a value is excluded by a periodic exclusion domain (symbolic version).
 * Returns true if value = basePoint + k*period for some integer k.
 *
 * Uses two approaches for robustness:
 * 1. Pure numeric: evaluate all three to numbers and compute ratio directly
 *    (avoids precision loss from symbolic string representation)
 * 2. Symbolic: compute (value - basePoint) / period as MathNode then evaluate
 */
function isExcludedByPeriodicNode(pe: PeriodicExclusion, value: MathNode): boolean {
	// Try pure numeric approach first (more precise for literal number nodes)
	const valNum = evaluateNodeToApproximatedNumber(value);
	const baseNum = evaluateNodeToApproximatedNumber(pe.basePoint);
	const periodNum = evaluateNodeToApproximatedNumber(pe.period);

	if (isFinite(valNum) && isFinite(baseNum) && isFinite(periodNum) && periodNum !== 0) {
		const k = (valNum - baseNum) / periodNum;
		if (Math.abs(k - Math.round(k)) < ZERO_TOLERANCE) return true;
	}

	// Fallback: symbolic approach (handles cases where nodes share structure)
	const diff = subtract(value, pe.basePoint);
	const ratio = divide(diff, pe.period);
	const ratioVal = evaluateNodeToApproximatedNumber(ratio);
	if (!isFinite(ratioVal)) return false;
	return Math.abs(ratioVal - Math.round(ratioVal)) < ZERO_TOLERANCE;
}

/**
 * Check if a domain contains a specific MathNode value using symbolic comparison.
 *
 * Uses compareNumericNodes for exact symbolic comparison against interval
 * endpoints and excluded points. This avoids precision loss from converting
 * MathNode to number before testing membership.
 *
 * Note: Returns false if symbolic comparison is inconclusive (compareNumericNodes
 * returns undefined). Callers needing fewer false negatives should fall back to
 * numeric containsValue when containsNode returns false.
 *
 * @param d - The domain to check
 * @param value - A MathNode representing the value to check
 * @returns true if value is in the domain, false if not or comparison inconclusive
 */
export function containsNode(d: Domain, value: MathNode): boolean {
	if (d.kind === 'empty') return false;
	if (d.kind === 'universal') return true;
	if (d.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(d);
		if (converted) return containsNode(converted, value);
		return false; // conservative
	}
	if (d.kind === 'periodic_exclusion') {
		return !isExcludedByPeriodicNode(d, value);
	}
	// IntervalSet
	return symbolicContainsNode(d, value);
}

// =============================================================================
// intersect
// =============================================================================

/**
 * Compute the intersection of two domains.
 */
export function intersect(a: Domain, b: Domain): Domain {
	// Handle ConditionDomain cases - try to convert to intervals first
	if (a.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(a);
		if (converted) {
			return intersect(converted, b);
		}
		// Cannot convert - return safe fallback
		return EMPTY_SET;
	}
	if (b.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(b);
		if (converted) {
			return intersect(a, converted);
		}
		return EMPTY_SET;
	}

	// Handle PeriodicExclusion cases
	if (a.kind === 'periodic_exclusion' && b.kind === 'periodic_exclusion') {
		// Two periodic exclusions - return the first as approximation
		// (proper handling would need LCM of periods and combined base points)
		return a;
	}
	if (a.kind === 'periodic_exclusion') {
		// PeriodicExclusion ∩ IntervalSet
		// If b is universal (ℝ), the result is the PeriodicExclusion
		// Otherwise, return the interval set (more restrictive)
		if (intervalsIsUniversal(b)) {
			return a;
		}
		return b;
	}
	if (b.kind === 'periodic_exclusion') {
		// Same logic: if a is universal, return the PeriodicExclusion
		if (intervalsIsUniversal(a)) {
			return b;
		}
		return a;
	}

	// Extract excludedPoints before delegating to intervals
	const aExcluded = getExcludedPoints(a);
	const bExcluded = getExcludedPoints(b);
	const allExcluded = deduplicateExcludedPoints([...aExcluded, ...bExcluded]);

	const result = intervalsIntersect(a, b);
	return wrapWithExcludedPoints(result, allExcluded);
}

// =============================================================================
// union
// =============================================================================

/**
 * Compute the union of two domains.
 */
export function union(a: Domain, b: Domain): Domain {
	// Handle ConditionDomain cases - try to convert to intervals first
	if (a.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(a);
		if (converted) {
			return union(converted, b);
		}
		// Cannot convert - return the condition domain as approximation
		return a;
	}
	if (b.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(b);
		if (converted) {
			return union(a, converted);
		}
		return b;
	}

	// Handle PeriodicExclusion cases - conservative fallback
	if (a.kind === 'periodic_exclusion' || b.kind === 'periodic_exclusion') {
		// Union with periodic exclusion - return the periodic one
		// (since it's almost all of ℝ, the union is approximately the same)
		if (a.kind === 'periodic_exclusion') return a;
		return b;
	}

	// Extract excludedPoints before delegating to intervals
	const aExcluded = getExcludedPoints(a);
	const bExcluded = getExcludedPoints(b);

	const result = intervalsUnion(a, b);

	// For union, a point must be excluded in BOTH to remain excluded
	if (aExcluded.length > 0 || bExcluded.length > 0) {
		const aExcludedValues = new Set(aExcluded.map((ep) => endpointToNumber(ep.value)));
		const commonExcluded = bExcluded.filter((ep) =>
			aExcludedValues.has(endpointToNumber(ep.value))
		);
		return wrapWithExcludedPoints(result, commonExcluded);
	}

	return wrapWithExcludedPoints(result, []);
}

// =============================================================================
// complement
// =============================================================================

/**
 * Compute the complement of a domain.
 */
export function complement(d: Domain): Domain {
	if (d.kind === 'condition_domain') {
		// Try to convert to intervals first
		const converted = tryConvertConditionToInterval(d);
		if (converted) {
			return complement(converted);
		}
		// Cannot complement condition domains easily
		return EMPTY_SET;
	}
	if (d.kind === 'periodic_exclusion') {
		// Complement of ℝ \ {periodic points} is the set of periodic points
		// This is a discrete infinite set, not representable as intervals
		// Return empty as safe fallback
		return EMPTY_SET;
	}

	// Note: excluded points in d become "included" in the complement
	// (they are no longer excluded), so we don't carry them over
	return intervalsComplement(d);
}

// =============================================================================
// difference
// =============================================================================

/**
 * Compute the difference of two domains: a \ b = a ∩ complement(b)
 */
export function difference(a: Domain, b: Domain): Domain {
	// Handle ConditionDomain cases - try to convert to intervals first
	if (a.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(a);
		if (converted) {
			return difference(converted, b);
		}
		return EMPTY_SET;
	}
	if (b.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(b);
		if (converted) {
			return difference(a, converted);
		}
		return EMPTY_SET;
	}
	if (a.kind === 'periodic_exclusion' || b.kind === 'periodic_exclusion') {
		// Conservative fallback for periodic exclusions
		if (a.kind === 'periodic_exclusion') return a;
		return EMPTY_SET;
	}

	// difference = intersect(a, complement(b))
	// Excluded points from a survive, excluded points from b don't matter
	const aExcluded = getExcludedPoints(a);
	const result = intervalsDifference(a, b);
	return wrapWithExcludedPoints(result, aExcluded);
}

// =============================================================================
// excludePoints
// =============================================================================

/**
 * Add excluded points to a domain.
 *
 * @param d - The domain to add exclusions to
 * @param values - Array of endpoint values to exclude
 * @returns New domain with points excluded
 */
export function excludePoints(d: Domain, values: MathNode[]): Domain {
	if (d.kind === 'condition_domain') {
		// Try to convert to intervals first
		const converted = tryConvertConditionToInterval(d);
		if (converted) {
			return excludePoints(converted, values);
		}
		// Cannot add excluded points to condition domain easily
		return d;
	}
	if (d.kind === 'periodic_exclusion') {
		// Already has infinite exclusions, adding finite more doesn't change structure
		return d;
	}
	if (d.kind === 'empty') return EMPTY_SET;

	const newExcluded = values.map((v) => createExcludedPoint(v));

	if (d.kind === 'universal') {
		return intervalSet([realLine()], newExcluded);
	}

	if (d.kind === 'interval_set') {
		const combined = [...(d.excludedPoints ?? []), ...newExcluded];
		return intervalSet([...d.intervals], deduplicateExcludedPoints(combined));
	}

	return d;
}

/**
 * Add excluded points to a domain (numeric values).
 *
 * @param d - The domain to add exclusions to
 * @param values - Array of numeric values to exclude
 * @returns New domain with points excluded
 *
 * @deprecated Use excludePoints with MathNode[] instead
 */
export function excludeNumericPoints(d: Domain, values: number[]): Domain {
	return excludePoints(
		d,
		values.map((v) => number(v))
	);
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { EMPTY_SET, UNIVERSAL_SET } from './factory';
