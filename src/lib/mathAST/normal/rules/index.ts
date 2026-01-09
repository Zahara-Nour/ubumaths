/**
 * MathAST Normal Form - Preprocessing Rules Index
 *
 * Phase 1 preprocessing: only radical rules that Phase 2 cannot handle.
 * All arithmetic and power rules have been moved to Phase 2 (polynomial normalization).
 */

export { applyRadicalRules, simplifyRadicals } from './radicals.js';

import type { MathNode } from '../../types.js';
import { simplifyRadicals } from './radicals.js';
import { hashMathNode } from '../hash.js';

// =============================================================================
// Phase 1 Preprocessing
// =============================================================================

/**
 * Applies Phase 1 preprocessing once (single pass, bottom-up).
 *
 * Only radical combination rules:
 * - √a * √b = √(ab) for symbolic radicals
 * - √(a/b) = √a / √b
 *
 * All other rules (arithmetic, powers) are handled in Phase 2
 * (polynomial normalization).
 *
 * @param node - The node to preprocess
 * @returns The preprocessed node
 */
export function preprocessOnce(node: MathNode): MathNode {
	return simplifyRadicals(node);
}

/**
 * Applies Phase 1 preprocessing until fixed point.
 *
 * Iterates until no more changes occur (or maxIterations reached).
 *
 * @param node - The node to preprocess
 * @param maxIterations - Maximum iterations (default: 100)
 * @returns The fully preprocessed node
 */
export function preprocess(node: MathNode, maxIterations: number = 100): MathNode {
	let current = node;
	let currentHash = hashMathNode(current);

	for (let i = 0; i < maxIterations; i++) {
		const next = preprocessOnce(current);
		const nextHash = hashMathNode(next);

		if (nextHash === currentHash) {
			break;
		}

		current = next;
		currentHash = nextHash;
	}

	return current;
}
