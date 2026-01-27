/**
 * Arithmetic Simplification Rules using Pattern Matching
 *
 * Provides a set of rules for simplifying basic arithmetic expressions.
 * These rules cover identity elements, zero properties, and common
 * algebraic simplifications.
 *
 * @example
 * ```typescript
 * import { arithmeticRules } from './arithmetic';
 * import { applyRules } from '../rule';
 *
 * const node = add(variable('x'), number('0'));
 * const simplified = applyRules(arithmeticRules, node);
 * // simplified is now variable('x')
 * ```
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule, MatchBindings } from '../types';
import { isMathNodeBinding } from '../types';
import { opposite } from '../../factory';

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
// Arithmetic Rules
// =============================================================================

/**
 * Arithmetic simplification rules.
 *
 * Rules included:
 * - 0 + x = x (additive identity, left)
 * - x + 0 = x (additive identity, right)
 * - x - 0 = x (subtractive identity)
 * - 0 - x = -x (zero minus)
 * - 1 * x = x (multiplicative identity, left)
 * - x * 1 = x (multiplicative identity, right)
 * - 0 * x = 0 (multiplicative zero, left)
 * - x * 0 = 0 (multiplicative zero, right)
 * - x / 1 = x (division by one)
 * - 0 / x = 0 (zero divided, x != 0)
 * - x / x = 1 (self division, x != 0)
 * - --x = x (double negation)
 * - x - x = 0 (self subtraction)
 * - +x = x (positive sign is identity)
 */
export const arithmeticRules: readonly Rule[] = [
	// ---------------------------------------------------------------------------
	// Addition Rules
	// ---------------------------------------------------------------------------

	// 0 + x = x (additive identity, left)
	createRule(P.add(P.num(0), P._('x')), P._('x'), {
		name: 'add-zero-left'
	}),

	// x + 0 = x (additive identity, right)
	createRule(P.add(P._('x'), P.num(0)), P._('x'), {
		name: 'add-zero-right'
	}),

	// ---------------------------------------------------------------------------
	// Subtraction Rules
	// ---------------------------------------------------------------------------

	// x - 0 = x (subtractive identity)
	createRule(P.sub(P._('x'), P.num(0)), P._('x'), {
		name: 'sub-zero'
	}),

	// 0 - x = -x (zero minus - function replacement)
	createRule(
		P.sub(P.num(0), P._('x')),
		(bindings: MatchBindings) => {
			const x = bindings.get('x');
			if (!x || !isMathNodeBinding(x)) {
				throw new Error('Expected MathNode binding for x');
			}
			return opposite(x);
		},
		{
			name: 'zero-sub'
		}
	),

	// x - x = 0 (self subtraction)
	createRule(P.sub(P._('x'), P._('x')), P.num(0), {
		name: 'sub-self'
	}),

	// ---------------------------------------------------------------------------
	// Multiplication Rules
	// ---------------------------------------------------------------------------

	// 1 * x = x (multiplicative identity, left)
	createRule(P.mul(P.num(1), P._('x')), P._('x'), {
		name: 'mul-one-left'
	}),

	// x * 1 = x (multiplicative identity, right)
	createRule(P.mul(P._('x'), P.num(1)), P._('x'), {
		name: 'mul-one-right'
	}),

	// 0 * x = 0 (multiplicative zero, left)
	// Higher priority because it completely eliminates expressions
	createRule(P.mul(P.num(0), P._('x')), P.num(0), {
		name: 'mul-zero-left',
		priority: 1
	}),

	// x * 0 = 0 (multiplicative zero, right)
	createRule(P.mul(P._('x'), P.num(0)), P.num(0), {
		name: 'mul-zero-right',
		priority: 1
	}),

	// ---------------------------------------------------------------------------
	// Division Rules
	// ---------------------------------------------------------------------------

	// x / 1 = x (division by one)
	createRule(P.div(P._('x'), P.num(1)), P._('x'), {
		name: 'div-one'
	}),

	// 0 / x = 0 (zero divided, where x is nonzero)
	createRule(P.div(P.num(0), P._('x', P.isNonzero())), P.num(0), {
		name: 'zero-div'
	}),

	// x / x = 1 (self division, where x is nonzero)
	// Uses condition to check that x is not the literal 0
	createRule(P.div(P._('x'), P._('x')), P.num(1), {
		name: 'div-self',
		condition: isNotZero
	}),

	// ---------------------------------------------------------------------------
	// Unary Rules
	// ---------------------------------------------------------------------------

	// --x = x (double negation)
	createRule(P.neg(P.neg(P._('x'))), P._('x'), {
		name: 'double-neg'
	}),

	// +x = x (positive sign is identity)
	createRule(P.pos(P._('x')), P._('x'), {
		name: 'positive-identity'
	})
] as const;
