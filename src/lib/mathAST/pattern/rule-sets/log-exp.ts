/**
 * Logarithm/Exponential Simplification Rules
 *
 * Inverse pairs:
 * - ln(e^x) = x
 * - e^(ln(x)) = x
 *
 * Known values:
 * - ln(1) = 0
 * - ln(e) = 1
 *
 * Logarithm properties:
 * - ln(x^n) = n*ln(x)
 * - ln(x*y) = ln(x) + ln(y)
 * - ln(x/y) = ln(x) - ln(y)
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

/** ln(e^x) = x */
const lnExp = createRule(P.func('ln', [P.pow(P.lit(euler()), P._('x'))]), P._('x'), {
	name: 'ln-exp'
});

/** e^(ln(x)) = x */
const expLn = createRule(P.pow(P.lit(euler()), P.func('ln', [P._('x')])), P._('x'), {
	name: 'exp-ln'
});

// =============================================================================
// Known Values
// =============================================================================

/** ln(1) = 0 */
const lnOne = createRule(P.func('ln', [P.num(1)]), P.num(0), {
	name: 'ln-one'
});

/** ln(e) = 1 */
const lnE = createRule(P.func('ln', [P.lit(euler())]), P.num(1), {
	name: 'ln-e'
});

// =============================================================================
// Logarithm Properties
// =============================================================================

/** ln(x^n) = n * ln(x) */
const lnPow = createRule(
	P.func('ln', [P.pow(P._('x'), P._('n'))]),
	P.mul(P._('n'), P.func('ln', [P._('x')])),
	{ name: 'ln-pow' }
);

/** ln(x * y) = ln(x) + ln(y) */
const lnProduct = createRule(
	P.func('ln', [P.mul(P._('x'), P._('y'))]),
	P.add(P.func('ln', [P._('x')]), P.func('ln', [P._('y')])),
	{ name: 'ln-product' }
);

/** ln(x / y) = ln(x) - ln(y) */
const lnQuotient = createRule(
	P.func('ln', [P.div(P._('x'), P._('y'))]),
	P.sub(P.func('ln', [P._('x')]), P.func('ln', [P._('y')])),
	{ name: 'ln-quotient' }
);

// =============================================================================
// Exports
// =============================================================================

export const logExpRules: readonly Rule[] = [
	lnExp,
	expLn,
	lnOne,
	lnE,
	lnPow,
	lnProduct,
	lnQuotient
] as const;
