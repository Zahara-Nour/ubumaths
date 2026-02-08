/**
 * Power/Exponent Simplification Rules using Pattern Matching
 *
 * Provides a set of rules for simplifying power (exponent) expressions.
 * These rules cover basic exponent properties.
 *
 * @example
 * ```typescript
 * import { powerRules } from './powers';
 * import { applyRules } from '../rule';
 *
 * const node = superscript(variable('x'), number('1'));
 * const simplified = applyRules(powerRules, node);
 * // simplified is now variable('x')
 * ```
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule, MatchBindings } from '../types';
import { isMathNodeBinding } from '../types';

// =============================================================================
// Helper Conditions
// =============================================================================

/**
 * Condition: The bound value 'x' is not the number 0.
 */
function isNotZero(bindings: MatchBindings): boolean {
	const x = bindings.get('x');
	if (!x || !isMathNodeBinding(x)) return true;
	return !(x.type === 'number' && x.value === '0');
}

// =============================================================================
// Power Rules
// =============================================================================

/**
 * Power/exponent simplification rules.
 *
 * Rules included:
 * - x^1 = x (power of one)
 * - x^0 = 1 (power of zero, x != 0)
 * - 1^x = 1 (one to any power)
 * - 0^x = 0 (zero to positive power)
 * - (-1)^n = 1 (n even), (-1)^n = -1 (n odd)
 * - (-a)^n = a^n (n even)
 * - (-a)^n = -(a^n) (n odd)
 * - sqrt(x^2) = |x|
 * - (sqrt(x))^2 = x
 * - (a^m)^n = a^(m*n) (power of power)
 * - a^m * a^n = a^(m+n) (same base product)
 * - (a/b)^n = a^n / b^n (power of quotient)
 * - x^(-1) = 1/x (negative one exponent)
 */
export const powerRules: readonly Rule[] = [
	// x^1 = x (power of one)
	createRule(P.pow(P._('x'), P.num(1)), P._('x'), {
		name: 'pow-one'
	}),

	// x^0 = 1 (power of zero, where x is nonzero)
	// Uses condition to prevent 0^0 which is undefined
	createRule(P.pow(P._('x'), P.num(0)), P.num(1), {
		name: 'pow-zero',
		condition: isNotZero
	}),

	// 1^x = 1 (one to any power)
	createRule(P.pow(P.num(1), P._('x')), P.num(1), {
		name: 'one-pow'
	}),

	// 0^x = 0 (zero to positive power)
	// Uses isPositive constraint to ensure exponent is positive
	createRule(P.pow(P.num(0), P._('x', P.isPositive())), P.num(0), {
		name: 'zero-pow'
	}),

	// (-1)^n = 1 (when n is even)
	createRule(P.pow(P.neg(P.num(1)), P._('n', P.isEven())), P.num(1), {
		name: 'neg-one-pow-even'
	}),

	// (-1)^n = -1 (when n is odd)
	createRule(P.pow(P.neg(P.num(1)), P._('n', P.isOdd())), P.neg(P.num(1)), {
		name: 'neg-one-pow-odd'
	}),

	// (-a)^n = a^n (when n is even, sign cancels)
	createRule(P.pow(P.neg(P._('a')), P._('n', P.isEven())), P.pow(P._('a'), P._('n')), {
		name: 'neg-base-pow-even'
	}),

	// (-a)^n = -(a^n) (when n is odd, sign passes through)
	createRule(P.pow(P.neg(P._('a')), P._('n', P.isOdd())), P.neg(P.pow(P._('a'), P._('n'))), {
		name: 'neg-base-pow-odd'
	}),

	// sqrt(x^2) = |x|
	createRule(P.func('sqrt', [P.pow(P._('x'), P.num(2))]), P.func('abs', [P._('x')]), {
		name: 'sqrt-square'
	}),

	// (sqrt(x))^2 = x (squaring undoes square root; x >= 0 implied by sqrt)
	createRule(P.pow(P.func('sqrt', [P._('x')]), P.num(2)), P._('x'), {
		name: 'square-sqrt'
	}),

	// (a^m)^n = a^(m*n) (power of a power)
	createRule(
		P.pow(P.pow(P._('a'), P._('m')), P._('n')),
		P.pow(P._('a'), P.mul(P._('m'), P._('n'))),
		{ name: 'pow-of-pow' }
	),

	// a^m * a^n = a^(m+n) (same base, sum of exponents)
	createRule(
		P.mul(P.pow(P._('a'), P._('m')), P.pow(P._('a'), P._('n'))),
		P.pow(P._('a'), P.add(P._('m'), P._('n'))),
		{ name: 'same-base-mul' }
	),

	// (a/b)^n = a^n / b^n (power distributes over quotient)
	createRule(
		P.pow(P.div(P._('a'), P._('b')), P._('n')),
		P.div(P.pow(P._('a'), P._('n')), P.pow(P._('b'), P._('n'))),
		{ name: 'pow-of-quotient' }
	),

	// x^(-1) = 1/x (reciprocal)
	createRule(P.pow(P._('x'), P.neg(P.num(1))), P.div(P.num(1), P._('x')), {
		name: 'pow-neg-one'
	})
] as const;
