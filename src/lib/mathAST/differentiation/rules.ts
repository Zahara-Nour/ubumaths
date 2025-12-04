/**
 * MathAST Differentiation Rules
 *
 * Pure functions implementing differentiation rules for various mathematical
 * expressions. These are internal helper functions used by the main
 * differentiate function.
 *
 * @module mathAST/differentiation/rules
 */

import type { MathNode } from '../types';
import {
	number,
	add,
	subtract,
	multiply,
	divide,
	opposite,
	power,
	func,
	ln,
	cos,
	sin,
	parentheses
} from '../factory';
import { isNumber } from '../guards';

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

/**
 * Create a constant -1 node
 */
export function negativeOne(): MathNode {
	return opposite(number('1'));
}

// =============================================================================
// Simplification Helpers
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
 * Check if a node represents negative one (-1)
 */
export function isNegativeOne(node: MathNode): boolean {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return val === -1;
	}
	if (node.type === 'opposite' && isNumber(node.operand)) {
		const val = parseFloat(node.operand.value);
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

// =============================================================================
// Basic Differentiation Rules
// =============================================================================

/**
 * Constant rule: d/dx(c) = 0
 * where c is any expression not containing the differentiation variable
 */
export function constantRule(): MathNode {
	return zero();
}

/**
 * Variable rule: d/dx(x) = 1, d/dx(y) = 0
 * Returns 1 if the variable matches the differentiation variable, 0 otherwise
 */
export function variableRule(varName: string, diffVar: string): MathNode {
	return varName === diffVar ? one() : zero();
}

/**
 * Greek letter rule: d/dx(alpha) = 0
 * Greek letters are treated as constants
 */
export function greekLetterRule(): MathNode {
	return zero();
}

// =============================================================================
// Sum and Difference Rules
// =============================================================================

/**
 * Sum rule: d/dx(f + g) = f' + g'
 */
export function sumRule(df: MathNode, dg: MathNode, simplify: boolean): MathNode {
	if (simplify) {
		return simplifiedAdd(df, dg);
	}
	return add(df, dg);
}

/**
 * Difference rule: d/dx(f - g) = f' - g'
 */
export function differenceRule(df: MathNode, dg: MathNode, simplify: boolean): MathNode {
	if (simplify) {
		return simplifiedSubtract(df, dg);
	}
	return subtract(df, dg);
}

// =============================================================================
// Product and Quotient Rules
// =============================================================================

/**
 * Product rule: d/dx(f * g) = f' * g + f * g'
 */
export function productRule(
	f: MathNode,
	g: MathNode,
	df: MathNode,
	dg: MathNode,
	simplify: boolean
): MathNode {
	if (simplify) {
		const term1 = simplifiedMultiply(df, g);
		const term2 = simplifiedMultiply(f, dg);
		return simplifiedAdd(term1, term2);
	}
	const term1 = multiply(df, g, 'implicit');
	const term2 = multiply(f, dg, 'implicit');
	return add(term1, term2);
}

/**
 * Quotient rule: d/dx(f / g) = (f' * g - f * g') / g^2
 */
export function quotientRule(
	f: MathNode,
	g: MathNode,
	df: MathNode,
	dg: MathNode,
	simplify: boolean
): MathNode {
	if (simplify) {
		const term1 = simplifiedMultiply(df, g);
		const term2 = simplifiedMultiply(f, dg);
		const numerator = simplifiedSubtract(term1, term2);
		const denominator = simplifiedPower(g, number('2'));
		return simplifiedDivide(numerator, denominator);
	}
	const term1 = multiply(df, g, 'implicit');
	const term2 = multiply(f, dg, 'implicit');
	const numerator = subtract(term1, term2);
	const denominator = power(g, number('2'));
	return divide(numerator, denominator, 'fraction');
}

// =============================================================================
// Power Rules
// =============================================================================

/**
 * Power rule for constant exponent: d/dx(f^n) = n * f^(n-1) * f'
 */
export function powerRuleConstantExp(
	base: MathNode,
	exp: MathNode,
	dBase: MathNode,
	simplify: boolean
): MathNode {
	const expVal = getNumericValue(exp);

	if (simplify) {
		// Handle special cases
		if (expVal === 0) return zero(); // d/dx(f^0) = d/dx(1) = 0
		if (expVal === 1) return dBase; // d/dx(f^1) = f'

		// n * f^(n-1) * f'
		const newExp = expVal !== null ? numericNode(expVal - 1) : subtract(exp, one());

		const coeff = exp;
		const powerTerm = simplifiedPower(base, newExp);
		return simplifiedMultiply(simplifiedMultiply(coeff, powerTerm), dBase);
	}

	// Non-simplified version
	const newExp = isNumber(exp)
		? number((parseFloat(exp.value) - 1).toString())
		: subtract(exp, one());

	const coeff = exp;
	const powerTerm = power(base, newExp);
	return multiply(multiply(coeff, powerTerm, 'implicit'), dBase, 'implicit');
}

/**
 * General power rule: d/dx(f^g) = f^g * (g' * ln(f) + g * f'/f)
 * This handles both cases: f(x)^n and f(x)^g(x)
 */
export function generalPowerRule(
	base: MathNode,
	exp: MathNode,
	dBase: MathNode,
	dExp: MathNode,
	simplify: boolean
): MathNode {
	// If exponent derivative is 0, use simpler constant exponent rule
	if (isZero(dExp)) {
		return powerRuleConstantExp(base, exp, dBase, simplify);
	}

	// If base derivative is 0, use exponential rule: d/dx(a^g) = a^g * ln(a) * g'
	if (isZero(dBase)) {
		if (simplify) {
			const powerTerm = simplifiedPower(base, exp);
			const lnTerm = ln(base);
			return simplifiedMultiply(simplifiedMultiply(powerTerm, lnTerm), dExp);
		}
		const powerTerm = power(base, exp);
		const lnTerm = ln(base);
		return multiply(multiply(powerTerm, lnTerm, 'implicit'), dExp, 'implicit');
	}

	// Full general power rule: f^g * (g' * ln(f) + g * f'/f)
	if (simplify) {
		const powerTerm = simplifiedPower(base, exp);
		const lnTerm = ln(base);
		const term1 = simplifiedMultiply(dExp, lnTerm);
		const term2 = simplifiedMultiply(exp, simplifiedDivide(dBase, base));
		const bracketContent = simplifiedAdd(term1, term2);
		return simplifiedMultiply(powerTerm, parentheses(bracketContent));
	}

	const powerTerm = power(base, exp);
	const lnTerm = ln(base);
	const term1 = multiply(dExp, lnTerm, 'implicit');
	const term2 = multiply(exp, divide(dBase, base, 'fraction'), 'implicit');
	const bracketContent = add(term1, term2);
	return multiply(powerTerm, parentheses(bracketContent), 'implicit');
}

// =============================================================================
// Negation Rule
// =============================================================================

/**
 * Negation rule: d/dx(-f) = -f'
 */
export function negationRule(df: MathNode, simplify: boolean): MathNode {
	if (simplify) {
		return simplifiedOpposite(df);
	}
	return opposite(df);
}

// =============================================================================
// Transcendental Function Rules (with chain rule built-in)
// =============================================================================

/**
 * Sine rule: d/dx(sin(u)) = cos(u) * u'
 */
export function sinRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	if (simplify) {
		return simplifiedMultiply(cos(u), du);
	}
	return multiply(cos(u), du, 'implicit');
}

/**
 * Cosine rule: d/dx(cos(u)) = -sin(u) * u'
 */
export function cosRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	if (simplify) {
		return simplifiedMultiply(simplifiedOpposite(sin(u)), du);
	}
	return multiply(opposite(sin(u)), du, 'implicit');
}

/**
 * Tangent rule: d/dx(tan(u)) = (1/cos^2(u)) * u' = sec^2(u) * u'
 */
export function tanRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	// Using 1/cos^2(u) instead of sec^2(u) for compatibility
	const cosSquared = simplify ? simplifiedPower(cos(u), number('2')) : power(cos(u), number('2'));

	const secSquared = simplify
		? simplifiedDivide(one(), cosSquared)
		: divide(one(), cosSquared, 'fraction');

	if (simplify) {
		return simplifiedMultiply(secSquared, du);
	}
	return multiply(secSquared, du, 'implicit');
}

/**
 * Natural logarithm rule: d/dx(ln(u)) = u'/u
 */
export function lnRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	if (simplify) {
		return simplifiedDivide(du, u);
	}
	return divide(du, u, 'fraction');
}

/**
 * Logarithm with base rule: d/dx(log_b(u)) = u'/(u * ln(b))
 */
export function logRule(u: MathNode, base: MathNode, du: MathNode, simplify: boolean): MathNode {
	const lnBase = ln(base);

	if (simplify) {
		const denominator = simplifiedMultiply(u, lnBase);
		return simplifiedDivide(du, denominator);
	}
	const denominator = multiply(u, lnBase, 'implicit');
	return divide(du, denominator, 'fraction');
}

/**
 * Exponential rule: d/dx(exp(u)) = exp(u) * u'
 */
export function expRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const expU = func('exp', [u]);

	if (simplify) {
		return simplifiedMultiply(expU, du);
	}
	return multiply(expU, du, 'implicit');
}

/**
 * Square root rule: d/dx(sqrt(u)) = u' / (2 * sqrt(u))
 */
export function sqrtRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const sqrtU = func('sqrt', [u]);

	if (simplify) {
		const denominator = simplifiedMultiply(number('2'), sqrtU);
		return simplifiedDivide(du, denominator);
	}
	const denominator = multiply(number('2'), sqrtU, 'implicit');
	return divide(du, denominator, 'fraction');
}

// =============================================================================
// Inverse Trigonometric Rules
// =============================================================================

/**
 * Arcsine rule: d/dx(arcsin(u)) = u' / sqrt(1 - u^2)
 */
export function arcsinRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const uSquared = simplify ? simplifiedPower(u, number('2')) : power(u, number('2'));
	const oneMinusUSquared = simplify
		? simplifiedSubtract(one(), uSquared)
		: subtract(one(), uSquared);
	const sqrtTerm = func('sqrt', [oneMinusUSquared]);

	if (simplify) {
		return simplifiedDivide(du, sqrtTerm);
	}
	return divide(du, sqrtTerm, 'fraction');
}

/**
 * Arccosine rule: d/dx(arccos(u)) = -u' / sqrt(1 - u^2)
 */
export function arccosRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const uSquared = simplify ? simplifiedPower(u, number('2')) : power(u, number('2'));
	const oneMinusUSquared = simplify
		? simplifiedSubtract(one(), uSquared)
		: subtract(one(), uSquared);
	const sqrtTerm = func('sqrt', [oneMinusUSquared]);

	if (simplify) {
		return simplifiedOpposite(simplifiedDivide(du, sqrtTerm));
	}
	return opposite(divide(du, sqrtTerm, 'fraction'));
}

/**
 * Arctangent rule: d/dx(arctan(u)) = u' / (1 + u^2)
 */
export function arctanRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const uSquared = simplify ? simplifiedPower(u, number('2')) : power(u, number('2'));
	const onePlusUSquared = simplify ? simplifiedAdd(one(), uSquared) : add(one(), uSquared);

	if (simplify) {
		return simplifiedDivide(du, onePlusUSquared);
	}
	return divide(du, onePlusUSquared, 'fraction');
}

// =============================================================================
// Hyperbolic Function Rules
// =============================================================================

/**
 * Hyperbolic sine rule: d/dx(sinh(u)) = cosh(u) * u'
 */
export function sinhRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const coshU = func('cosh', [u]);

	if (simplify) {
		return simplifiedMultiply(coshU, du);
	}
	return multiply(coshU, du, 'implicit');
}

/**
 * Hyperbolic cosine rule: d/dx(cosh(u)) = sinh(u) * u'
 */
export function coshRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const sinhU = func('sinh', [u]);

	if (simplify) {
		return simplifiedMultiply(sinhU, du);
	}
	return multiply(sinhU, du, 'implicit');
}

/**
 * Hyperbolic tangent rule: d/dx(tanh(u)) = (1/cosh^2(u)) * u' = sech^2(u) * u'
 */
export function tanhRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	const coshU = func('cosh', [u]);
	const coshSquared = simplify ? simplifiedPower(coshU, number('2')) : power(coshU, number('2'));
	const sechSquared = simplify
		? simplifiedDivide(one(), coshSquared)
		: divide(one(), coshSquared, 'fraction');

	if (simplify) {
		return simplifiedMultiply(sechSquared, du);
	}
	return multiply(sechSquared, du, 'implicit');
}

// =============================================================================
// Check if expression contains variable
// =============================================================================

/**
 * Check if an expression contains the given variable
 * Used to determine if chain rule is needed
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

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}
