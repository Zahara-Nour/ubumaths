/**
 * Shared Simplified Constructors
 *
 * Factory functions that create MathNode expressions with basic algebraic
 * simplifications applied (identity and absorbing element elimination).
 *
 * Used by differentiation, integration, and other symbolic computation modules.
 *
 * @module mathAST/common/simplify
 */

import type { MathNode } from '../types';
import { number, add, subtract, multiply, divide, opposite, power } from '../factory';
import { isZero, isOne, isNegativeOne } from '../guards';
import { getNumericValue, numericNode } from './numeric';

// =============================================================================
// Constants
// =============================================================================

/** Create a constant 0 node */
export function zero(): MathNode {
	return number('0');
}

/** Create a constant 1 node */
export function one(): MathNode {
	return number('1');
}

/** Create a constant -1 node */
export function negativeOne(): MathNode {
	return opposite(number('1'));
}

// =============================================================================
// Simplified Constructors
// =============================================================================

/**
 * Create a simplified addition: a + b
 * - 0 + b = b
 * - a + 0 = a
 */
export function simplifiedAdd(a: MathNode, b: MathNode): MathNode {
	if (isZero(a)) return b;
	if (isZero(b)) return a;
	return add(a, b);
}

/**
 * Create a simplified subtraction: a - b
 * - 0 - b = -b
 * - a - 0 = a
 */
export function simplifiedSubtract(a: MathNode, b: MathNode): MathNode {
	if (isZero(a)) return opposite(b);
	if (isZero(b)) return a;
	return subtract(a, b);
}

/**
 * Create a simplified multiplication: a * b
 * - 0 * b = 0
 * - a * 0 = 0
 * - 1 * b = b
 * - a * 1 = a
 * - -1 * b = -b
 * - a * -1 = -a
 * - constant * constant = folded constant
 */
export function simplifiedMultiply(a: MathNode, b: MathNode): MathNode {
	if (isZero(a) || isZero(b)) return zero();
	if (isOne(a)) return b;
	if (isOne(b)) return a;
	if (isNegativeOne(a)) return opposite(b);
	if (isNegativeOne(b)) return opposite(a);

	// Simplify constant multiplication
	const aVal = getNumericValue(a);
	const bVal = getNumericValue(b);
	if (aVal !== null && bVal !== null) {
		return numericNode(aVal * bVal);
	}

	return multiply(a, b, 'implicit');
}

/**
 * Create a simplified division: a / b (as fraction)
 * - 0 / b = 0
 * - a / 1 = a
 */
export function simplifiedDivide(a: MathNode, b: MathNode): MathNode {
	if (isZero(a)) return zero();
	if (isOne(b)) return a;
	return divide(a, b, 'fraction');
}

/**
 * Create a simplified power: base^exp
 * - x^0 = 1
 * - x^1 = x
 * - 0^n = 0 (for n > 0)
 * - 1^n = 1
 */
export function simplifiedPower(base: MathNode, exp: MathNode): MathNode {
	if (isZero(exp)) return one();
	if (isOne(exp)) return base;
	if (isZero(base)) return zero();
	if (isOne(base)) return one();
	return power(base, exp);
}

/**
 * Create a simplified opposite: -x
 * - -0 = 0
 * - -(-x) = x
 */
export function simplifiedOpposite(node: MathNode): MathNode {
	if (isZero(node)) return zero();
	if (node.type === 'opposite') return node.operand;
	return opposite(node);
}
