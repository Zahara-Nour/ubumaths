/**
 * Endpoint Utilities
 *
 * Provides utility functions for interval endpoints:
 * infinity checks and numeric conversion.
 */

import { evaluate } from '$lib/mathAST/eval';
import {
	isInfinity as mathASTIsInfinity,
	isPositiveInfinity as mathASTIsPositiveInfinity,
	isNegativeInfinity as mathASTIsNegativeInfinity
} from '$lib/mathAST/guards';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Infinity Checks
// =============================================================================

/**
 * Checks if an endpoint value is infinite (+∞ or -∞).
 */
export function isInfiniteEndpoint(value: MathNode): boolean {
	return mathASTIsInfinity(value);
}

/**
 * Checks if an endpoint value is positive infinity (+∞).
 */
export function isPositiveInfinityEndpoint(value: MathNode): boolean {
	return mathASTIsPositiveInfinity(value);
}

/**
 * Checks if an endpoint value is negative infinity (-∞).
 */
export function isNegativeInfinityEndpoint(value: MathNode): boolean {
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
 * endpointToNumber(piConstant())       // 3.141592653589793
 * endpointToNumber(infinity('positive')) // Infinity
 * endpointToNumber(variable('x'))      // NaN (cannot evaluate)
 */
export function endpointToNumber(value: MathNode): number {
	// Handle infinity specially (evaluate doesn't support InfinityNode)
	if (mathASTIsPositiveInfinity(value)) {
		return Infinity;
	}
	if (mathASTIsNegativeInfinity(value)) {
		return -Infinity;
	}

	try {
		const result = evaluate(value, { mode: 'decimal' });
		if (result.status === 'value' && typeof result.value === 'number') {
			return result.value;
		}
		// Complex number, indeterminate, unevaluable, or other non-numeric result
		return NaN;
	} catch {
		// Evaluation failed (contains variables, etc.)
		return NaN;
	}
}
