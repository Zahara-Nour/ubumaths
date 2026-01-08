/**
 * Endpoint Comparison - Compare interval bounds
 *
 * Provides comparison functions for EndpointValue (algebraic or infinity).
 * Uses exact algebraic comparison when possible.
 */

import { algebraicToNumber } from '$lib/mathAST/normal/algebraic';
import { compareAlgebraicNumerically } from './algebraic-compare';
import type { EndpointValue, CompareResult, AlgebraicCompareResult } from './types';

// =============================================================================
// Endpoint Value Comparison
// =============================================================================

/**
 * Compares two endpoint values NUMERICALLY (order on R).
 * Uses exact algebraic comparison for algebraic values.
 *
 * @param a - First endpoint value
 * @param b - Second endpoint value
 * @returns Comparison result with exactness flag
 *
 * @example
 * // Infinity comparisons (always exact)
 * compareEndpointValues(negInf, posInf) // { result: -1, exact: true }
 *
 * // Algebraic comparisons
 * compareEndpointValues(sqrt2, rational(3,2)) // { result: -1, exact: true }
 */
export function compareEndpointValues(a: EndpointValue, b: EndpointValue): AlgebraicCompareResult {
	// Case 1: Both infinity
	if (a.kind === 'infinity' && b.kind === 'infinity') {
		if (a.value === b.value) {
			return { result: 0, exact: true };
		}
		return {
			result: a.value === 'negative_infinity' ? -1 : 1,
			exact: true
		};
	}

	// Case 2: One is infinity
	if (a.kind === 'infinity') {
		return {
			result: a.value === 'negative_infinity' ? -1 : 1,
			exact: true
		};
	}
	if (b.kind === 'infinity') {
		return {
			result: b.value === 'negative_infinity' ? 1 : -1,
			exact: true
		};
	}

	// Case 3: Both algebraic - use exact comparison
	return compareAlgebraicNumerically(a.value, b.value);
}

/**
 * Simple comparison that returns just the result (no exactness info).
 * Useful when you just need to know the order.
 *
 * @param a - First endpoint value
 * @param b - Second endpoint value
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compareEndpoints(a: EndpointValue, b: EndpointValue): CompareResult {
	return compareEndpointValues(a, b).result;
}

/**
 * Checks if two endpoint values are equal.
 *
 * @param a - First endpoint value
 * @param b - Second endpoint value
 * @returns true if a = b
 */
export function endpointEquals(a: EndpointValue, b: EndpointValue): boolean {
	return compareEndpointValues(a, b).result === 0;
}

/**
 * Checks if endpoint a is less than endpoint b.
 */
export function endpointLessThan(a: EndpointValue, b: EndpointValue): boolean {
	return compareEndpointValues(a, b).result === -1;
}

/**
 * Checks if endpoint a is less than or equal to endpoint b.
 */
export function endpointLessThanOrEqual(a: EndpointValue, b: EndpointValue): boolean {
	return compareEndpointValues(a, b).result <= 0;
}

/**
 * Checks if endpoint a is greater than endpoint b.
 */
export function endpointGreaterThan(a: EndpointValue, b: EndpointValue): boolean {
	return compareEndpointValues(a, b).result === 1;
}

/**
 * Checks if endpoint a is greater than or equal to endpoint b.
 */
export function endpointGreaterThanOrEqual(a: EndpointValue, b: EndpointValue): boolean {
	return compareEndpointValues(a, b).result >= 0;
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts an endpoint value to a floating-point number.
 * Useful for fallback operations or containsValue checks.
 *
 * @param value - An endpoint value
 * @returns The numeric value (may be -Infinity or +Infinity)
 */
export function endpointToNumber(value: EndpointValue): number {
	if (value.kind === 'infinity') {
		return value.value === 'negative_infinity' ? -Infinity : Infinity;
	}
	return algebraicToNumber(value.value);
}

/**
 * Checks if an endpoint value is infinite.
 */
export function isInfinite(value: EndpointValue): boolean {
	return value.kind === 'infinity';
}

/**
 * Checks if an endpoint value is positive infinity.
 */
export function isPositiveInfinity(value: EndpointValue): boolean {
	return value.kind === 'infinity' && value.value === 'positive_infinity';
}

/**
 * Checks if an endpoint value is negative infinity.
 */
export function isNegativeInfinity(value: EndpointValue): boolean {
	return value.kind === 'infinity' && value.value === 'negative_infinity';
}
