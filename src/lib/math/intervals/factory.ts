/**
 * Factory functions for creating Interval types with MathNode bounds
 *
 * All bounds are MathNodes from mathAST, supporting symbolic expressions.
 */

import { number, infinity } from '$lib/mathAST/factory';
import { parseCustomPratt } from '$lib/mathAST/parser/custom/parser-pratt';
import type { MathNode } from '$lib/mathAST/types';
import type {
	Endpoint,
	EndpointType,
	Interval,
	EmptySet,
	UniversalSet,
	IntervalSet
} from './types';
import { normalizeIntervals } from './normalize';

// =============================================================================
// Bound Value Constructors
// =============================================================================

/**
 * Creates an endpoint value from a JS number.
 *
 * Uses n.toString() internally, so integers and "normal" decimals are
 * stored exactly (e.g. "42", "0.5", "-3.14") and later evaluated via
 * exact BigInt/fraction arithmetic. However, values outside the range
 * [1e-7, 1e21] produce scientific notation strings ("1e-7", "1e+21")
 * which are evaluated via parseFloat → floatToRational (64-bit float
 * precision). For exact large/small values, use bound() with a
 * fraction expression like "3/2".
 *
 * @example
 * fromNumber(0)    // NumberNode '0'      → exact
 * fromNumber(1.5)  // NumberNode '1.5'    → exact (3/2)
 * fromNumber(-2)   // NumberNode '-2'     → exact
 * fromNumber(1e-8) // NumberNode '1e-8'   → float precision
 */
export function fromNumber(n: number): MathNode {
	return number(n.toString());
}

/**
 * Creates an endpoint value from a custom math expression string.
 *
 * Uses parseCustom from mathAST to parse any symbolic expression.
 * Special cases: '+inf' and '-inf' produce infinity nodes directly.
 *
 * @param expr - A math expression in custom syntax
 * @returns A MathNode representing the parsed expression
 *
 * @example
 * bound('+inf')      // positive infinity
 * bound('-inf')      // negative infinity
 * bound('3/2')       // fraction 3/2
 * bound('sqrt(2)')   // √2
 * bound('\\pi')      // π
 * bound('e')         // Euler's number
 * bound('2*sqrt(3)') // 2√3
 */
export function bound(expr: string): MathNode {
	if (expr === '+inf') return infinity('positive');
	if (expr === '-inf') return infinity('negative');
	return parseCustomPratt(expr);
}

// =============================================================================
// Endpoint Factories
// =============================================================================

/**
 * Creates an endpoint with given value and type.
 */
export function endpoint(value: MathNode, type: EndpointType): Endpoint {
	return { value, type };
}

/**
 * Creates an open endpoint (excluded from interval).
 */
export function openEndpoint(value: MathNode): Endpoint {
	return endpoint(value, 'open');
}

/**
 * Creates a closed endpoint (included in interval).
 */
export function closedEndpoint(value: MathNode): Endpoint {
	return endpoint(value, 'closed');
}

/**
 * Creates negative infinity endpoint (always open).
 */
export function negInfinityEndpoint(): Endpoint {
	return openEndpoint(bound('-inf'));
}

/**
 * Creates positive infinity endpoint (always open).
 */
export function posInfinityEndpoint(): Endpoint {
	return openEndpoint(bound('+inf'));
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
export function openInterval(lower: MathNode, upper: MathNode): Interval {
	return interval(openEndpoint(lower), openEndpoint(upper));
}

/**
 * Creates a closed interval [a, b]
 */
export function closedInterval(lower: MathNode, upper: MathNode): Interval {
	return interval(closedEndpoint(lower), closedEndpoint(upper));
}

/**
 * Creates a half-open interval [a, b) - French notation [a, b[
 */
export function leftClosedInterval(lower: MathNode, upper: MathNode): Interval {
	return interval(closedEndpoint(lower), openEndpoint(upper));
}

/**
 * Creates a half-open interval (a, b] - French notation ]a, b]
 */
export function rightClosedInterval(lower: MathNode, upper: MathNode): Interval {
	return interval(openEndpoint(lower), closedEndpoint(upper));
}

/**
 * Creates (-infinity, a) - French notation ]-infinity, a[
 */
export function lessThanInterval(bound: MathNode): Interval {
	return interval(negInfinityEndpoint(), openEndpoint(bound));
}

/**
 * Creates (-infinity, a] - French notation ]-infinity, a]
 */
export function lessThanOrEqualInterval(bound: MathNode): Interval {
	return interval(negInfinityEndpoint(), closedEndpoint(bound));
}

/**
 * Creates (a, +infinity) - French notation ]a, +infinity[
 */
export function greaterThanInterval(bound: MathNode): Interval {
	return interval(openEndpoint(bound), posInfinityEndpoint());
}

/**
 * Creates [a, +infinity) - French notation [a, +infinity[
 */
export function greaterThanOrEqualInterval(bound: MathNode): Interval {
	return interval(closedEndpoint(bound), posInfinityEndpoint());
}

/**
 * Creates the entire real line (-infinity, +infinity)
 */
export function realLine(): Interval {
	return interval(negInfinityEndpoint(), posInfinityEndpoint());
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
 * Creates an interval set from intervals.
 *
 * Normalizes the input: sorts by lower bound and merges overlapping/adjacent
 * intervals. This enforces the structural invariant that an IntervalSet always
 * contains disjoint, sorted intervals - which the formatting and algebra
 * operations rely on for correct output.
 */
export function intervalSet(intervals: readonly Interval[]): IntervalSet {
	return { kind: 'interval_set', intervals: normalizeIntervals(intervals) };
}

// =============================================================================
// Common Domain Shortcuts
// =============================================================================

/** Domain for x > 0 (e.g., for ln) - ]0, +infinity[ */
export function positiveReals(): IntervalSet {
	return intervalSet([greaterThanInterval(fromNumber(0))]);
}

/** Domain for x >= 0 (e.g., for sqrt) - [0, +infinity[ */
export function nonNegativeReals(): IntervalSet {
	return intervalSet([greaterThanOrEqualInterval(fromNumber(0))]);
}

/** Domain for x != 0 (e.g., for 1/x) - ]-∞, 0[ ∪ ]0, +∞[ */
export function nonZeroReals(): IntervalSet {
	return intervalSet([lessThanInterval(fromNumber(0)), greaterThanInterval(fromNumber(0))]);
}

/** Domain for -1 <= x <= 1 (e.g., for arcsin, arccos) - [-1, 1] */
export function unitInterval(): IntervalSet {
	return intervalSet([closedInterval(fromNumber(-1), fromNumber(1))]);
}
