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
 * An endpoint value is a MathNode.
 *
 * This includes:
 * - NumberNode: 0, 1, -5, 3.14
 * - InfinityNode: +∞, -∞
 * - GreekLetterNode: π, e
 * - FunctionNode: sqrt(2), ln(3), sin(π/4)
 * - DivisionNode: 1/2, 3/4
 * - Any other symbolic expression
 */
export type EndpointValue = MathNode;

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
 *   upper: { value: greek('pi'), type: 'closed' } }
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
 * - ]0, +∞[
 * - ]-∞, 0[ ∪ ]0, +∞[ (ℝ \ {0})
 * - [-1, 1]
 * - [0, π]
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
 * Result of comparing two endpoint values.
 * Maps directly to compareNumericNodes() return type:
 * - -1: a < b
 * - 0: a = b
 * - 1: a > b
 * - undefined: cannot compare (e.g., contains variables)
 */
export type CompareOutcome = -1 | 0 | 1 | undefined;

/**
 * Result of endpoint comparison.
 * Structure kept for future extensibility.
 */
export interface CompareResult {
	readonly outcome: CompareOutcome;
}
