/**
 * Linear Combination Analysis
 *
 * Extracts coefficients from linear combinations of the form:
 *   a₁·x₁ + a₂·x₂ + ... + aₙ·xₙ
 *
 * Coefficients can be any MathNode (symbolic), not just numbers.
 *
 * @example
 * // Numeric coefficients
 * extractLinearCombination(parse('2x + 3y'), ['x', 'y'])
 * // → { x: number(2), y: number(3) }
 *
 * // Symbolic coefficients
 * extractLinearCombination(parse('√2·x + πy'), ['x', 'y'])
 * // → { x: sqrt(2), y: constant(pi) }
 *
 * // Implicit coefficient (x = 1·x)
 * extractLinearCombination(parse('x - y'), ['x', 'y'])
 * // → { x: number(1), y: number(-1) }
 *
 * @module mathAST/analysis/linear-combination
 */

import type { MathNode } from '../types';
import { flattenSumShallow, type SignedTerm } from '../flatten';
import { isOpposite } from '../guards';
import { nodesEqual } from '../pattern';
import {
	ZERO,
	containsAnyVariable,
	applySign,
	addCoefficients,
	extractCoefficientAndVariable
} from './coefficient-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of linear combination extraction.
 *
 * Coefficients are stored as MathNode to support symbolic coefficients
 * like √2, π, (a+b), etc.
 */
export interface LinearCombinationResult {
	/**
	 * Map from variable name to its coefficient (as MathNode).
	 * Missing variables have coefficient number('0').
	 */
	readonly coefficients: ReadonlyMap<string, MathNode>;

	/**
	 * The variables that were looked for (in order).
	 */
	readonly variables: readonly string[];

	/**
	 * Whether the expression is a valid linear combination.
	 * If false, the extraction encountered non-linear terms.
	 */
	readonly isLinear: boolean;

	/**
	 * Error message if isLinear is false.
	 */
	readonly error?: string;
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Extracts coefficients from a linear combination.
 *
 * A linear combination has the form: a₁·x₁ + a₂·x₂ + ... + aₙ·xₙ
 * where aᵢ are coefficients (any MathNode) and xᵢ are variables.
 *
 * @param node - The expression to analyze
 * @param variables - The variable names to look for (e.g., ['x', 'y', 'z'])
 * @returns LinearCombinationResult with coefficients map
 *
 * @example
 * // Numeric coefficients
 * const result = extractLinearCombination(parse('2x - 3y'), ['x', 'y']);
 * result.coefficients.get('x') // → number('2')
 * result.coefficients.get('y') // → number('-3')
 *
 * @example
 * // Symbolic coefficients
 * const result = extractLinearCombination(parse('√2·x + πy'), ['x', 'y']);
 * result.coefficients.get('x') // → func('sqrt', [number('2')])
 * result.coefficients.get('y') // → constant('pi')
 *
 * @example
 * // Implicit coefficient
 * const result = extractLinearCombination(parse('x + y'), ['x', 'y']);
 * result.coefficients.get('x') // → number('1')
 * result.coefficients.get('y') // → number('1')
 *
 * @example
 * // Missing variable
 * const result = extractLinearCombination(parse('3x'), ['x', 'y']);
 * result.coefficients.get('x') // → number('3')
 * result.coefficients.get('y') // → number('0')
 */
export function extractLinearCombination(
	node: MathNode,
	variables: readonly string[]
): LinearCombinationResult {
	// Initialize coefficients to 0 for all variables
	const coefficients = new Map<string, MathNode>(variables.map((v) => [v, ZERO]));

	// Flatten the sum to get signed terms
	const terms: readonly SignedTerm[] = flattenSumShallow(node);

	// Process each term
	for (const { sign, term } of terms) {
		// Handle opposite node at term level
		let actualTerm = term;
		let actualSign = sign;

		if (isOpposite(term)) {
			actualTerm = term.operand;
			actualSign = actualSign === '+' ? '-' : '+';
		}

		// Extract coefficient and variable
		const extracted = extractCoefficientAndVariable(actualTerm, variables);

		if (extracted === null) {
			// Check if it's a constant term (no variables) - which is invalid for linear combination
			if (!containsAnyVariable(actualTerm, variables)) {
				return {
					coefficients,
					variables,
					isLinear: false,
					error: `Unexpected constant term: linear combinations should not have constant terms`
				};
			}

			// Non-linear term (e.g., x*y, x²)
			return {
				coefficients,
				variables,
				isLinear: false,
				error: `Non-linear term detected`
			};
		}

		const { coefficient, variableName } = extracted;

		// Apply the sign from the sum
		const signedCoefficient = applySign(coefficient, actualSign);

		// Add to existing coefficient (handles terms like x + x → 2x)
		const existing = coefficients.get(variableName)!;
		coefficients.set(variableName, addCoefficients(existing, signedCoefficient));
	}

	return {
		coefficients,
		variables,
		isLinear: true
	};
}

/**
 * Checks if an expression is a valid linear combination of the given variables.
 *
 * @param node - The expression to check
 * @param variables - The variable names to look for
 * @returns true if the expression is a linear combination
 */
export function isLinearCombination(node: MathNode, variables: readonly string[]): boolean {
	return extractLinearCombination(node, variables).isLinear;
}

/**
 * Gets the coefficient for a specific variable in a linear combination.
 *
 * @param node - The expression to analyze
 * @param variable - The variable name
 * @param otherVariables - Other variables that may appear (optional)
 * @returns The coefficient as MathNode, or null if not a linear combination
 */
export function getCoefficient(
	node: MathNode,
	variable: string,
	otherVariables: readonly string[] = []
): MathNode | null {
	const allVariables = [variable, ...otherVariables];
	const result = extractLinearCombination(node, allVariables);

	if (!result.isLinear) {
		return null;
	}

	return result.coefficients.get(variable) ?? null;
}

/**
 * Compares if two linear combinations have equal coefficients.
 *
 * Uses structural equality by default. For semantic equality,
 * normalize both expressions first.
 *
 * @param a - First expression
 * @param b - Second expression
 * @param variables - Variables to compare
 * @returns true if all coefficients are structurally equal
 */
export function equalLinearCombinations(
	a: MathNode,
	b: MathNode,
	variables: readonly string[]
): boolean {
	const resultA = extractLinearCombination(a, variables);
	const resultB = extractLinearCombination(b, variables);

	if (!resultA.isLinear || !resultB.isLinear) {
		return false;
	}

	for (const v of variables) {
		const coeffA = resultA.coefficients.get(v);
		const coeffB = resultB.coefficients.get(v);

		if (coeffA === undefined || coeffB === undefined) {
			return false;
		}

		if (!nodesEqual(coeffA, coeffB)) {
			return false;
		}
	}

	return true;
}
