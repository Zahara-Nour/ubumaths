/**
 * Shared Numeric Evaluation Utilities
 *
 * Common functions for evaluating MathNode expressions numerically.
 *
 * @module mathAST/common/numeric
 */

import type { MathNode } from '../types';
import { isNumber } from '../guards';
import { number, opposite } from '../factory';

/**
 * Get numeric value from a MathNode if it's a number or opposite(number).
 *
 * @param node - The MathNode to extract a numeric value from
 * @returns The numeric value or null if not a number
 *
 * @example
 * getNumericValue(number('3'))           // 3
 * getNumericValue(opposite(number('5'))) // -5
 * getNumericValue(variable('x'))         // null
 */
export function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return Number.isFinite(val) ? val : null;
	}
	if (node.type === 'opposite' && isNumber(node.operand)) {
		const val = parseFloat(node.operand.value);
		return Number.isFinite(val) ? -val : null;
	}
	return null;
}

/**
 * Create a MathNode from a numeric value (or pre-formatted numeric string).
 * Negative values (or strings starting with '-') are wrapped in opposite().
 * Strings starting with '+' have the prefix stripped.
 *
 * Accepts a string variant to preserve formatting from `.toFixed(n)` /
 * `.toPrecision(n)` / `.toExponential(n)` without reparsing through Number.
 *
 * @param value - The numeric value (number) or pre-formatted decimal (string)
 * @returns A MathNode representing the value (canonical: positive number, or opposite of positive)
 *
 * @example
 * numericNode(3)              // number('3')
 * numericNode(-5)             // opposite(number('5'))
 * numericNode('3.14')         // number('3.14')
 * numericNode('-2.5000000000') // opposite(number('2.5000000000'))   (preserves trailing zeros)
 */
export function numericNode(value: number | string): MathNode {
	if (typeof value === 'number') {
		if (value < 0) {
			return opposite(number(Math.abs(value).toString()));
		}
		return number(value.toString());
	}
	if (value.length > 0) {
		if (value[0] === '-') {
			return opposite(number(value.slice(1)));
		}
		if (value[0] === '+') {
			return number(value.slice(1));
		}
	}
	return number(value);
}

/**
 * Recursively evaluate an expression numerically with variable substitution.
 *
 * Supports basic arithmetic operations, powers, and common mathematical functions.
 * Returns null for expressions that cannot be evaluated (e.g., unknown variables,
 * unsupported functions, or undefined operations).
 *
 * @param expr - The expression to evaluate
 * @param varName - The variable name to substitute
 * @param varValue - The value to substitute for the variable
 * @returns The numeric result or null if evaluation fails
 *
 * @example
 * // Evaluate x^2 + 1 at x = 3
 * evaluateNumeric(parseExpression('x^2 + 1'), 'x', 3) // 10
 */
export function evaluateNumeric(expr: MathNode, varName: string, varValue: number): number | null {
	switch (expr.type) {
		case 'number': {
			const val = parseFloat(expr.value);
			return Number.isFinite(val) ? val : null;
		}

		case 'variable':
			return expr.name === varName ? varValue : null;

		case 'addition': {
			const left = evaluateNumeric(expr.left, varName, varValue);
			const right = evaluateNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left + right;
		}

		case 'subtraction': {
			const left = evaluateNumeric(expr.left, varName, varValue);
			const right = evaluateNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left - right;
		}

		case 'multiplication': {
			const left = evaluateNumeric(expr.left, varName, varValue);
			const right = evaluateNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left * right;
		}

		case 'division': {
			const num = evaluateNumeric(expr.numerator, varName, varValue);
			const den = evaluateNumeric(expr.denominator, varName, varValue);
			if (num === null || den === null) return null;
			if (den === 0) {
				// Return signed infinity based on numerator sign
				return num > 0 ? Infinity : num < 0 ? -Infinity : null;
			}
			return num / den;
		}

		case 'opposite': {
			const operand = evaluateNumeric(expr.operand, varName, varValue);
			return operand !== null ? -operand : null;
		}

		case 'positive':
			return evaluateNumeric(expr.operand, varName, varValue);

		case 'superscript': {
			const base = evaluateNumeric(expr.base, varName, varValue);
			const exp = evaluateNumeric(expr.superscript, varName, varValue);
			if (base === null || exp === null) return null;
			const result = Math.pow(base, exp);
			return Number.isFinite(result) || result === Infinity || result === -Infinity ? result : null;
		}

		case 'function': {
			if (expr.args.length === 1) {
				const arg = evaluateNumeric(expr.args[0], varName, varValue);
				if (arg === null) return null;

				switch (expr.name.toLowerCase()) {
					case 'sin':
						return Math.sin(arg);
					case 'cos':
						return Math.cos(arg);
					case 'tan':
						return Math.tan(arg);
					case 'exp':
						return Math.exp(arg);
					case 'ln':
						return arg > 0 ? Math.log(arg) : arg === 0 ? -Infinity : null;
					case 'sqrt':
						return arg >= 0 ? Math.sqrt(arg) : null;
					case 'abs':
						return Math.abs(arg);
					case 'arcsin':
						return arg >= -1 && arg <= 1 ? Math.asin(arg) : null;
					case 'arccos':
						return arg >= -1 && arg <= 1 ? Math.acos(arg) : null;
					case 'arctan':
						return Math.atan(arg);
					case 'floor':
						return Math.floor(arg);
					case 'ceil':
						return Math.ceil(arg);
					case 'sign':
					case 'sgn':
						return Math.sign(arg);
					default:
						return null;
				}
			}
			return null;
		}

		case 'delimiter':
			return evaluateNumeric(expr.content, varName, varValue);

		default:
			return null;
	}
}

/**
 * Evaluate an expression with a substitution (convenience wrapper).
 *
 * @param expr - The expression to evaluate
 * @param varName - The variable name to substitute
 * @param value - The value to substitute
 * @returns The numeric result or null
 */
export function evaluateWithSubstitution(
	expr: MathNode,
	varName: string,
	value: number
): number | null {
	return evaluateNumeric(expr, varName, value);
}
