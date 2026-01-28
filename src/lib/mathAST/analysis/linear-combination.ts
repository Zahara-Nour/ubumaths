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
import { flattenSumShallow, flattenProductShallow, type SignedTerm } from '../flatten';
import {
	isVariable,
	isMultiplication,
	isNumber,
	isOpposite,
	isDivision,
	isDelimiter
} from '../guards';
import { number, opposite, multiply, divide, add } from '../factory';
import { nodesEqual } from '../pattern';

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

/**
 * Extracted term: coefficient and variable name.
 */
interface ExtractedTerm {
	readonly coefficient: MathNode;
	readonly variableName: string;
}

// =============================================================================
// Constants
// =============================================================================

const ZERO = number('0');
const ONE = number('1');
const MINUS_ONE = number('-1');

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a node represents a target variable.
 */
function isTargetVariable(node: MathNode, variables: readonly string[]): string | null {
	if (isVariable(node) && variables.includes(node.name)) {
		return node.name;
	}
	return null;
}

/**
 * Applies a sign to a coefficient.
 * If sign is '-', wraps in opposite() or simplifies if possible.
 */
function applySign(coefficient: MathNode, sign: '+' | '-'): MathNode {
	if (sign === '+') {
		return coefficient;
	}

	// Optimization: -1 becomes number('-1') not opposite(1)
	if (isNumber(coefficient) && coefficient.value === '1') {
		return MINUS_ONE;
	}

	// Optimization: -(−x) becomes x (double negation)
	if (isOpposite(coefficient)) {
		return coefficient.operand;
	}

	// Optimization: -n becomes number(-n) for numeric values
	if (isNumber(coefficient)) {
		const value = parseFloat(coefficient.value);
		return number(String(-value));
	}

	// General case: wrap in opposite
	return opposite(coefficient);
}

/**
 * Adds two coefficients (as MathNodes).
 * Returns a simplified result when possible.
 */
function addCoefficients(a: MathNode, b: MathNode): MathNode {
	// 0 + x = x
	if (isNumber(a) && a.value === '0') {
		return b;
	}
	// x + 0 = x
	if (isNumber(b) && b.value === '0') {
		return a;
	}

	// Numeric addition: n + m = (n+m)
	if (isNumber(a) && isNumber(b)) {
		const sum = parseFloat(a.value) + parseFloat(b.value);
		return number(String(sum));
	}

	// General case: create addition node
	return add(a, b);
}

/**
 * Extracts coefficient and variable from a single term.
 *
 * Handles:
 * - x → { coefficient: 1, variable: 'x' }
 * - 2x → { coefficient: 2, variable: 'x' }
 * - √2·x → { coefficient: √2, variable: 'x' }
 * - (a+b)x → { coefficient: (a+b), variable: 'x' }
 * - x/2 → { coefficient: 1/2, variable: 'x' }
 * - 2x/3 → { coefficient: 2/3, variable: 'x' }
 *
 * @returns ExtractedTerm or null if not a valid linear term
 */
function extractCoefficientAndVariable(
	term: MathNode,
	variables: readonly string[]
): ExtractedTerm | null {
	// Case 1: Variable alone (x) → coefficient = 1
	const varName = isTargetVariable(term, variables);
	if (varName !== null) {
		return { coefficient: ONE, variableName: varName };
	}

	// Case 2: Multiplication (a * x or x * a or a * b * x)
	if (isMultiplication(term)) {
		const factors = flattenProductShallow(term);
		return extractFromFactors(factors, variables);
	}

	// Case 3: Division (x/2 or (ax)/b)
	if (isDivision(term)) {
		return extractFromDivision(term, variables);
	}

	// Case 4: Delimiter (parentheses) - extract from content
	if (isDelimiter(term)) {
		return extractCoefficientAndVariable(term.content, variables);
	}

	// Case 5: Opposite (-x or -ax) - handled at the term level with sign
	// This case shouldn't normally be reached as opposite is handled in sign

	// Not a valid linear term
	return null;
}

/**
 * Extracts coefficient and variable from flattened product factors.
 *
 * Valid forms:
 * - [x] → coefficient = 1
 * - [2, x] → coefficient = 2
 * - [√2, x] → coefficient = √2
 * - [(a+b), x] → coefficient = (a+b)
 * - [2, 3, x] → coefficient = 2*3 = 6
 *
 * Invalid (non-linear):
 * - [x, y] → two variables
 * - [x, x] → x²
 */
function extractFromFactors(
	factors: readonly MathNode[],
	variables: readonly string[]
): ExtractedTerm | null {
	let foundVariable: string | null = null;
	const coefficientFactors: MathNode[] = [];

	for (const factor of factors) {
		const varName = isTargetVariable(factor, variables);
		if (varName !== null) {
			// Found a target variable
			if (foundVariable !== null) {
				// Second variable found → non-linear (x*y or x*x)
				return null;
			}
			foundVariable = varName;
		} else {
			// Not a target variable → part of coefficient
			coefficientFactors.push(factor);
		}
	}

	if (foundVariable === null) {
		// No variable found → constant term, not a linear term
		return null;
	}

	// Build coefficient from factors
	const coefficient = buildProductFromFactors(coefficientFactors);
	return { coefficient, variableName: foundVariable };
}

/**
 * Builds a product MathNode from an array of factors.
 */
function buildProductFromFactors(factors: readonly MathNode[]): MathNode {
	if (factors.length === 0) {
		return ONE;
	}
	if (factors.length === 1) {
		return factors[0];
	}

	// Multiply all factors together
	let result = factors[0];
	for (let i = 1; i < factors.length; i++) {
		result = multiply(result, factors[i], 'implicit');
	}
	return result;
}

/**
 * Extracts coefficient and variable from a division node.
 *
 * Valid forms:
 * - x/2 → coefficient = 1/2, variable = x
 * - (2x)/3 → coefficient = 2/3, variable = x
 * - (ax)/b → coefficient = a/b, variable = x
 *
 * Invalid:
 * - 2/x → variable in denominator (non-linear)
 */
function extractFromDivision(node: MathNode, variables: readonly string[]): ExtractedTerm | null {
	if (!isDivision(node)) return null;

	const { numerator, denominator } = node;

	// Check denominator doesn't contain target variables (would be non-linear)
	if (containsVariable(denominator, variables)) {
		return null;
	}

	// Extract from numerator
	const numExtracted = extractCoefficientAndVariable(numerator, variables);
	if (numExtracted === null) {
		// Numerator might just be the variable
		const varName = isTargetVariable(numerator, variables);
		if (varName !== null) {
			// x/d → coefficient = 1/d
			return {
				coefficient: divide(ONE, denominator, 'fraction'),
				variableName: varName
			};
		}
		return null;
	}

	// (coeff * x) / d → coefficient = coeff/d
	return {
		coefficient: divide(numExtracted.coefficient, denominator, 'fraction'),
		variableName: numExtracted.variableName
	};
}

/**
 * Checks if a node contains any of the target variables.
 */
function containsVariable(node: MathNode, variables: readonly string[]): boolean {
	if (isVariable(node) && variables.includes(node.name)) {
		return true;
	}

	// Recursively check children based on node type
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return containsVariable(node.left, variables) || containsVariable(node.right, variables);
		case 'division':
			return (
				containsVariable(node.numerator, variables) || containsVariable(node.denominator, variables)
			);
		case 'opposite':
		case 'positive':
			return containsVariable(node.operand, variables);
		case 'delimiter':
			return containsVariable(node.content, variables);
		case 'function':
			return node.args.some((arg) => containsVariable(arg, variables));
		case 'superscript':
			return (
				containsVariable(node.base, variables) || containsVariable(node.superscript, variables)
			);
		case 'subscript':
			return containsVariable(node.base, variables) || containsVariable(node.subscript, variables);
		default:
			return false;
	}
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
			if (!containsVariable(actualTerm, variables)) {
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
