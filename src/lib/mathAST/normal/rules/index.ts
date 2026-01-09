/**
 * MathAST Normal Form - Simplification Rules Index
 *
 * Phase 1 pre-simplification: only radical rules that Phase 2 cannot handle.
 * All arithmetic and power rules have been moved to Phase 2 (polynomial normalization).
 */

export { applyRadicalRules, simplifyRadicals } from './radicals.js';

import type { MathNode } from '../../types.js';
import { simplifyRadicals } from './radicals.js';

// =============================================================================
// Combined Simplification
// =============================================================================

/**
 * Applies Phase 1 simplification (single pass, bottom-up).
 *
 * Only radical combination rules:
 * - √a * √b = √(ab) for symbolic radicals
 * - √(a/b) = √a / √b
 *
 * All other rules (arithmetic, powers) are handled in Phase 2
 * (polynomial normalization).
 *
 * @param node - The node to simplify
 * @returns The simplified node
 */
export function simplify(node: MathNode): MathNode {
	return simplifyRadicals(node);
}

/**
 * Alias for simplify - applies all Phase 1 rules once.
 */
export const simplifyOnce = simplify;
