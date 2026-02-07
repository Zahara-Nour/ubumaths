/**
 * Rule Sets Index
 *
 * Exports all predefined rule sets for pattern-based expression simplification.
 *
 * @example
 * ```typescript
 * import { arithmeticRules, powerRules, allPatternRules } from './rule-sets';
 * import { applyRules } from '../rule';
 *
 * // Apply only arithmetic rules
 * const result1 = applyRules(arithmeticRules, node);
 *
 * // Apply all available rules
 * const result2 = applyRules(allPatternRules, node);
 * ```
 */

import type { Rule } from '../types';
import { arithmeticRules } from './arithmetic';
import { powerRules } from './powers';
import { absRules } from './abs';
import { logExpRules } from './log-exp';

// =============================================================================
// Individual Rule Set Exports
// =============================================================================

export { arithmeticRules } from './arithmetic';
export { powerRules } from './powers';
export { absRules } from './abs';
export { logExpRules } from './log-exp';

// =============================================================================
// Combined Rule Sets
// =============================================================================

/**
 * All pattern rules combined (for public API / standalone use).
 *
 * Includes arithmetic, power, abs, and log/exp rules. Useful for direct
 * pattern-based simplification via `applyRules()` or `exp.simplifyWith()`.
 *
 * Note: The `simplify()` pipeline does NOT use these — arithmetic and power
 * rules are redundant with normalize (polynomial arithmetic handles x+0, x*1,
 * x^0, etc. implicitly). The pipeline uses `simplifyRules` instead.
 */
export const allPatternRules: readonly Rule[] = [
	...arithmeticRules,
	...powerRules,
	...absRules,
	...logExpRules
] as const;

/**
 * Rules used by the simplify() pipeline.
 *
 * Only includes abs rules — arithmetic and power rules are fully redundant
 * with normalize's polynomial arithmetic (zero coefficients are dropped,
 * identity multiplications eliminated, powers handled by powNormalForm).
 */
export const simplifyRules: readonly Rule[] = [...absRules] as const;
