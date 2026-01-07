/**
 * Factory functions for creating Domain types
 */

import type {
	Endpoint,
	EndpointValue,
	EndpointType,
	Interval,
	ExcludedPoint,
	EmptyDomain,
	UniversalDomain,
	IntervalDomain,
	ConditionDomain,
	ComparisonCondition,
	ComparisonOp
} from './types';

// =============================================================================
// Endpoint Factories
// =============================================================================

export function endpoint(value: EndpointValue, type: EndpointType): Endpoint {
	return { value, type };
}

export function openEndpoint(value: EndpointValue): Endpoint {
	return endpoint(value, 'open');
}

export function closedEndpoint(value: EndpointValue): Endpoint {
	return endpoint(value, 'closed');
}

export function negInfinity(): Endpoint {
	return openEndpoint('negative_infinity');
}

export function posInfinity(): Endpoint {
	return openEndpoint('positive_infinity');
}

// =============================================================================
// Interval Factories
// =============================================================================

export function interval(lower: Endpoint, upper: Endpoint): Interval {
	return { kind: 'interval', lower, upper };
}

/** Open interval (a, b) - French notation ]a, b[ */
export function openInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(openEndpoint(lower), openEndpoint(upper));
}

/** Closed interval [a, b] */
export function closedInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(closedEndpoint(lower), closedEndpoint(upper));
}

/** Half-open interval [a, b) - French notation [a, b[ */
export function leftClosedInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(closedEndpoint(lower), openEndpoint(upper));
}

/** Half-open interval (a, b] - French notation ]a, b] */
export function rightClosedInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(openEndpoint(lower), closedEndpoint(upper));
}

/** (-infinity, a) - French notation ]-infinity, a[ */
export function lessThan(bound: EndpointValue): Interval {
	return interval(negInfinity(), openEndpoint(bound));
}

/** (-infinity, a] - French notation ]-infinity, a] */
export function lessThanOrEqual(bound: EndpointValue): Interval {
	return interval(negInfinity(), closedEndpoint(bound));
}

/** (a, +infinity) - French notation ]a, +infinity[ */
export function greaterThan(bound: EndpointValue): Interval {
	return interval(openEndpoint(bound), posInfinity());
}

/** [a, +infinity) - French notation [a, +infinity[ */
export function greaterThanOrEqual(bound: EndpointValue): Interval {
	return interval(closedEndpoint(bound), posInfinity());
}

/** The entire real line (-infinity, +infinity) */
export function realLine(): Interval {
	return interval(negInfinity(), posInfinity());
}

// =============================================================================
// Domain Constants
// =============================================================================

export const EMPTY_DOMAIN: EmptyDomain = { kind: 'empty' };
export const UNIVERSAL_DOMAIN: UniversalDomain = { kind: 'universal' };

// =============================================================================
// Domain Factories
// =============================================================================

export function emptyDomain(): EmptyDomain {
	return EMPTY_DOMAIN;
}

export function universalDomain(): UniversalDomain {
	return UNIVERSAL_DOMAIN;
}

export function intervalDomain(
	intervals: readonly Interval[],
	excludedPoints: readonly ExcludedPoint[] = []
): IntervalDomain {
	return { kind: 'interval_domain', intervals, excludedPoints };
}

export function conditionDomain(
	conditions: readonly ComparisonCondition[],
	combinator: 'and' | 'or' = 'and'
): ConditionDomain {
	return { kind: 'condition_domain', conditions, combinator };
}

// =============================================================================
// Condition Factories
// =============================================================================

export function comparison(
	variable: string,
	op: ComparisonOp,
	bound: EndpointValue
): ComparisonCondition {
	return { kind: 'comparison', variable, op, bound };
}

export function excludedPoint(value: EndpointValue): ExcludedPoint {
	return { kind: 'excluded_point', value };
}

// =============================================================================
// Common Domain Shortcuts
// =============================================================================

/** Domain for x > 0 (e.g., for ln) */
export function positiveReals(): IntervalDomain {
	return intervalDomain([greaterThan(0)]);
}

/** Domain for x >= 0 (e.g., for sqrt) */
export function nonNegativeReals(): IntervalDomain {
	return intervalDomain([greaterThanOrEqual(0)]);
}

/** Domain for x != 0 (e.g., for 1/x) */
export function nonZeroReals(): IntervalDomain {
	return intervalDomain([realLine()], [excludedPoint(0)]);
}

/** Domain for -1 <= x <= 1 (e.g., for arcsin, arccos) */
export function unitInterval(): IntervalDomain {
	return intervalDomain([closedInterval(-1, 1)]);
}
