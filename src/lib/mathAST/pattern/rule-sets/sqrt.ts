/**
 * Square Root Simplification Rules
 *
 * Known values:
 * - sqrt(0) = 0
 * - sqrt(1) = 1
 *
 * Structural rules:
 * - sqrt(x) * sqrt(y) = sqrt(x * y)
 * - sqrt(x / y) = sqrt(x) / sqrt(y)
 *
 * @module mathAST/pattern/rule-sets/sqrt
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule } from '../types';

// =============================================================================
// Known Values
// =============================================================================

/** sqrt(0) = 0 */
const sqrtZero = createRule(P.func('sqrt', [P.num(0)]), P.num(0), {
	name: 'sqrt-zero'
});

/** sqrt(1) = 1 */
const sqrtOne = createRule(P.func('sqrt', [P.num(1)]), P.num(1), {
	name: 'sqrt-one'
});

// =============================================================================
// Structural Rules
// =============================================================================

/** sqrt(x) * sqrt(y) = sqrt(x * y) */
const sqrtProduct = createRule(
	P.mul(P.func('sqrt', [P._('x')]), P.func('sqrt', [P._('y')])),
	P.func('sqrt', [P.mul(P._('x'), P._('y'))]),
	{ name: 'sqrt-product' }
);

/** sqrt(x / y) = sqrt(x) / sqrt(y) */
const sqrtQuotient = createRule(
	P.func('sqrt', [P.div(P._('x'), P._('y'))]),
	P.div(P.func('sqrt', [P._('x')]), P.func('sqrt', [P._('y')])),
	{ name: 'sqrt-quotient' }
);

// =============================================================================
// Exports
// =============================================================================

export const sqrtRules: readonly Rule[] = [sqrtZero, sqrtOne, sqrtProduct, sqrtQuotient] as const;
