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
 * - |x|^n = x^n (n even)
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

	// |x|^n = x^n (when n is even, both sides are non-negative)
	createRule(P.pow(P.func('abs', [P._('x')]), P._('n', P.isEven())), P.pow(P._('x'), P._('n')), {
		name: 'abs-pow-even'
	})
] as const;
