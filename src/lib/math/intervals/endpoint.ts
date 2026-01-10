/**
 * Endpoint Utilities
 *
 * Provides utility functions for interval endpoints.
 * Re-exports comparison functions from compare.ts.
 */

import { evaluate } from '$lib/mathAST/eval';
import {
	isInfinity as mathASTIsInfinity,
	isPositiveInfinity as mathASTIsPositiveInfinity,
	isNegativeInfinity as mathASTIsNegativeInfinity
} from '$lib/mathAST/guards';
import type { EndpointValue } from './types';

// =============================================================================
// Re-export Comparison Functions
// =============================================================================

export {
	compareEndpointValues,
	compare,
	endpointLessThan,
	endpointEquals,
	endpointLessThanOrEqual,
	endpointGreaterThan,
	endpointGreaterThanOrEqual
} from './compare';

export type { CompareResult, CompareOutcome } from './types';

// =============================================================================
// Infinity Checks
// =============================================================================

/**
 * Checks if an endpoint value is infinite (+∞ or -∞).
 */
export function isInfinite(value: EndpointValue): boolean {
	return mathASTIsInfinity(value);
}

/**
 * Checks if an endpoint value is positive infinity (+∞).
 */
export function isPositiveInfinity(value: EndpointValue): boolean {
	return mathASTIsPositiveInfinity(value);
}

/**
 * Checks if an endpoint value is negative infinity (-∞).
 */
export function isNegativeInfinity(value: EndpointValue): boolean {
	return mathASTIsNegativeInfinity(value);
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts an endpoint value to a floating-point number.
 * Useful for fallback operations or numeric approximations.
 *
 * @param value - An endpoint value (MathNode)
 * @returns The numeric value (may be -Infinity, +Infinity, or NaN if incomputable)
 *
 * @example
 * endpointToNumber(number('5'))        // 5
 * endpointToNumber(greek('pi'))        // 3.141592653589793
 * endpointToNumber(infinity('positive')) // Infinity
 * endpointToNumber(variable('x'))      // NaN (cannot evaluate)
 */
export function endpointToNumber(value: EndpointValue): number {
	// Handle infinity specially (evaluate doesn't support InfinityNode)
	if (mathASTIsPositiveInfinity(value)) {
		return Infinity;
	}
	if (mathASTIsNegativeInfinity(value)) {
		return -Infinity;
	}

	try {
		const result = evaluate(value, { mode: 'decimal' });
		if (typeof result.value === 'number') {
			return result.value;
		}
		// Complex number or other non-numeric result
		return NaN;
	} catch {
		// Evaluation failed (contains variables, etc.)
		return NaN;
	}
}
