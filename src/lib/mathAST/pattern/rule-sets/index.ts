/**
 * Rule Sets Index
 *
 * Exports all predefined rule sets for pattern-based expression simplification.
 */

import type { Rule } from '../types';
import { arithmeticRules } from './arithmetic';
import { powerRules } from './powers';
import { absRules } from './abs';
import { logExpRules } from './log-exp';
import { sqrtRules } from './sqrt';
import { trigRules } from './trig';
import { functionParityRules } from './function-parity';

// =============================================================================
// Individual Rule Set Exports
// =============================================================================

export { arithmeticRules } from './arithmetic';
export { powerRules } from './powers';
export { absRules } from './abs';
export { logExpRules } from './log-exp';
export { sqrtRules } from './sqrt';
export { trigRules } from './trig';
export { functionParityRules } from './function-parity';

// Identity rule sets (trig, hyperbolic, algebraic)
export {
	trigSimplifyRules,
	allTrigRules,
	trigDoubleAngleRules,
	trigPowerReductionRules,
	trigPythagoreanRules,
	trigQuotientRules,
	trigLinearizationRules,
	trigNegativeAngleRules,
	trigPeriodicRules,
	trigAdditionRules,
	trigDoubleAngleExpansionRules,
	trigCofunctionRules,
	trigSupplementaryRules,
	trigShiftPiOver2Rules,
	trigFactorizationRules,
	trigHalfAngleRules,
	trigHigherPowerRules
} from './trig-identities';

export {
	hypSimplifyRules,
	allHyperbolicRules,
	hypDoubleAngleRules,
	hypPowerReductionRules,
	hypPythagoreanRules,
	hypQuotientRules,
	hypLinearizationRules,
	hypNegativeArgumentRules,
	hypAdditionRules,
	hypDoubleAngleExpansionRules,
	hypFactorizationRules,
	hypHalfAngleRules,
	hypHigherPowerRules
} from './hyperbolic-identities';

export {
	algebraicSimplifyRules,
	algebraicFactoringRules,
	algebraicExpandingRules
} from './algebraic-identities';

// =============================================================================
// Combined Rule Sets
// =============================================================================

/**
 * All pattern rules combined (for public API / standalone use).
 *
 * Includes arithmetic, power, abs, log/exp, sqrt, trig, and function parity
 * rules. Useful for direct pattern-based simplification via `applyRules()`
 * or `exp.simplifyWith()`.
 *
 * Note: The `simplify()` pipeline does NOT use these — arithmetic and power
 * rules are redundant with normalize (polynomial arithmetic handles x+0, x*1,
 * x^0, etc. implicitly). The pipeline uses `simplifyRules` instead.
 */
export const allPatternRules: readonly Rule[] = [
	...arithmeticRules,
	...powerRules,
	...absRules,
	...logExpRules,
	...sqrtRules,
	...trigRules,
	...functionParityRules
] as const;

/**
 * Rules used by the simplify() pipeline (Phase B).
 *
 * Only includes abs rules — arithmetic and power rules are fully redundant
 * with normalize's polynomial arithmetic. Trig/hyp/algebraic identity rules
 * are added dynamically by buildSimplifyRules() based on SimplifyOptions.
 */
export const simplifyRules: readonly Rule[] = [...absRules] as const;
