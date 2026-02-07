/**
 * Logarithm/Exponential Simplification Rules
 *
 * Rules for simplifying inverse pairs of ln and exp:
 * - ln(e^x) = x
 * - e^(ln(x)) = x (x > 0 implied by domain)
 *
 * @module mathAST/pattern/rule-sets/log-exp
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule } from '../types';
import { euler } from '../../factory';

// =============================================================================
// Log/Exp Inverse Rules
// =============================================================================

/**
 * ln(e^x) = x
 * Logarithm undoes exponentiation. Valid for all real x.
 */
const lnExp = createRule(P.func('ln', [P.pow(P.lit(euler()), P._('x'))]), P._('x'), {
	name: 'ln-exp'
});

/**
 * e^(ln(x)) = x
 * Exponentiation undoes logarithm. Domain constraint (x > 0) is
 * implicit in the presence of ln(x).
 */
const expLn = createRule(P.pow(P.lit(euler()), P.func('ln', [P._('x')])), P._('x'), {
	name: 'exp-ln'
});

// =============================================================================
// Exports
// =============================================================================

export const logExpRules: readonly Rule[] = [lnExp, expLn] as const;
