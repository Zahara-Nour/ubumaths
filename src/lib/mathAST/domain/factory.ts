/**
 * Factory functions for creating Domain types
 *
 * Most factories are re-exported from the intervals module.
 * Domain-specific factories (conditions) are defined here.
 */

// =============================================================================
// Re-exports from intervals module
// =============================================================================

// Bound value constructors
export { fromNumber, bound } from '$lib/math/intervals/factory';

// Endpoint factories
export {
	endpoint,
	openEndpoint,
	closedEndpoint,
	negInfinityEndpoint,
	posInfinityEndpoint
} from '$lib/math/intervals/factory';

// Interval factories
export {
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThanInterval,
	lessThanOrEqualInterval,
	greaterThanInterval,
	greaterThanOrEqualInterval,
	realLine
} from '$lib/math/intervals/factory';

// Domain constants (with aliases for backward compatibility)
export { EMPTY_SET, UNIVERSAL_SET } from '$lib/math/intervals/factory';
export { EMPTY_SET as EMPTY_DOMAIN } from '$lib/math/intervals/factory';
export { UNIVERSAL_SET as UNIVERSAL_DOMAIN } from '$lib/math/intervals/factory';

// Domain factories (with aliases for backward compatibility)
export { emptySet, universalSet } from '$lib/math/intervals/factory';
export { emptySet as emptyDomain } from '$lib/math/intervals/factory';
export { universalSet as universalDomain } from '$lib/math/intervals/factory';

// =============================================================================
// Domain-specific factories (conditions)
// =============================================================================

import type {
	EndpointValue,
	ExcludedPoint,
	IntervalSet,
	ConditionDomain,
	ComparisonCondition,
	ComparisonOp,
	PeriodicExclusion,
	Interval
} from './types';
import type { MathNode } from '../types';
import {
	fromNumber as intervalsFromNumber,
	greaterThanInterval as intervalsGreaterThan,
	greaterThanOrEqualInterval as intervalsGreaterThanOrEqual,
	closedInterval as intervalsClosedInterval,
	realLine as intervalsRealLine
} from '$lib/math/intervals/factory';

/**
 * Creates a condition-based domain.
 */
export function conditionDomain(
	conditions: readonly ComparisonCondition[],
	combinator: 'and' | 'or' = 'and'
): ConditionDomain {
	return { kind: 'condition_domain', conditions, combinator };
}

/**
 * Creates a comparison condition.
 */
export function comparison(
	variable: string,
	op: ComparisonOp,
	bound: EndpointValue
): ComparisonCondition {
	return { kind: 'comparison', variable, op, bound };
}

// =============================================================================
// Periodic Exclusion Factories
// =============================================================================

/**
 * Creates a periodic exclusion domain.
 * Represents ℝ \ {basePoint + k·period : k ∈ ℤ}
 *
 * @param basePoint - The base exclusion point
 * @param period - The period between exclusions
 *
 * @example
 * // tan domain: ℝ \ {π/2 + kπ : k ∈ ℤ}
 * periodicExclusion(piOver2(), piNode())
 */
export function periodicExclusion(basePoint: MathNode, period: MathNode): PeriodicExclusion {
	return { kind: 'periodic_exclusion', basePoint, period };
}

/**
 * Creates the domain for tangent function: ℝ \ {π/2 + kπ : k ∈ ℤ}
 */
export function tanDomain(): PeriodicExclusion {
	return periodicExclusion(
		// π/2
		{
			type: 'division',
			numerator: { type: 'constant', constant: 'pi' },
			denominator: { type: 'number', value: '2' },
			displayStyle: 'inline'
		},
		// π
		{ type: 'constant', constant: 'pi' }
	);
}

/**
 * Creates the domain for cotangent function: ℝ \ {kπ : k ∈ ℤ}
 */
export function cotDomain(): PeriodicExclusion {
	return periodicExclusion(
		// 0
		{ type: 'number', value: '0' },
		// π
		{ type: 'constant', constant: 'pi' }
	);
}

/**
 * Creates the domain for secant function: ℝ \ {π/2 + kπ : k ∈ ℤ}
 * Same as tan domain.
 */
export function secDomain(): PeriodicExclusion {
	return tanDomain();
}

/**
 * Creates the domain for cosecant function: ℝ \ {kπ : k ∈ ℤ}
 * Same as cot domain.
 */
export function cscDomain(): PeriodicExclusion {
	return cotDomain();
}

// =============================================================================
// Domain-level Interval Factories (with excludedPoints support)
// =============================================================================

/**
 * Creates an interval set with optional excluded points.
 * This is the domain-level version that supports excludedPoints.
 */
export function intervalSet(
	intervals: readonly Interval[],
	excludedPoints: readonly ExcludedPoint[] = []
): IntervalSet {
	return { kind: 'interval_set', intervals, excludedPoints };
}

/** Alias for backward compatibility */
export const intervalDomain = intervalSet;

/**
 * Creates an excluded point.
 */
export function excludedPoint(value: EndpointValue): ExcludedPoint {
	return { kind: 'excluded_point', value };
}

// =============================================================================
// Common Domain Shortcuts (with excludedPoints support)
// =============================================================================

/** Domain for x > 0 (e.g., for ln) - ]0, +infinity[ */
export function positiveReals(): IntervalSet {
	return intervalSet([intervalsGreaterThan(intervalsFromNumber(0))]);
}

/** Domain for x >= 0 (e.g., for sqrt) - [0, +infinity[ */
export function nonNegativeReals(): IntervalSet {
	return intervalSet([intervalsGreaterThanOrEqual(intervalsFromNumber(0))]);
}

/** Domain for x != 0 (e.g., for 1/x) - R \ {0} */
export function nonZeroReals(): IntervalSet {
	return intervalSet([intervalsRealLine()], [excludedPoint(intervalsFromNumber(0))]);
}

/** Domain for -1 <= x <= 1 (e.g., for arcsin, arccos) - [-1, 1] */
export function unitInterval(): IntervalSet {
	return intervalSet([intervalsClosedInterval(intervalsFromNumber(-1), intervalsFromNumber(1))]);
}
