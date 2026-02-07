/**
 * Cost Function for Expression Simplification
 *
 * Assigns a numeric cost to a MathNode tree. Lower cost = simpler expression.
 * Used to compare equivalent forms and choose the "most simplified" one.
 *
 * Inspired by Compute Engine / Mathematica cost heuristics.
 *
 * @module mathAST/simplify/cost
 */

import type { MathNode } from '../types';
import { getChildren } from '../transforms';

// =============================================================================
// Number Cost
// =============================================================================

/**
 * Cost of a number literal based on digit count.
 * Longer numbers are penalized.
 */
function numberCost(value: string): number {
	const digits = value.replace(/[^0-9]/g, '').length;
	return 1 + 0.5 * Math.max(0, digits - 2);
}

// =============================================================================
// Function Cost Lookup
// =============================================================================

const FUNCTION_COSTS: Readonly<Record<string, number>> = {
	sqrt: 3,
	abs: 4,
	sin: 5,
	cos: 5,
	tan: 5,
	ln: 5,
	exp: 5,
	log: 5,
	arcsin: 6,
	arccos: 6,
	arctan: 6,
	sinh: 6,
	cosh: 6,
	tanh: 6,
	arcsinh: 6,
	arccosh: 6,
	arctanh: 6
};

// =============================================================================
// Main Cost Function
// =============================================================================

/**
 * Computes the structural cost of a MathNode tree.
 *
 * Lower cost indicates a "simpler" expression. The cost is the sum of
 * node-specific costs across the entire tree.
 *
 * @param node - The expression to evaluate
 * @returns A non-negative cost value
 */
export function computeCost(node: MathNode): number {
	switch (node.type) {
		case 'number':
			return numberCost(node.value);

		case 'variable':
		case 'greek':
		case 'constant':
		case 'symbol':
		case 'hole':
			return 1;

		case 'infinity':
		case 'signedZero':
			return 1;

		case 'opposite':
		case 'positive':
			return 1 + childrenCost(node);

		case 'addition':
		case 'subtraction':
			return 2 + childrenCost(node);

		case 'multiplication':
			return 3 + childrenCost(node);

		case 'division':
			return 4 + childrenCost(node);

		case 'superscript':
			return 3 + childrenCost(node);

		case 'function': {
			const baseCost = FUNCTION_COSTS[node.name] ?? 6;
			const argsCost = node.args.reduce((sum, arg) => sum + computeCost(arg), 0);
			const powerCost = node.power ? computeCost(node.power) : 0;
			return baseCost + argsCost + powerCost;
		}

		case 'delimiter':
			// Parentheses are free (structural, not semantic)
			return computeCost(node.content);

		case 'complex':
			return 5 + childrenCost(node);

		case 'subscript':
			return 2 + childrenCost(node);

		case 'relation':
			return 2 + childrenCost(node);

		case 'unit':
			return 1 + computeCost(node.expression);

		case 'matrix':
			return (
				5 + node.rows.reduce((sum, row) => sum + row.reduce((s, e) => s + computeCost(e), 0), 0)
			);

		case 'composition':
			return 4 + childrenCost(node);

		case 'limit':
			return 6 + childrenCost(node);

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

/**
 * Sum of costs of all children of a node.
 */
function childrenCost(node: MathNode): number {
	return getChildren(node).reduce((sum, child) => sum + computeCost(child), 0);
}

// =============================================================================
// Comparison Utility
// =============================================================================

/**
 * Returns the cheaper (lower cost) of two equivalent expressions.
 *
 * @param a - First expression
 * @param b - Second expression
 * @returns The expression with lower cost (ties go to `a`)
 */
export function cheapest(a: MathNode, b: MathNode): MathNode {
	return computeCost(a) <= computeCost(b) ? a : b;
}
