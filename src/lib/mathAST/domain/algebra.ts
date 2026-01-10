/**
 * Domain algebra operations: intersection, union, complement, etc.
 *
 * Delegates to intervals module for IntervalSet operations.
 * Handles ConditionDomain and PeriodicExclusion as domain-specific types.
 */

import type { Domain, EndpointValue, PeriodicExclusion, ConditionDomain } from './types';
import type { IntervalDomain } from '$lib/math/intervals/types';
import {
	isEmpty as intervalsIsEmpty,
	isUniversal as intervalsIsUniversal,
	containsValue as intervalsContainsValue,
	intersect as intervalsIntersect,
	union as intervalsUnion,
	complement as intervalsComplement,
	difference as intervalsDifference,
	excludePoints as intervalsExcludePoints
} from '$lib/math/intervals/algebra';
import {
	EMPTY_SET,
	UNIVERSAL_SET,
	fromNumber,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	intervalDomain,
	closedInterval
} from './factory';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

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
		const tolerance = 1e-10;

		return Math.abs(k - Math.round(k)) < tolerance;
	} catch {
		// Cannot evaluate symbolically - conservatively assume not excluded
		return false;
	}
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
			return intervalDomain([greaterThan(bound)]);
		case '>=':
			return intervalDomain([greaterThanOrEqual(bound)]);
		case '<':
			return intervalDomain([lessThan(bound)]);
		case '<=':
			return intervalDomain([lessThanOrEqual(bound)]);
		case '!=':
			// ℝ \ {bound} = ]-∞, bound[ ∪ ]bound, +∞[
			return intervalDomain([lessThan(bound), greaterThan(bound)]);
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
	return intervalsIsUniversal(d);
}

// =============================================================================
// containsValue
// =============================================================================

/**
 * Check if a domain contains a specific numeric value.
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
	return intervalsContainsValue(d, value);
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

	// Handle PeriodicExclusion cases - conservative fallback
	if (a.kind === 'periodic_exclusion' && b.kind === 'periodic_exclusion') {
		// Two periodic exclusions - return the first as approximation
		// (proper handling would need LCM of periods and combined base points)
		return a;
	}
	if (a.kind === 'periodic_exclusion') {
		// PeriodicExclusion ∩ IntervalSet - return the interval set
		// (the periodic exclusions are extra points to exclude from ℝ)
		return b;
	}
	if (b.kind === 'periodic_exclusion') {
		return a;
	}

	return intervalsIntersect(a, b);
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

	return intervalsUnion(a, b);
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

	return intervalsDifference(a, b);
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
export function excludePoints(d: Domain, values: EndpointValue[]): Domain {
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

	return intervalsExcludePoints(d, values);
}

/**
 * Add excluded points to a domain (numeric values).
 *
 * @param d - The domain to add exclusions to
 * @param values - Array of numeric values to exclude
 * @returns New domain with points excluded
 *
 * @deprecated Use excludePoints with EndpointValue[] instead
 */
export function excludeNumericPoints(d: Domain, values: number[]): Domain {
	return excludePoints(
		d,
		values.map((v) => fromNumber(v))
	);
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { EMPTY_SET, UNIVERSAL_SET } from './factory';
