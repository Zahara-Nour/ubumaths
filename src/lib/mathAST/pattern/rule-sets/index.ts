/**
 * Rule Sets Index
 *
 * Exports all predefined rule sets for pattern-based expression simplification.
 */

import type { Rule } from '../types';
import { arithmeticRules } from './arithmetic';
import { powerRules } from './powers';
import { absRules, absSimplifyRules } from './abs';
import { logExpRules } from './log-exp';
import { sqrtRules } from './sqrt';
import { trigRules } from './trig';
import { functionParityRules } from './function-parity';

// =============================================================================
// Individual Rule Set Exports
// =============================================================================

export { arithmeticRules } from './arithmetic';
export { powerRules } from './powers';
export { absRules, absSimplifyRules, absReduceRules } from './abs';
export { logExpRules, expFunctionRules } from './log-exp';
export { sqrtRules } from './sqrt';
export { trigRules } from './trig';
export { functionParityRules } from './function-parity';

// Identity rule sets (trig, hyperbolic, algebraic)
export {
	trigSimplifyRules,
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
	trigHalfAngleRules,
	trigHigherPowerRules
} from './trig-identities';

export {
	hypSimplifyRules,
	hypDoubleAngleRules,
	hypPowerReductionRules,
	hypPythagoreanRules,
	hypQuotientRules,
	hypLinearizationRules,
	hypNegativeArgumentRules,
	hypAdditionRules,
	hypDoubleAngleExpansionRules,
	hypHalfAngleRules,
	hypHigherPowerRules
} from './hyperbolic-identities';

export { algebraicFactoringRules } from './algebraic-identities';

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
 * x^0, etc. implicitly). Le pipeline assemble ses propres jeux dans
 * `buildSimplifyRules()` (`simplify/simplify.ts`).
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
 * Les règles `abs` que normalize ne couvre pas, pour un usage direct
 * (`applyRules()`, API publique) :
 * - abs-even-pow / abs-pow-even: for variable n with TypeContext assumptions
 * - abs-positive / abs-negative: conditional, require TypeContext
 *
 * ⚠️ `simplify()` ne lit PAS cette constante : `buildSimplifyRules()`
 * (`simplify/simplify.ts`) assemble ses jeux selon `SimplifyOptions` —
 * `absSimplifyRules` et les identités trig/hyp/algébriques.
 */
export const simplifyRules: readonly Rule[] = [...absSimplifyRules] as const;
