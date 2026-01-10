/**
 * Domain algebra operations: intersection, union, complement, etc.
 *
 * Delegates to intervals module for IntervalSet operations.
 * Handles ConditionDomain as a domain-specific type.
 */

import type { Domain, EndpointValue } from './types';
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
import { EMPTY_SET, fromNumber } from './factory';

// =============================================================================
// isEmpty
// =============================================================================

/**
 * Check if a domain is empty (contains no values).
 */
export function isEmpty(d: Domain): boolean {
	if (d.kind === 'condition_domain') {
		// Cannot easily determine for condition domains
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
		// Would need to evaluate conditions
		return false;
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
	// Handle ConditionDomain cases
	if (a.kind === 'condition_domain' || b.kind === 'condition_domain') {
		// Cannot intersect condition domains - return empty as safe fallback
		return EMPTY_SET;
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
	// Handle ConditionDomain cases
	if (a.kind === 'condition_domain' && b.kind === 'condition_domain') {
		// Cannot union condition domains
		return a;
	}
	if (a.kind === 'condition_domain') return a;
	if (b.kind === 'condition_domain') return b;

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
		// Cannot complement condition domains easily
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
	if (a.kind === 'condition_domain' || b.kind === 'condition_domain') {
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
		// Cannot add excluded points to condition domain easily
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
