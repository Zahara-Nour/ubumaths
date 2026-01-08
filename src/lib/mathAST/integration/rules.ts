/**
 * MathAST Integration Rules
 *
 * Pure functions implementing basic integration rules for various mathematical
 * expressions. These are internal helper functions used by integrators.
 *
 * @module mathAST/integration/rules
 */

import type { MathNode } from '../types';
import {
	number,
	add,
	multiply,
	divide,
	opposite,
	power,
	func,
	ln,
	cos,
	sin,
	variable
} from '../factory';
import { isNumber, isVariable } from '../guards';

// =============================================================================
// Constants
// =============================================================================

/**
 * Create a constant 0 node
 */
export function zero(): MathNode {
	return number('0');
}

/**
 * Create a constant 1 node
 */
export function one(): MathNode {
	return number('1');
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * Check if a node represents numeric zero
 */
export function isZero(node: MathNode): boolean {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return val === 0;
	}
	return false;
}

/**
 * Check if a node represents numeric one
 */
export function isOne(node: MathNode): boolean {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return val === 1;
	}
	return false;
}

/**
 * Get numeric value from a node if it's a constant number
 */
export function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}
	if (node.type === 'opposite' && isNumber(node.operand)) {
		return -parseFloat(node.operand.value);
	}
	return null;
}

/**
 * Create a number node from a numeric value
 */
export function numericNode(value: number): MathNode {
	if (value < 0) {
		return opposite(number(Math.abs(value).toString()));
	}
	return number(value.toString());
}

// =============================================================================
// Simplified Constructors (with basic algebraic simplifications)
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
 * Create a simplified multiplication: a * b
 * - 0 * b = 0
 * - a * 0 = 0
 * - 1 * b = b
 * - a * 1 = a
 */
export function simplifiedMultiply(a: MathNode, b: MathNode): MathNode {
	if (isZero(a) || isZero(b)) return zero();
	if (isOne(a)) return b;
	if (isOne(b)) return a;

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
// Variable Detection
// =============================================================================

/**
 * Check if an expression contains the given variable
 */
export function containsVariable(node: MathNode, varName: string): boolean {
	switch (node.type) {
		case 'number':
		case 'symbol':
		case 'hole':
			return false;

		case 'variable':
			return node.name === varName;

		case 'greek':
			return false; // Greek letters are treated as constants

		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return containsVariable(node.left, varName) || containsVariable(node.right, varName);

		case 'division':
			return (
				containsVariable(node.numerator, varName) || containsVariable(node.denominator, varName)
			);

		case 'opposite':
		case 'positive':
			return containsVariable(node.operand, varName);

		case 'function':
			return (
				node.args.some((arg) => containsVariable(arg, varName)) ||
				(node.power !== undefined && containsVariable(node.power, varName)) ||
				(node.base !== undefined && containsVariable(node.base, varName))
			);

		case 'delimiter':
			return containsVariable(node.content, varName);

		case 'subscript':
			return containsVariable(node.base, varName) || containsVariable(node.subscript, varName);

		case 'superscript':
			return containsVariable(node.base, varName) || containsVariable(node.superscript, varName);

		case 'relation':
			return containsVariable(node.left, varName) || containsVariable(node.right, varName);

		case 'unit':
			return containsVariable(node.expression, varName);

		case 'composition':
			return containsVariable(node.outer, varName) || containsVariable(node.inner, varName);

		case 'matrix':
			return node.rows.some((row) => row.some((elem) => containsVariable(elem, varName)));

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}
