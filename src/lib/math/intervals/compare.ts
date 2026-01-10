/**
 * Interval Endpoint Comparison
 *
 * Provides comparison functions for interval endpoints using mathAST's
 * compareNumericNodes() for exact symbolic and numeric comparison.
 */

import { compareNumericNodes } from '$lib/mathAST/eval';
import type { EndpointValue, CompareResult, CompareOutcome } from './types';

// =============================================================================
// Core Comparison
// =============================================================================

/**
 * Compares two endpoint values.
 *
 * Uses mathAST's compareNumericNodes() which:
 * 1. Handles InfinityNode specially (+∞, -∞)
 * 2. Computes diff = a - b
 * 3. Evaluates in exact mode (detects √2 - √2 = 0)
 * 4. Falls back to decimal mode if needed
 * 5. Returns undefined if incomparable (variables, etc.)
 *
 * @param a - First endpoint value
 * @param b - Second endpoint value
 * @returns CompareResult with outcome: -1 (a < b), 0 (a = b), 1 (a > b), undefined (incomparable)
 *
 * @example
 * compareEndpointValues(number('3'), number('5'))  // { outcome: -1 }
 * compareEndpointValues(greek('pi'), number('3'))  // { outcome: 1 } (π > 3)
 * compareEndpointValues(sqrt(2), sqrt(2))          // { outcome: 0 }
 * compareEndpointValues(variable('x'), number('3')) // { outcome: undefined }
 */
export function compareEndpointValues(a: EndpointValue, b: EndpointValue): CompareResult {
	return { outcome: compareNumericNodes(a, b) };
}

/**
 * Returns just the comparison outcome (convenience function).
 */
export function compare(a: EndpointValue, b: EndpointValue): CompareOutcome {
	return compareNumericNodes(a, b);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Checks if a < b.
 * @returns true if a < b, false if a >= b, undefined if incomparable
 */
export function endpointLessThan(a: EndpointValue, b: EndpointValue): boolean | undefined {
	const result = compareNumericNodes(a, b);
	if (result === undefined) return undefined;
	return result < 0;
}

/**
 * Checks if a = b.
 * @returns true if a = b, false if a != b, undefined if incomparable
 */
export function endpointEquals(a: EndpointValue, b: EndpointValue): boolean | undefined {
	const result = compareNumericNodes(a, b);
	if (result === undefined) return undefined;
	return result === 0;
}

/**
 * Checks if a <= b.
 * @returns true if a <= b, false if a > b, undefined if incomparable
 */
export function endpointLessThanOrEqual(a: EndpointValue, b: EndpointValue): boolean | undefined {
	const result = compareNumericNodes(a, b);
	if (result === undefined) return undefined;
	return result <= 0;
}

/**
 * Checks if a > b.
 * @returns true if a > b, false if a <= b, undefined if incomparable
 */
export function endpointGreaterThan(a: EndpointValue, b: EndpointValue): boolean | undefined {
	const result = compareNumericNodes(a, b);
	if (result === undefined) return undefined;
	return result > 0;
}

/**
 * Checks if a >= b.
 * @returns true if a >= b, false if a < b, undefined if incomparable
 */
export function endpointGreaterThanOrEqual(
	a: EndpointValue,
	b: EndpointValue
): boolean | undefined {
	const result = compareNumericNodes(a, b);
	if (result === undefined) return undefined;
	return result >= 0;
}
