/**
 * Variable detection utility for MathNode trees
 *
 * @module mathAST/common/contains-variable
 */

import type { MathNode } from '../types';

/**
 * Check if an expression contains the given variable
 */
export function containsVariable(node: MathNode, varName: string): boolean {
	switch (node.type) {
		case 'number':
		case 'symbol':
		case 'hole':
		case 'constant':
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

		case 'complex':
			return containsVariable(node.real, varName) || containsVariable(node.imaginary, varName);

		case 'infinity':
			return false;

		case 'limit':
			return containsVariable(node.expression, varName) || containsVariable(node.approach, varName);

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}
