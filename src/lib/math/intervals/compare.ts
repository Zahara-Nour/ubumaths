/**
 * Interval Endpoint Comparison
 *
 * Provides comparison for interval endpoints using mathAST's
 * compareNumericNodes() for exact symbolic and numeric comparison.
 */

import { compareNumericNodes } from '$lib/mathAST/eval';
import type { EndpointValue, CompareOutcome } from './types';

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
 * @returns -1 (a < b), 0 (a = b), 1 (a > b), undefined (incomparable)
 *
 * @example
 * compare(number('3'), number('5'))       // -1
 * compare(piConstant(), number('3'))      // 1 (π > 3)
 * compare(sqrt(2), sqrt(2))              // 0
 * compare(variable('x'), number('3'))    // undefined
 */
export function compare(a: EndpointValue, b: EndpointValue): CompareOutcome {
	return compareNumericNodes(a, b);
}
