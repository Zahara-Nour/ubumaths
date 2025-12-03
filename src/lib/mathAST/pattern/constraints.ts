/**
 * Pattern Matching Constraints for MathAST
 *
 * Evaluates constraints against MathNode expressions to determine if
 * they satisfy the pattern requirements.
 */

import type { PatternConstraint } from './types';
import type { MathNode, MathNodeType } from '../types';
import { isNumber, isVariable } from '../guards';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parses a number from a NumberNode's string value.
 * Returns undefined if the value cannot be parsed.
 */
function parseNumberValue(node: MathNode): number | undefined {
	if (!isNumber(node)) return undefined;
	const parsed = parseFloat(node.value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Checks if a MathNode contains a specific variable name.
 * Recursively traverses the entire tree.
 *
 * @param node - The node to check
 * @param varName - The variable name to look for
 * @returns true if the variable is found anywhere in the tree
 */
function containsVariable(node: MathNode, varName: string): boolean {
	switch (node.type) {
		case 'number':
		case 'greek':
		case 'symbol':
		case 'hole':
			return false;

		case 'variable':
			return node.name === varName;

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

		default: {
			// Exhaustive check
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

/**
 * Checks if a MathNode is free of all specified variables.
 *
 * @param node - The node to check
 * @param variables - Variable names that must not appear
 * @returns true if none of the variables appear in the tree
 */
function isFreeOfVariables(node: MathNode, variables: readonly string[]): boolean {
	return variables.every((varName) => !containsVariable(node, varName));
}

// =============================================================================
// Main Constraint Checker
// =============================================================================

/**
 * Evaluates a constraint against a MathNode.
 *
 * @param constraint - The constraint to check
 * @param node - The node to check against
 * @returns true if the node satisfies the constraint
 *
 * @example
 * // Check if a node is a number
 * checkConstraint({ kind: 'number' }, someNode)
 *
 * // Check if a node is a positive integer
 * checkConstraint(
 *   { kind: 'and', constraints: [{ kind: 'integer' }, { kind: 'positive' }] },
 *   someNode
 * )
 */
export function checkConstraint(constraint: PatternConstraint, node: MathNode): boolean {
	switch (constraint.kind) {
		case 'type': {
			const types = Array.isArray(constraint.nodeType)
				? constraint.nodeType
				: [constraint.nodeType];
			return types.includes(node.type as MathNodeType);
		}

		case 'number':
			return isNumber(node);

		case 'variable':
			return isVariable(node);

		case 'positive': {
			const value = parseNumberValue(node);
			return value !== undefined && value > 0;
		}

		case 'negative': {
			const value = parseNumberValue(node);
			return value !== undefined && value < 0;
		}

		case 'nonzero': {
			const value = parseNumberValue(node);
			return value !== undefined && value !== 0;
		}

		case 'integer': {
			const value = parseNumberValue(node);
			return value !== undefined && Number.isInteger(value);
		}

		case 'freeOf':
			return isFreeOfVariables(node, constraint.variables);

		case 'and':
			return constraint.constraints.every((c) => checkConstraint(c, node));

		case 'or':
			return constraint.constraints.some((c) => checkConstraint(c, node));

		case 'not':
			return !checkConstraint(constraint.constraint, node);

		case 'custom':
			return constraint.predicate(node);

		default: {
			// Exhaustive check - should never reach
			const _exhaustive: never = constraint;
			return _exhaustive;
		}
	}
}

// =============================================================================
// Utility Exports
// =============================================================================

export { containsVariable, isFreeOfVariables };
