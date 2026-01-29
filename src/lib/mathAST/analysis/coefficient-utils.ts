/**
 * Coefficient Extraction Utilities
 *
 * Shared utilities for extracting coefficients from mathematical expressions.
 * Used by linear-combination, polynomial-analysis, and periodicity modules.
 *
 * @module mathAST/analysis/coefficient-utils
 */

import type { MathNode } from '../types';
import {
	isNumber,
	isVariable,
	isGreek,
	isMultiplication,
	isDivision,
	isOpposite,
	isDelimiter,
	isAddition,
	isSubtraction
} from '../guards';
import { number, opposite, multiply, divide, add } from '../factory';
import { getVariables } from '../eval/substitute';

// =============================================================================
// Constants
// =============================================================================

export const ZERO = number('0');
export const ONE = number('1');
export const MINUS_ONE = number('-1');

// =============================================================================
// Variable Detection
// =============================================================================

/**
 * Checks if a node represents a specific variable.
 * Handles both regular variables and greek letters.
 */
export function isTargetVariable(node: MathNode, variable: string): boolean {
	if (isVariable(node)) {
		return node.name === variable;
	}
	if (isGreek(node)) {
		return node.letter === variable;
	}
	return false;
}

/**
 * Checks if a node represents one of the target variables.
 * Returns the variable name if found, null otherwise.
 */
export function isTargetVariableIn(node: MathNode, variables: readonly string[]): string | null {
	if (isVariable(node) && variables.includes(node.name)) {
		return node.name;
	}
	if (isGreek(node) && variables.includes(node.letter)) {
		return node.letter;
	}
	return null;
}

/**
 * Check if node contains a specific variable.
 */
export function containsVariable(node: MathNode, variable: string): boolean {
	const vars = getVariables(node);
	return vars.has(variable);
}

/**
 * Check if node contains any of the target variables.
 */
export function containsAnyVariable(node: MathNode, variables: readonly string[]): boolean {
	const vars = getVariables(node);
	return variables.some((v) => vars.has(v));
}

// =============================================================================
// Sign and Arithmetic Operations
// =============================================================================

/**
 * Apply a sign to a coefficient.
 * Optimizes common cases (1 → -1, double negation, numeric values).
 */
export function applySign(coefficient: MathNode, sign: '+' | '-'): MathNode {
	if (sign === '+') {
		return coefficient;
	}

	// Optimization: 1 → -1
	if (isNumber(coefficient) && coefficient.value === '1') {
		return MINUS_ONE;
	}

	// Optimization: -1 → 1
	if (isNumber(coefficient) && coefficient.value === '-1') {
		return ONE;
	}

	// Optimization: -(−x) → x (double negation)
	if (isOpposite(coefficient)) {
		return coefficient.operand;
	}

	// Optimization: -n → number(-n) for numeric values
	if (isNumber(coefficient)) {
		const value = parseFloat(coefficient.value);
		return number(String(-value));
	}

	// General case: wrap in opposite
	return opposite(coefficient);
}

/**
 * Add two coefficients (as MathNodes).
 * Returns a simplified result when possible.
 */
export function addCoefficients(a: MathNode, b: MathNode): MathNode {
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

// =============================================================================
// Product Building
// =============================================================================

/**
 * Build a product MathNode from an array of factors.
 * Returns ONE if empty, the single factor if length 1.
 */
export function buildProduct(factors: readonly MathNode[]): MathNode {
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

// =============================================================================
// Coefficient Extraction from Products
// =============================================================================

/**
 * Result of extracting coefficient and variable from a term.
 */
export interface ExtractedTerm {
	readonly coefficient: MathNode;
	readonly variableName: string;
}

/**
 * Extract coefficient and variable from a product term.
 * Handles: x, 2x, √2·x, (a+b)x, x/2
 *
 * @param term - The term to extract from
 * @param variables - The variables to look for
 * @returns ExtractedTerm or null if not a valid linear term
 */
export function extractCoefficientAndVariable(
	term: MathNode,
	variables: readonly string[]
): ExtractedTerm | null {
	// Case 1: Variable alone (x) → coefficient = 1
	const varName = isTargetVariableIn(term, variables);
	if (varName !== null) {
		return { coefficient: ONE, variableName: varName };
	}

	// Case 2: Multiplication (a * x or x * a or a * b * x)
	if (isMultiplication(term)) {
		return extractFromProduct(term, variables);
	}

	// Case 3: Division (x/2 or (ax)/b)
	if (isDivision(term)) {
		return extractFromDivision(term, variables);
	}

	// Case 4: Delimiter (parentheses) - extract from content
	if (isDelimiter(term)) {
		return extractCoefficientAndVariable(term.content, variables);
	}

	// Not a valid linear term
	return null;
}

/**
 * Extract coefficient and variable from a multiplication.
 */
function extractFromProduct(node: MathNode, variables: readonly string[]): ExtractedTerm | null {
	const factors = flattenProduct(node);
	let foundVariable: string | null = null;
	const coefficientFactors: MathNode[] = [];

	for (const factor of factors) {
		const varName = isTargetVariableIn(factor, variables);
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
		// No variable found → constant term
		return null;
	}

	return {
		coefficient: buildProduct(coefficientFactors),
		variableName: foundVariable
	};
}

/**
 * Extract coefficient and variable from a division.
 */
function extractFromDivision(node: MathNode, variables: readonly string[]): ExtractedTerm | null {
	if (!isDivision(node)) return null;

	const { numerator, denominator } = node;

	// Check denominator doesn't contain target variables (would be non-linear)
	if (containsAnyVariable(denominator, variables)) {
		return null;
	}

	// Extract from numerator
	const numExtracted = extractCoefficientAndVariable(numerator, variables);
	if (numExtracted !== null) {
		// (coeff * x) / d → coefficient = coeff/d
		return {
			coefficient: divide(numExtracted.coefficient, denominator, 'fraction'),
			variableName: numExtracted.variableName
		};
	}

	// Numerator might just be the variable
	const varName = isTargetVariableIn(numerator, variables);
	if (varName !== null) {
		// x/d → coefficient = 1/d
		return {
			coefficient: divide(ONE, denominator, 'fraction'),
			variableName: varName
		};
	}

	return null;
}

/**
 * Flatten a multiplication into an array of factors.
 */
function flattenProduct(node: MathNode): MathNode[] {
	if (isMultiplication(node)) {
		return [...flattenProduct(node.left), ...flattenProduct(node.right)];
	}
	return [node];
}

// =============================================================================
// Linear Form Extraction (for periodicity)
// =============================================================================

/**
 * Result of extracting linear form ax + b from an expression.
 */
export interface LinearForm {
	readonly coefficient: MathNode;
	readonly offset: MathNode | null;
}

/**
 * Extract linear form (ax + b) from an expression.
 * Used primarily for periodicity analysis: f(ax + b) has period T/|a|.
 *
 * @param node - The expression to extract from
 * @param variable - The variable to find the linear form for
 * @returns LinearForm or null if not linear in the variable
 */
export function extractLinearForm(node: MathNode, variable: string): LinearForm | null {
	// Just the variable: coefficient = 1, no offset
	if (isTargetVariable(node, variable)) {
		return { coefficient: ONE, offset: null };
	}

	// Multiplication: a*x or x*a
	if (isMultiplication(node)) {
		return extractLinearFromProduct(node, variable);
	}

	// Addition: expr + constant or constant + expr
	if (isAddition(node)) {
		return extractLinearFromAddition(node, variable);
	}

	// Subtraction: expr - constant
	if (isSubtraction(node)) {
		return extractLinearFromSubtraction(node, variable);
	}

	// Division: x/k => coefficient = 1/k
	if (isDivision(node)) {
		return extractLinearFromDivision(node, variable);
	}

	// Delimiter (parentheses)
	if (isDelimiter(node)) {
		return extractLinearForm(node.content, variable);
	}

	return null;
}

function extractLinearFromProduct(node: MathNode, variable: string): LinearForm | null {
	if (!isMultiplication(node)) return null;

	const leftVars = getVariables(node.left);
	const rightVars = getVariables(node.right);

	// Check left * right
	if (isTargetVariable(node.left, variable) && !rightVars.has(variable)) {
		return { coefficient: node.right, offset: null };
	}
	if (isTargetVariable(node.right, variable) && !leftVars.has(variable)) {
		return { coefficient: node.left, offset: null };
	}

	// Nested: (a*x)*b or a*(x*b) etc.
	const leftLinear = extractLinearForm(node.left, variable);
	if (leftLinear && !rightVars.has(variable)) {
		return {
			coefficient: multiply(leftLinear.coefficient, node.right, 'implicit'),
			offset: leftLinear.offset ? multiply(leftLinear.offset, node.right, 'implicit') : null
		};
	}

	const rightLinear = extractLinearForm(node.right, variable);
	if (rightLinear && !leftVars.has(variable)) {
		return {
			coefficient: multiply(node.left, rightLinear.coefficient, 'implicit'),
			offset: rightLinear.offset ? multiply(node.left, rightLinear.offset, 'implicit') : null
		};
	}

	return null;
}

function extractLinearFromAddition(node: MathNode, variable: string): LinearForm | null {
	if (!isAddition(node)) return null;

	const leftVars = getVariables(node.left);
	const rightVars = getVariables(node.right);

	if (leftVars.has(variable) && !rightVars.has(variable)) {
		const leftLinear = extractLinearForm(node.left, variable);
		if (leftLinear) {
			return {
				coefficient: leftLinear.coefficient,
				offset: leftLinear.offset ? add(leftLinear.offset, node.right) : node.right
			};
		}
	}

	if (rightVars.has(variable) && !leftVars.has(variable)) {
		const rightLinear = extractLinearForm(node.right, variable);
		if (rightLinear) {
			return {
				coefficient: rightLinear.coefficient,
				offset: rightLinear.offset ? add(node.left, rightLinear.offset) : node.left
			};
		}
	}

	return null;
}

function extractLinearFromSubtraction(node: MathNode, variable: string): LinearForm | null {
	if (!isSubtraction(node)) return null;

	const leftVars = getVariables(node.left);
	const rightVars = getVariables(node.right);

	if (leftVars.has(variable) && !rightVars.has(variable)) {
		const leftLinear = extractLinearForm(node.left, variable);
		if (leftLinear) {
			const negRight: MathNode = { type: 'opposite', operand: node.right };
			const newOffset = leftLinear.offset ? add(leftLinear.offset, negRight) : negRight;
			return {
				coefficient: leftLinear.coefficient,
				offset: newOffset
			};
		}
	}

	return null;
}

function extractLinearFromDivision(node: MathNode, variable: string): LinearForm | null {
	if (!isDivision(node)) return null;

	const numVars = getVariables(node.numerator);
	const denVars = getVariables(node.denominator);

	if (numVars.has(variable) && !denVars.has(variable)) {
		const numLinear = extractLinearForm(node.numerator, variable);
		if (numLinear) {
			return {
				coefficient: divide(numLinear.coefficient, node.denominator, 'fraction'),
				offset: numLinear.offset ? divide(numLinear.offset, node.denominator, 'fraction') : null
			};
		}
	}

	return null;
}
