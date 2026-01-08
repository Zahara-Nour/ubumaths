/**
 * Interval Types for Mathematical Domain Operations
 *
 * Types for representing intervals with exact algebraic bounds.
 * Supports rationals (3/2) and radicals (sqrt(2)) for precise domain computation.
 */

import type { AlgebraicCoefficient } from '$lib/mathAST/normal/types';

// =============================================================================
// Infinity Types
// =============================================================================

/**
 * Special value representing positive or negative infinity
 */
export type Infinity = 'positive_infinity' | 'negative_infinity';

// =============================================================================
// Endpoint Types
// =============================================================================

/**
 * An endpoint value can be:
 * - An algebraic coefficient (for exact bounds like 3/2, sqrt(2))
 * - Infinity
 *
 * Decision: No numeric (number) type - all values are algebraic for canonical representation.
 */
export type EndpointValue =
	| { readonly kind: 'algebraic'; readonly value: AlgebraicCoefficient }
	| { readonly kind: 'infinity'; readonly value: Infinity };

/**
 * Type of endpoint for an interval bound
 * - 'closed': includes the endpoint (<=, >=) - displayed as [ or ]
 * - 'open': excludes the endpoint (<, >) - displayed as ] or [
 */
export type EndpointType = 'open' | 'closed';

/**
 * Represents one end of an interval
 */
export interface Endpoint {
	readonly value: EndpointValue;
	readonly type: EndpointType;
}

// =============================================================================
// Interval Types
// =============================================================================

/**
 * Represents a single continuous interval on the real line.
 *
 * French notation conventions:
 * - ]a, b[ = open interval (a, b) in English notation
 * - [a, b] = closed interval
 * - ]a, b] or [a, b[ = half-open intervals
 *
 * @example
 * // ]0, +infinity[ represents x > 0
 * { kind: 'interval',
 *   lower: { value: { kind: 'algebraic', value: zero }, type: 'open' },
 *   upper: { value: { kind: 'infinity', value: 'positive_infinity' }, type: 'open' } }
 *
 * // [-1, 1] represents -1 <= x <= 1
 * { kind: 'interval',
 *   lower: { value: { kind: 'algebraic', value: minusOne }, type: 'closed' },
 *   upper: { value: { kind: 'algebraic', value: one }, type: 'closed' } }
 */
export interface Interval {
	readonly kind: 'interval';
	readonly lower: Endpoint;
	readonly upper: Endpoint;
}

/**
 * Represents a single excluded point (e.g., x != 0)
 */
export interface ExcludedPoint {
	readonly kind: 'excluded_point';
	readonly value: EndpointValue;
}

// =============================================================================
// Domain Types
// =============================================================================

/**
 * The empty domain (no valid values)
 */
export interface EmptySet {
	readonly kind: 'empty';
}

/**
 * The universal domain (all real numbers)
 */
export interface UniversalSet {
	readonly kind: 'universal';
}

/**
 * An interval-based domain (union of intervals with optional excluded points)
 *
 * Represents domains like:
 * - ]0, +infinity[
 * - ]-infinity, 0[ union ]0, +infinity[ (R \ {0})
 * - [-1, 1]
 */
export interface IntervalSet {
	readonly kind: 'interval_set';
	readonly intervals: readonly Interval[];
	readonly excludedPoints: readonly ExcludedPoint[];
}

/**
 * Union of all interval domain types
 */
export type IntervalDomain = EmptySet | UniversalSet | IntervalSet;

// =============================================================================
// Comparison Result Types
// =============================================================================

/**
 * Result of comparing two algebraic values numerically.
 * -1: a < b, 0: a = b, 1: a > b
 */
export type CompareResult = -1 | 0 | 1;

/**
 * Result of algebraic comparison with exactness flag.
 * Following mathAST pattern for exact vs fallback computation.
 */
export interface AlgebraicCompareResult {
	/** The comparison result: -1 (less), 0 (equal), 1 (greater) */
	readonly result: CompareResult;
	/** True if comparison was exact, false if numeric fallback was used */
	readonly exact: boolean;
}
