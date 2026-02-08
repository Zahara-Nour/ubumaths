/**
 * Absolute Value Simplification Rules
 *
 * Rules for simplifying expressions involving absolute value (|x|).
 *
 * Unconditional rules (always valid):
 * - |-x| -> |x|       (absorb negation)
 * - ||x|| -> |x|      (idempotent)
 * - |x*y| -> |x|*|y|  (product)
 * - |x/y| -> |x|/|y|  (quotient)
 *
 * Parity-aware rules:
 * - |x^n| -> x^n (n even, result is non-negative)
 *
 * Conditional rules (require TypeContext with assumptions):
 * - |x| -> x   when x is positive
 * - |x| -> -x  when x is negative
 *
 * @module mathAST/pattern/rule-sets/abs
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule } from '../types';

// =============================================================================
// Unconditional Abs Rules
// =============================================================================

/**
 * |-x| -> |x|
 * Absolute value absorbs negation.
 */
const absNegation = createRule(P.func('abs', [P.neg(P._('x'))]), P.func('abs', [P._('x')]), {
	name: 'abs-negation'
});

/**
 * ||x|| -> |x|
 * Absolute value is idempotent.
 */
const absIdempotent = createRule(
	P.func('abs', [P.func('abs', [P._('x')])]),
	P.func('abs', [P._('x')]),
	{ name: 'abs-idempotent' }
);

/**
 * |x * y| -> |x| * |y|
 * Absolute value distributes over products.
 */
const absProduct = createRule(
	P.func('abs', [P.mul(P._('x'), P._('y'))]),
	P.mul(P.func('abs', [P._('x')]), P.func('abs', [P._('y')])),
	{ name: 'abs-product' }
);

/**
 * |x / y| -> |x| / |y|
 * Absolute value distributes over quotients.
 */
const absQuotient = createRule(
	P.func('abs', [P.div(P._('x'), P._('y'))]),
	P.div(P.func('abs', [P._('x')]), P.func('abs', [P._('y')])),
	{ name: 'abs-quotient' }
);

// =============================================================================
// Parity-Aware Abs Rules
// =============================================================================

/**
 * |x^n| -> x^n when n is even.
 * x^n is non-negative for even n, so abs is redundant.
 */
const absEvenPow = createRule(
	P.func('abs', [P.pow(P._('x'), P._('n', P.isEven()))]),
	P.pow(P._('x'), P._('n')),
	{ name: 'abs-even-pow' }
);

/**
 * |x|^n -> x^n when n is even.
 * |x|^n = (|x|)^n = x^n for even n (both sides non-negative).
 */
const absPowEven = createRule(
	P.pow(P.func('abs', [P._('x')]), P._('n', P.isEven())),
	P.pow(P._('x'), P._('n')),
	{ name: 'abs-pow-even' }
);

// =============================================================================
// Conditional Abs Rules (require TypeContext)
// =============================================================================

/**
 * |x| -> x when x is positive.
 * Requires TypeContext with assumption x > 0.
 */
const absPositive = createRule(P.func('abs', [P._('x', P.isPositive())]), P._('x'), {
	name: 'abs-positive'
});

/**
 * |x| -> -x when x is negative.
 * Requires TypeContext with assumption x < 0.
 */
const absNegative = createRule(P.func('abs', [P._('x', P.isNegative())]), P.neg(P._('x')), {
	name: 'abs-negative'
});

// =============================================================================
// Exports
// =============================================================================

/**
 * All abs simplification rules.
 *
 * Unconditional rules are listed first (higher priority),
 * conditional rules last.
 */
export const absRules: readonly Rule[] = [
	absNegation,
	absIdempotent,
	absProduct,
	absQuotient,
	absEvenPow,
	absPowEven,
	absPositive,
	absNegative
] as const;
