/**
 * MathAST Integration Rules
 *
 * Pure functions implementing basic integration rules for various mathematical
 * expressions. These are internal helper functions used by integrators.
 *
 * @module mathAST/integration/rules
 */

import type { MathNode } from '../types';
import { add, opposite, func, ln, cos, sin, variable } from '../factory';
import { isNumber, isVariable, isZero, isOne } from '../guards';
import { getNumericValue, numericNode } from '../common/numeric';
import {
	zero,
	one,
	simplifiedAdd,
	simplifiedMultiply,
	simplifiedDivide,
	simplifiedPower
} from '../common/simplify';
import { containsVariable } from '../common/contains-variable';

// Re-export for backward compatibility (used by integrators and tests)
export {
	containsVariable,
	getNumericValue,
	numericNode,
	zero,
	one,
	simplifiedAdd,
	simplifiedMultiply,
	simplifiedDivide,
	simplifiedPower
};

// =============================================================================
// Basic Integration Rules
// =============================================================================

/**
 * Power rule: ∫ x^n dx = x^(n+1)/(n+1) for n ≠ -1
 *
 * @param base - The base (typically x or variable)
 * @param exp - The exponent n
 * @param varName - The variable of integration
 * @returns The antiderivative x^(n+1)/(n+1)
 */
export function powerRule(base: MathNode, exp: MathNode, varName: string): MathNode {
	// Get numeric value of exponent
	const n = getNumericValue(exp);

	// Special case: x^0 = 1 integrates to x
	if (n === 0) {
		return variable(varName);
	}

	// Compute n + 1
	let newExp: MathNode;
	if (n !== null) {
		newExp = numericNode(n + 1);
	} else {
		newExp = add(exp, one());
	}

	// Compute x^(n+1)
	const numerator = simplifiedPower(base, newExp);

	// Result: x^(n+1) / (n+1)
	return simplifiedDivide(numerator, newExp);
}

/**
 * Constant rule: ∫ c dx = c*x
 *
 * @param constant - The constant value
 * @param varName - The variable of integration
 * @returns c*x
 */
export function constantRule(constant: MathNode, varName: string): MathNode {
	// Special cases
	if (isZero(constant)) return zero();
	if (isOne(constant)) return variable(varName);

	// General case: c * x
	return simplifiedMultiply(constant, variable(varName));
}

/**
 * Natural logarithm rule: ∫ 1/x dx = ln|x|
 *
 * @param base - The argument (typically x)
 * @returns ln|x|
 */
export function lnAbsRule(base: MathNode): MathNode {
	// We use ln(abs(x)) to handle negative values
	const absBase = func('abs', [base]);
	return ln(absBase);
}

/**
 * Exponential rule: ∫ e^(ax) dx = e^(ax)/a
 *
 * Special case: ∫ e^x dx = e^x (when a=1)
 *
 * @param exponent - The exponent (e.g., x or ax)
 * @returns The antiderivative
 */
export function expRule(exponent: MathNode): MathNode {
	// Check if exponent is a constant multiple: a*x
	if (exponent.type === 'multiplication' && isNumber(exponent.left)) {
		// ∫ e^(ax) dx = e^(ax)/a
		const a = exponent.left;
		const expFunc = func('exp', [exponent]);
		return simplifiedDivide(expFunc, a);
	}

	// Check if exponent is -x (opposite node)
	if (exponent.type === 'opposite' && isVariable(exponent.operand)) {
		// ∫ e^(-x) dx = e^(-x)/(-1) = -e^(-x)
		const expFunc = func('exp', [exponent]);
		return opposite(expFunc);
	}

	// Check if exponent is just the variable: e^x
	if (isVariable(exponent)) {
		// ∫ e^x dx = e^x
		return func('exp', [exponent]);
	}

	// General case: assume coefficient is 1
	return func('exp', [exponent]);
}

/**
 * Sine rule: ∫ sin(x) dx = -cos(x)
 *
 * @param arg - The argument of sine (typically x)
 * @returns -cos(arg)
 */
export function sinRule(arg: MathNode): MathNode {
	return opposite(cos(arg));
}

/**
 * Cosine rule: ∫ cos(x) dx = sin(x)
 *
 * @param arg - The argument of cosine (typically x)
 * @returns sin(arg)
 */
export function cosRule(arg: MathNode): MathNode {
	return sin(arg);
}

/**
 * Tangent rule: ∫ tan(x) dx = -ln|cos(x)|
 *
 * @param arg - The argument of tangent (typically x)
 * @returns -ln|cos(arg)|
 */
export function tanRule(arg: MathNode): MathNode {
	const cosArg = cos(arg);
	const absCos = func('abs', [cosArg]);
	return opposite(ln(absCos));
}

// =============================================================================
// Inverse Trigonometric Integration Rules
// =============================================================================

/**
 * Arctangent rule: ∫ 1/(a²+x²) dx = (1/a)·arctan(x/a)
 *
 * Special case: ∫ 1/(1+x²) dx = arctan(x) (when a=1)
 *
 * @param varNode - The variable (x)
 * @param a - The constant a (or null/undefined for a=1)
 * @returns The antiderivative
 */
export function arctanRule(varNode: MathNode, a?: MathNode | null): MathNode {
	// Special case: a = 1, so ∫ 1/(1+x²) dx = arctan(x)
	if (!a || isOne(a)) {
		return func('arctan', [varNode]);
	}

	// General case: ∫ 1/(a²+x²) dx = (1/a)·arctan(x/a)
	const xOverA = simplifiedDivide(varNode, a);
	const arctan = func('arctan', [xOverA]);
	return simplifiedDivide(arctan, a);
}

/**
 * Arcsine rule: ∫ 1/√(a²-x²) dx = arcsin(x/a)
 *
 * Special case: ∫ 1/√(1-x²) dx = arcsin(x) (when a=1)
 *
 * @param varNode - The variable (x)
 * @param a - The constant a (or null/undefined for a=1)
 * @returns The antiderivative
 */
export function arcsinRule(varNode: MathNode, a?: MathNode | null): MathNode {
	// Special case: a = 1, so ∫ 1/√(1-x²) dx = arcsin(x)
	if (!a || isOne(a)) {
		return func('arcsin', [varNode]);
	}

	// General case: ∫ 1/√(a²-x²) dx = arcsin(x/a)
	const xOverA = simplifiedDivide(varNode, a);
	return func('arcsin', [xOverA]);
}
