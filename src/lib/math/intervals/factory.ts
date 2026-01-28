/**
 * Factory functions for creating Interval types with MathNode bounds
 *
 * All bounds are MathNodes from mathAST, supporting symbolic expressions.
 */

import {
	number,
	infinity,
	func,
	fraction,
	implicitMultiply,
	piConstant,
	euler
} from '$lib/mathAST/factory';
import type {
	Endpoint,
	EndpointValue,
	EndpointType,
	Interval,
	ExcludedPoint,
	EmptySet,
	UniversalSet,
	IntervalSet
} from './types';

// =============================================================================
// Bound Value Constructors
// =============================================================================

/**
 * Creates an endpoint value from a number.
 *
 * @param n - A number
 * @returns A NumberNode EndpointValue
 *
 * @example
 * fromNumber(0)    // NumberNode '0'
 * fromNumber(1.5)  // NumberNode '1.5'
 * fromNumber(-2)   // NumberNode '-2'
 */
export function fromNumber(n: number): EndpointValue {
	return number(n.toString());
}

/**
 * Creates an endpoint value from a rational (exact fraction).
 *
 * @param n - Numerator
 * @param d - Denominator (default 1)
 * @returns A MathNode representing n/d (or just n if d=1)
 *
 * @example
 * rationalBound(3n, 2n)  // 3/2
 * rationalBound(5n)      // 5
 */
export function rationalBound(n: bigint, d: bigint = 1n): EndpointValue {
	if (d === 1n) {
		return number(n.toString());
	}
	return fraction(number(n.toString()), number(d.toString()));
}

/**
 * Creates an endpoint value from a square root (exact).
 *
 * @param radicand - The value under the radical (must be positive)
 * @param coefN - Coefficient numerator (default 1)
 * @param coefD - Coefficient denominator (default 1)
 * @returns A MathNode for (coefN/coefD) * sqrt(radicand)
 *
 * @example
 * radicalBound(2n)         // sqrt(2)
 * radicalBound(3n, 2n)     // 2*sqrt(3)
 * radicalBound(2n, 1n, 2n) // (1/2)*sqrt(2)
 */
export function radicalBound(
	radicand: bigint,
	coefN: bigint = 1n,
	coefD: bigint = 1n
): EndpointValue {
	if (radicand === 1n) {
		// sqrt(1) = 1, so just return the coefficient
		return rationalBound(coefN, coefD);
	}

	const sqrtNode = func('sqrt', [number(radicand.toString())]);

	if (coefN === 1n && coefD === 1n) {
		return sqrtNode;
	}

	const coef =
		coefD === 1n
			? number(coefN.toString())
			: fraction(number(coefN.toString()), number(coefD.toString()));

	return implicitMultiply(coef, sqrtNode);
}

/**
 * Creates a positive infinity endpoint value.
 */
export function positiveInfinity(): EndpointValue {
	return infinity('positive');
}

/**
 * Creates a negative infinity endpoint value.
 */
export function negativeInfinity(): EndpointValue {
	return infinity('negative');
}

/**
 * Creates a pi endpoint value.
 */
export function pi(): EndpointValue {
	return piConstant();
}

/**
 * Creates an 'e' (Euler's number) endpoint value.
 */
export function e(): EndpointValue {
	return euler();
}

/**
 * Creates a sqrt(2) endpoint value.
 */
export function sqrt2(): EndpointValue {
	return func('sqrt', [number('2')]);
}

/**
 * Creates a sqrt(3) endpoint value.
 */
export function sqrt3(): EndpointValue {
	return func('sqrt', [number('3')]);
}

// =============================================================================
// Endpoint Factories
// =============================================================================

/**
 * Creates an endpoint with given value and type.
 */
export function endpoint(value: EndpointValue, type: EndpointType): Endpoint {
	return { value, type };
}

/**
 * Creates an open endpoint (excluded from interval).
 */
export function openEndpoint(value: EndpointValue): Endpoint {
	return endpoint(value, 'open');
}

/**
 * Creates a closed endpoint (included in interval).
 */
export function closedEndpoint(value: EndpointValue): Endpoint {
	return endpoint(value, 'closed');
}

/**
 * Creates negative infinity endpoint (always open).
 */
export function negInfinity(): Endpoint {
	return openEndpoint(negativeInfinity());
}

/**
 * Creates positive infinity endpoint (always open).
 */
export function posInfinity(): Endpoint {
	return openEndpoint(positiveInfinity());
}

// =============================================================================
// Interval Factories
// =============================================================================

/**
 * Creates an interval from two endpoints.
 */
export function interval(lower: Endpoint, upper: Endpoint): Interval {
	return { kind: 'interval', lower, upper };
}

/**
 * Creates an open interval (a, b) - French notation ]a, b[
 */
export function openInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(openEndpoint(lower), openEndpoint(upper));
}

/**
 * Creates a closed interval [a, b]
 */
export function closedInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(closedEndpoint(lower), closedEndpoint(upper));
}

/**
 * Creates a half-open interval [a, b) - French notation [a, b[
 */
export function leftClosedInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(closedEndpoint(lower), openEndpoint(upper));
}

/**
 * Creates a half-open interval (a, b] - French notation ]a, b]
 */
export function rightClosedInterval(lower: EndpointValue, upper: EndpointValue): Interval {
	return interval(openEndpoint(lower), closedEndpoint(upper));
}

/**
 * Creates (-infinity, a) - French notation ]-infinity, a[
 */
export function lessThan(bound: EndpointValue): Interval {
	return interval(negInfinity(), openEndpoint(bound));
}

/**
 * Creates (-infinity, a] - French notation ]-infinity, a]
 */
export function lessThanOrEqual(bound: EndpointValue): Interval {
	return interval(negInfinity(), closedEndpoint(bound));
}

/**
 * Creates (a, +infinity) - French notation ]a, +infinity[
 */
export function greaterThan(bound: EndpointValue): Interval {
	return interval(openEndpoint(bound), posInfinity());
}

/**
 * Creates [a, +infinity) - French notation [a, +infinity[
 */
export function greaterThanOrEqual(bound: EndpointValue): Interval {
	return interval(closedEndpoint(bound), posInfinity());
}

/**
 * Creates the entire real line (-infinity, +infinity)
 */
export function realLine(): Interval {
	return interval(negInfinity(), posInfinity());
}

// =============================================================================
// Domain Constants
// =============================================================================

/** The empty set (no values) */
export const EMPTY_SET: EmptySet = { kind: 'empty' };

/** The universal set (all real numbers) */
export const UNIVERSAL_SET: UniversalSet = { kind: 'universal' };

// =============================================================================
// Domain Factories
// =============================================================================

/**
 * Creates the empty set.
 */
export function emptySet(): EmptySet {
	return EMPTY_SET;
}

/**
 * Creates the universal set (all reals).
 */
export function universalSet(): UniversalSet {
	return UNIVERSAL_SET;
}

/**
 * Creates an interval set from intervals and optional excluded points.
 */
export function intervalSet(
	intervals: readonly Interval[],
	excludedPoints: readonly ExcludedPoint[] = []
): IntervalSet {
	return { kind: 'interval_set', intervals, excludedPoints };
}

/**
 * Creates an excluded point.
 */
export function excludedPoint(value: EndpointValue): ExcludedPoint {
	return { kind: 'excluded_point', value };
}

// =============================================================================
// Common Domain Shortcuts
// =============================================================================

/** Domain for x > 0 (e.g., for ln) - ]0, +infinity[ */
export function positiveReals(): IntervalSet {
	return intervalSet([greaterThan(fromNumber(0))]);
}

/** Domain for x >= 0 (e.g., for sqrt) - [0, +infinity[ */
export function nonNegativeReals(): IntervalSet {
	return intervalSet([greaterThanOrEqual(fromNumber(0))]);
}

/** Domain for x != 0 (e.g., for 1/x) - R \ {0} */
export function nonZeroReals(): IntervalSet {
	return intervalSet([realLine()], [excludedPoint(fromNumber(0))]);
}

/** Domain for -1 <= x <= 1 (e.g., for arcsin, arccos) - [-1, 1] */
export function unitInterval(): IntervalSet {
	return intervalSet([closedInterval(fromNumber(-1), fromNumber(1))]);
}
