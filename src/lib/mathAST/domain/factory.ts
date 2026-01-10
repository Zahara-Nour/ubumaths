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
export {
	fromNumber,
	rationalBound,
	radicalBound,
	positiveInfinity,
	negativeInfinity,
	pi,
	e,
	sqrt2,
	sqrt3
} from '$lib/math/intervals/factory';

// Endpoint factories
export {
	endpoint,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity
} from '$lib/math/intervals/factory';

// Interval factories
export {
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual,
	realLine
} from '$lib/math/intervals/factory';

// Domain constants (with aliases for backward compatibility)
export { EMPTY_SET, UNIVERSAL_SET } from '$lib/math/intervals/factory';
export { EMPTY_SET as EMPTY_DOMAIN } from '$lib/math/intervals/factory';
export { UNIVERSAL_SET as UNIVERSAL_DOMAIN } from '$lib/math/intervals/factory';

// Domain factories (with aliases for backward compatibility)
export { emptySet, universalSet, excludedPoint } from '$lib/math/intervals/factory';
export { emptySet as emptyDomain } from '$lib/math/intervals/factory';
export { universalSet as universalDomain } from '$lib/math/intervals/factory';
export { intervalSet as intervalDomain } from '$lib/math/intervals/factory';

// Common domain shortcuts
export {
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval
} from '$lib/math/intervals/factory';

// =============================================================================
// Domain-specific factories (conditions)
// =============================================================================

import type { EndpointValue, ConditionDomain, ComparisonCondition, ComparisonOp } from './types';

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
