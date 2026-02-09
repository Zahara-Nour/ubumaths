/**
 * Interval Types for Mathematical Domain Operations
 *
 * Types for representing intervals with symbolic MathNode bounds.
 * Supports any MathNode: numbers, rationals, radicals, pi, ln(2), etc.
 */

import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Endpoint Types
// =============================================================================

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
	readonly value: MathNode;
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
 * // ]0, +∞[ represents x > 0
 * { kind: 'interval',
 *   lower: { value: number('0'), type: 'open' },
 *   upper: { value: infinity('positive'), type: 'open' } }
 *
 * // [-1, 1] represents -1 <= x <= 1
 * { kind: 'interval',
 *   lower: { value: number('-1'), type: 'closed' },
 *   upper: { value: number('1'), type: 'closed' } }
 *
 * // [0, π] represents 0 <= x <= π
 * { kind: 'interval',
 *   lower: { value: number('0'), type: 'closed' },
 *   upper: { value: piConstant(), type: 'closed' } }
 */
export interface Interval {
	readonly kind: 'interval';
	readonly lower: Endpoint;
	readonly upper: Endpoint;
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
 * An interval-based domain (union of intervals).
 *
 * This is a pure interval representation without excluded points.
 * The domain module's IntervalSet extends this with excludedPoints support.
 *
 * Represents domains like:
 * - ]0, +∞[
 * - ]-∞, 0[ ∪ ]0, +∞[
 * - [-1, 1]
 * - [0, π]
 */
export interface IntervalSet {
	readonly kind: 'interval_set';
	readonly intervals: readonly Interval[];
}

/**
 * Union of all interval domain types
 */
export type IntervalDomain = EmptySet | UniversalSet | IntervalSet;
