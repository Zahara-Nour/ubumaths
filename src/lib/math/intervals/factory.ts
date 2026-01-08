/**
 * Factory functions for creating Interval types with algebraic bounds
 *
 * All bounds are represented as AlgebraicCoefficients for canonical form.
 * Helper functions convert numbers to exact rationals.
 */

import type { AlgebraicCoefficient, SimplifiedRadical } from '$lib/mathAST/normal/types';
import { algebraicFromRational } from '$lib/mathAST/normal/algebraic';
import { rational, fromInteger, ZERO, ONE, MINUS_ONE } from '$lib/mathAST/normal/rational';
import type {
	Endpoint,
	EndpointValue,
	EndpointType,
	Interval,
	ExcludedPoint,
	EmptySet,
	UniversalSet,
	IntervalSet,
	InfinityKind
} from './types';

// =============================================================================
// Bound Value Constructors
// =============================================================================

/**
 * Creates an algebraic endpoint value from a number.
 * The number is converted to an exact rational.
 *
 * @param n - A number (will be converted to rational, may lose precision for non-integers)
 * @returns An algebraic EndpointValue
 *
 * @example
 * fromNumber(0)    // Algebraic 0
 * fromNumber(1.5)  // Algebraic 3/2
 * fromNumber(-2)   // Algebraic -2
 */
export function fromNumber(n: number): EndpointValue {
	// Handle special cases
	if (n === 0) {
		return algebraic(algebraicFromRational(ZERO));
	}
	if (n === 1) {
		return algebraic(algebraicFromRational(ONE));
	}
	if (n === -1) {
		return algebraic(algebraicFromRational(MINUS_ONE));
	}

	// Convert to rational via string parsing to handle decimals
	if (Number.isInteger(n)) {
		return algebraic(algebraicFromRational(fromInteger(n)));
	}

	// For decimals, convert to fraction
	// This is an approximation - use rationalBound for exact values
	const str = n.toString();
	const decimalIndex = str.indexOf('.');
	if (decimalIndex === -1) {
		return algebraic(algebraicFromRational(fromInteger(n)));
	}

	const decimals = str.length - decimalIndex - 1;
	const denominator = BigInt(10 ** decimals);
	const numerator = BigInt(Math.round(n * Number(denominator)));
	return algebraic(algebraicFromRational(rational(numerator, denominator)));
}

/**
 * Creates an algebraic endpoint value from a rational (exact).
 *
 * @param n - Numerator
 * @param d - Denominator (default 1)
 * @returns An algebraic EndpointValue with exact rational value
 *
 * @example
 * rationalBound(3n, 2n)  // Exact 3/2
 * rationalBound(5n)      // Exact 5
 */
export function rationalBound(n: bigint, d: bigint = 1n): EndpointValue {
	return algebraic(algebraicFromRational(rational(n, d)));
}

/**
 * Creates an algebraic endpoint value from a square root (exact).
 *
 * @param radicand - The value under the radical (must be positive)
 * @param coefN - Coefficient numerator (default 1)
 * @param coefD - Coefficient denominator (default 1)
 * @returns An algebraic EndpointValue for coef * sqrt(radicand)
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
		return algebraic(algebraicFromRational(rational(coefN, coefD)));
	}

	const rad: SimplifiedRadical = { radicand, index: 2n };
	const coef: AlgebraicCoefficient = {
		terms: [{ rational: { n: coefN, d: coefD }, radicals: [rad] }]
	};
	return algebraic(coef);
}

/**
 * Creates an infinity endpoint value.
 *
 * @param inf - 'positive_infinity' or 'negative_infinity'
 * @returns An infinity EndpointValue
 */
export function infinityBound(inf: InfinityKind): EndpointValue {
	return { kind: 'infinity', value: inf };
}

/**
 * Creates an algebraic endpoint value from an AlgebraicCoefficient.
 *
 * @param coef - An AlgebraicCoefficient
 * @returns An algebraic EndpointValue
 */
export function algebraic(coef: AlgebraicCoefficient): EndpointValue {
	return { kind: 'algebraic', value: coef };
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
	return openEndpoint(infinityBound('negative_infinity'));
}

/**
 * Creates positive infinity endpoint (always open).
 */
export function posInfinity(): Endpoint {
	return openEndpoint(infinityBound('positive_infinity'));
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
