/**
 * MathAST Normal Form - Simplification Rules Index
 *
 * Exports all simplification rules and provides a combined simplify function
 * that applies all rules until a fixed point is reached.
 */

export {
	applyArithmeticRules,
	simplifyArithmetic,
	isZeroNode,
	isOneNode,
	zeroNode,
	oneNode
} from './arithmetic.js';

export { applyPowerRules, simplifyPowers } from './powers.js';

export { applyRadicalRules, simplifyRadicals } from './radicals.js';

import type { MathNode } from '../../types';
import { simplifyArithmetic } from './arithmetic.js';
import { simplifyPowers } from './powers.js';
import { simplifyRadicals } from './radicals.js';
import { hashMathNode } from '../hash.js';

// =============================================================================
// Combined Simplification
// =============================================================================

/**
 * Applies all simplification rules once.
 *
 * Order of application:
 * 1. Arithmetic rules (identity elements)
 * 2. Power rules (exponent manipulation)
 * 3. Radical rules (root simplification)
 *
 * Note: Transcendental functions (trig, log, exp) are handled in Phase 2
 * (normalizeNode) where arguments are normalized before evaluation.
 *
 * @param node - The node to simplify
 * @returns The simplified node
 */
export function simplifyOnce(node: MathNode): MathNode {
	let result = node;

	// Apply rules in order
	result = simplifyArithmetic(result);
	result = simplifyPowers(result);
	result = simplifyRadicals(result);

	return result;
}

/**
 * Applies all simplification rules repeatedly until no changes occur.
 *
 * Uses hash comparison to detect when a fixed point is reached.
 *
 * @param node - The node to simplify
 * @param maxIterations - Maximum number of iterations (default 100)
 * @returns The fully simplified node
 */
export function simplify(node: MathNode, maxIterations: number = 100): MathNode {
	let current = node;
	let currentHash = hashMathNode(current);

	for (let i = 0; i < maxIterations; i++) {
		const next = simplifyOnce(current);
		const nextHash = hashMathNode(next);

		// Fixed point reached
		if (nextHash === currentHash) {
			return current;
		}

		current = next;
		currentHash = nextHash;
	}

	// Max iterations reached - return current state
	return current;
}
