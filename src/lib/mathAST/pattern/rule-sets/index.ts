/**
 * Rule Sets Index
 *
 * Exports all predefined rule sets for pattern-based expression simplification.
 *
 * @example
 * ```typescript
 * import { arithmeticRules, powerRules, allRules } from './rule-sets';
 * import { applyRules } from '../rule';
 *
 * // Apply only arithmetic rules
 * const result1 = applyRules(arithmeticRules, node);
 *
 * // Apply all available rules
 * const result2 = applyRules(allRules, node);
 * ```
 */

import type { Rule } from '../types';
import { arithmeticRules } from './arithmetic';
import { powerRules } from './powers';
import { absRules } from './abs';

// =============================================================================
// Individual Rule Set Exports
// =============================================================================

export { arithmeticRules } from './arithmetic';
export { powerRules } from './powers';
export { absRules } from './abs';

// =============================================================================
// Combined Rule Sets
// =============================================================================

/**
 * All simplification rules combined.
 *
 * Includes:
 * - Arithmetic rules (addition, subtraction, multiplication, division identities)
 * - Power rules (exponent simplifications)
 * - Abs rules (absolute value simplifications)
 *
 * Rules are ordered with arithmetic rules first, then power rules, then abs rules.
 * Priority within rules is preserved (mul-zero has higher priority).
 */
export const allRules: readonly Rule[] = [...arithmeticRules, ...powerRules, ...absRules] as const;
