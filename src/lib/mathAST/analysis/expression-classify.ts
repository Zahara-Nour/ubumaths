/**
 * Expression Classification
 *
 * Classifies mathematical expressions by their structural type.
 * This module provides both standalone analysis tools and functions
 * that were moved from solve/classify.ts for better modularity.
 *
 * @module mathAST/analysis/expression-classify
 */

import type { MathNode } from '../types';
import { isFunction, isNumber, isDivision } from '../guards';
import { mapNode } from '../transforms';
import { getVariables } from '../eval/substitute';

// =============================================================================
// Types
// =============================================================================

/**
 * Expression category
 */
export type ExpressionCategory =
	| 'constant' // No variables (e.g., 5, π, √2)
	| 'polynomial' // Polynomial in one or more variables
	| 'rational' // Ratio of polynomials (includes polynomials)
	| 'radical' // Contains roots/radicals
	| 'trigonometric' // Contains trig functions
	| 'exponential' // Contains exp function or variable exponents
	| 'logarithmic' // Contains ln/log functions
	| 'algebraic' // Algebraic but not polynomial (rational with radicals)
	| 'transcendental' // Contains transcendental functions
	| 'mixed' // Mix of different transcendental types
	| 'unknown'; // Cannot be classified

/**
 * Detailed classification result
 */
export interface ExpressionClassification {
	/** Primary category of the expression */
	readonly category: ExpressionCategory;

	/** Sub-categories that also apply (e.g., polynomial is also rational) */
	readonly subCategories: readonly ExpressionCategory[];

	/** Variables present in the expression */
	readonly variables: readonly string[];

	/** Polynomial degree if applicable (null if not polynomial) */
	readonly polynomialDegree: number | null;

	/** For polynomial in specific variable */
	readonly degreeInVariable?: Map<string, number>;

	/** Structural complexity score (depth-based) */
	readonly complexity: number;

	/** Whether the expression is constant (no variables) */
	readonly isConstant: boolean;

	/** Whether the expression contains transcendental functions */
	readonly hasTranscendental: boolean;

	/** Type of transcendental functions if present */
	readonly transcendentalType: 'trigonometric' | 'exponential' | 'logarithmic' | null;
}

// =============================================================================
// Transcendental Function Detection
// =============================================================================

/**
 * Set of transcendental function names.
 */
const TRANSCENDENTAL_FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'ln',
	'log',
	'exp'
]);

/**
 * Set of trigonometric function names.
 */
const TRIG_FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'arcsin',
	'arccos',
	'arctan',
	'sec',
	'csc',
	'cot'
]);

/**
 * Set of hyperbolic function names.
 */
const HYPERBOLIC_FUNCTIONS = new Set(['sinh', 'cosh', 'tanh', 'arcsinh', 'arccosh', 'arctanh']);

/**
 * Set of exponential/logarithmic function names.
 */
const EXP_LOG_FUNCTIONS = new Set(['ln', 'log', 'exp']);

/**
 * Check if a function name is transcendental.
 */
function isTranscendentalFunction(name: string): boolean {
	return TRANSCENDENTAL_FUNCTIONS.has(name);
}

/**
 * Check if expression contains transcendental functions.
 */
export function containsTranscendental(node: MathNode): boolean {
	let found = false;

	mapNode(node, (n) => {
		if (found) return n;

		if (isFunction(n) && isTranscendentalFunction(n.name)) {
			found = true;
		}

		return n;
	});

	return found;
}

/**
 * Get the type of transcendental function in the expression.
 */
export function getTranscendentalType(
	node: MathNode
): 'trigonometric' | 'exponential' | 'logarithmic' | null {
	let result: 'trigonometric' | 'exponential' | 'logarithmic' | null = null;

	mapNode(node, (n) => {
		if (result !== null) return n;

		if (isFunction(n)) {
			if (TRIG_FUNCTIONS.has(n.name) || HYPERBOLIC_FUNCTIONS.has(n.name)) {
				result = 'trigonometric';
			} else if (n.name === 'exp') {
				result = 'exponential';
			} else if (n.name === 'ln' || n.name === 'log') {
				result = 'logarithmic';
			}
		}

		return n;
	});

	return result;
}

// =============================================================================
// Polynomial Degree Analysis
// =============================================================================

/**
 * Get the polynomial degree of an expression in a given variable.
 * Returns null if not a polynomial (contains transcendental functions).
 *
 * @param node - The expression to analyze
 * @param variable - The variable to find the degree for
 * @returns The degree, or null if not a polynomial
 */
export function getPolynomialDegree(node: MathNode, variable: string): number | null {
	// If contains transcendental, not a polynomial
	if (containsTranscendental(node)) {
		return null;
	}

	return getPolynomialDegreeRecursive(node, variable);
}

/**
 * Recursively compute polynomial degree.
 */
function getPolynomialDegreeRecursive(node: MathNode, variable: string): number | null {
	switch (node.type) {
		case 'number':
		case 'constant': // Mathematical constants (π, e) are degree 0
			return 0;

		case 'variable':
			return node.name === variable ? 1 : 0;

		case 'greek':
			return node.letter === variable ? 1 : 0;

		case 'addition': {
			// Degree of sum is max of operand degrees
			const leftDeg = getPolynomialDegreeRecursive(node.left, variable);
			const rightDeg = getPolynomialDegreeRecursive(node.right, variable);
			if (leftDeg === null || rightDeg === null) return null;
			return Math.max(leftDeg, rightDeg);
		}

		case 'subtraction': {
			const leftDeg = getPolynomialDegreeRecursive(node.left, variable);
			const rightDeg = getPolynomialDegreeRecursive(node.right, variable);
			if (leftDeg === null || rightDeg === null) return null;
			return Math.max(leftDeg, rightDeg);
		}

		case 'multiplication': {
			// Degree of product is sum of operand degrees
			const leftDeg = getPolynomialDegreeRecursive(node.left, variable);
			const rightDeg = getPolynomialDegreeRecursive(node.right, variable);
			if (leftDeg === null || rightDeg === null) return null;
			return leftDeg + rightDeg;
		}

		case 'division': {
			// For polynomials, denominator must not contain the variable
			const denomDeg = getPolynomialDegreeRecursive(node.denominator, variable);
			if (denomDeg === null || denomDeg > 0) return null; // Not a polynomial
			return getPolynomialDegreeRecursive(node.numerator, variable);
		}

		case 'superscript': {
			// x^n where n is a non-negative integer
			const baseDeg = getPolynomialDegreeRecursive(node.base, variable);
			if (baseDeg === null) return null;

			// Exponent must be a positive integer constant
			if (!isNumber(node.superscript)) return null;
			const exp = parseFloat(node.superscript.value);
			if (!Number.isInteger(exp) || exp < 0) return null;

			return baseDeg * exp;
		}

		case 'opposite':
			return getPolynomialDegreeRecursive(node.operand, variable);

		case 'positive':
			return getPolynomialDegreeRecursive(node.operand, variable);

		case 'delimiter':
			return getPolynomialDegreeRecursive(node.content, variable);

		case 'function': {
			// Functions break polynomial structure (unless constant)
			const vars = getVariables(node);
			if (!vars.has(variable)) return 0;
			return null;
		}

		default:
			// Unknown structure, assume not polynomial
			return null;
	}
}

/**
 * Check if expression is polynomial in given variable.
 */
export function isPolynomialIn(node: MathNode, variable: string): boolean {
	return getPolynomialDegree(node, variable) !== null;
}

// =============================================================================
// Radical/Root Detection
// =============================================================================

/**
 * Check if expression contains radicals (roots).
 */
export function containsRadical(node: MathNode): boolean {
	let found = false;

	mapNode(node, (n) => {
		if (found) return n;

		// Check for root functions
		if (isFunction(n) && (n.name === 'sqrt' || n.name === 'cbrt' || n.name === 'root')) {
			found = true;
		}

		// Check for fractional exponents
		if (n.type === 'superscript' && isDivision(n.superscript)) {
			const denom = n.superscript.denominator;
			if (isNumber(denom)) {
				const d = parseFloat(denom.value);
				if (d !== 1) {
					found = true;
				}
			}
		}

		return n;
	});

	return found;
}

// =============================================================================
// Rational Expression Detection
// =============================================================================

/**
 * Check if expression is a rational function of the given variable.
 * A rational function is a ratio of polynomials.
 */
export function isRationalIn(node: MathNode, variable: string): boolean {
	return isRationalRecursive(node, variable);
}

function isRationalRecursive(node: MathNode, variable: string): boolean {
	switch (node.type) {
		case 'number':
		case 'symbol':
		case 'constant':
			return true;

		case 'variable':
			return true;

		case 'greek':
			return true;

		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return isRationalRecursive(node.left, variable) && isRationalRecursive(node.right, variable);

		case 'division':
			return (
				isRationalRecursive(node.numerator, variable) &&
				isRationalRecursive(node.denominator, variable)
			);

		case 'superscript': {
			// x^n where n is an integer (positive or negative)
			if (!isNumber(node.superscript)) {
				// Variable exponent - not rational
				const vars = getVariables(node.superscript);
				if (vars.size > 0) return false;
			}
			const exp = isNumber(node.superscript) ? parseFloat(node.superscript.value) : null;
			if (exp !== null && !Number.isInteger(exp)) return false;
			return isRationalRecursive(node.base, variable);
		}

		case 'opposite':
		case 'positive':
			return isRationalRecursive(node.operand, variable);

		case 'delimiter':
			return isRationalRecursive(node.content, variable);

		case 'function':
			// Functions that aren't algebraic break rational structure
			if (isTranscendentalFunction(node.name)) return false;
			// sqrt, cbrt, root are also not rational
			if (node.name === 'sqrt' || node.name === 'cbrt' || node.name === 'root') return false;
			// Other functions (like abs) might contain variables
			return node.args.every((arg) => !getVariables(arg).has(variable));

		default:
			return false;
	}
}

// =============================================================================
// Complexity Calculation
// =============================================================================

/**
 * Calculate structural complexity of an expression.
 * Based on depth and number of operations.
 */
export function calculateComplexity(node: MathNode): number {
	return calculateComplexityRecursive(node, 0);
}

function calculateComplexityRecursive(node: MathNode, depth: number): number {
	const depthWeight = depth + 1;

	switch (node.type) {
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'constant':
			return depthWeight;

		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return (
				depthWeight +
				calculateComplexityRecursive(node.left, depth + 1) +
				calculateComplexityRecursive(node.right, depth + 1)
			);

		case 'division':
			return (
				depthWeight +
				calculateComplexityRecursive(node.numerator, depth + 1) +
				calculateComplexityRecursive(node.denominator, depth + 1)
			);

		case 'superscript':
			return (
				depthWeight +
				calculateComplexityRecursive(node.base, depth + 1) +
				calculateComplexityRecursive(node.superscript, depth + 1)
			);

		case 'opposite':
		case 'positive':
			return depthWeight + calculateComplexityRecursive(node.operand, depth + 1);

		case 'delimiter':
			return depthWeight + calculateComplexityRecursive(node.content, depth + 1);

		case 'function': {
			const argsComplexity = node.args.reduce(
				(sum, arg) => sum + calculateComplexityRecursive(arg, depth + 1),
				0
			);
			return depthWeight * 2 + argsComplexity;
		}

		default:
			return depthWeight;
	}
}

// =============================================================================
// Main Classification Function
// =============================================================================

/**
 * Classify a mathematical expression.
 *
 * @param node - The expression to classify
 * @param variable - Optional: specific variable to analyze for polynomial degree
 * @returns Detailed classification result
 *
 * @example
 * classifyExpression(parse('x^2 + 2x + 1'))
 * // → { category: 'polynomial', polynomialDegree: 2, ... }
 *
 * classifyExpression(parse('sin(x)'))
 * // → { category: 'trigonometric', hasTranscendental: true, ... }
 */
export function classifyExpression(node: MathNode, variable?: string): ExpressionClassification {
	const variables = Array.from(getVariables(node));
	const isConstant = variables.length === 0;
	const hasTranscendental = containsTranscendental(node);
	const transcendentalType = getTranscendentalType(node);
	const hasRadical = containsRadical(node);
	const complexity = calculateComplexity(node);

	// Determine polynomial degree for each variable
	const degreeInVariable = new Map<string, number>();
	let maxPolynomialDegree: number | null = null;
	let isPolynomial = true;

	const targetVariable = variable ?? (variables.length === 1 ? variables[0] : undefined);

	if (targetVariable) {
		const deg = getPolynomialDegree(node, targetVariable);
		if (deg !== null) {
			degreeInVariable.set(targetVariable, deg);
			maxPolynomialDegree = deg;
		} else {
			isPolynomial = false;
		}
	} else {
		// Check polynomial in all variables
		for (const v of variables) {
			const deg = getPolynomialDegree(node, v);
			if (deg !== null) {
				degreeInVariable.set(v, deg);
				maxPolynomialDegree =
					maxPolynomialDegree === null ? deg : Math.max(maxPolynomialDegree, deg);
			} else {
				isPolynomial = false;
			}
		}
	}

	// Check if rational
	const isRational = targetVariable
		? isRationalIn(node, targetVariable)
		: !hasTranscendental && !hasRadical;

	// Determine primary category
	let category: ExpressionCategory;
	const subCategories: ExpressionCategory[] = [];

	if (isConstant) {
		category = 'constant';
	} else if (hasTranscendental) {
		// Determine specific transcendental type
		switch (transcendentalType) {
			case 'trigonometric':
				category = 'trigonometric';
				break;
			case 'exponential':
				category = 'exponential';
				break;
			case 'logarithmic':
				category = 'logarithmic';
				break;
			default:
				category = 'transcendental';
		}
		// Check for mixed transcendental types
		if (containsMultipleTranscendentalTypes(node)) {
			category = 'mixed';
		}
	} else if (isPolynomial && variables.length > 0) {
		category = 'polynomial';
		subCategories.push('rational', 'algebraic');
	} else if (hasRadical) {
		if (isRational) {
			category = 'algebraic';
		} else {
			category = 'radical';
			subCategories.push('algebraic');
		}
	} else if (isRational) {
		category = 'rational';
		subCategories.push('algebraic');
	} else {
		category = 'unknown';
	}

	return {
		category,
		subCategories,
		variables,
		polynomialDegree: isPolynomial ? maxPolynomialDegree : null,
		degreeInVariable,
		complexity,
		isConstant,
		hasTranscendental,
		transcendentalType
	};
}

/**
 * Check if expression contains multiple types of transcendental functions.
 */
function containsMultipleTranscendentalTypes(node: MathNode): boolean {
	let hasTrig = false;
	let hasExpLog = false;

	mapNode(node, (n) => {
		if (isFunction(n)) {
			if (TRIG_FUNCTIONS.has(n.name) || HYPERBOLIC_FUNCTIONS.has(n.name)) {
				hasTrig = true;
			} else if (EXP_LOG_FUNCTIONS.has(n.name)) {
				hasExpLog = true;
			}
		}
		return n;
	});

	return hasTrig && hasExpLog;
}
