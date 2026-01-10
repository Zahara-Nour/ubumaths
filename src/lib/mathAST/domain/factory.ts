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

import type {
	EndpointValue,
	ConditionDomain,
	ComparisonCondition,
	ComparisonOp,
	PeriodicExclusion
} from './types';
import type { MathNode } from '../types';

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
			numerator: { type: 'greek', letter: 'pi' },
			denominator: { type: 'number', value: '2' },
			displayStyle: 'inline'
		},
		// π
		{ type: 'greek', letter: 'pi' }
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
		{ type: 'greek', letter: 'pi' }
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
