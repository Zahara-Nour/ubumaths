/**
 * Numeric Value Computation for Solver
 *
 * Single shared utility for computing numeric approximations of MathNode values.
 * Uses evaluateNodeToApproximatedNumber which handles all constant expressions
 * including π, √2, e, etc. — not just rationals.
 *
 * @module mathAST/solve/numeric-value
 */

import type { MathNode } from '../types';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

/**
 * Compute numeric value of a constant MathNode.
 *
 * Returns null if the node contains variables, or if evaluation fails.
 * Handles π, e, √2, fractions, and all constant expressions.
 */
export function computeNumericValue(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return isFinite(value) ? value : null;
	} catch {
		return null;
	}
}
