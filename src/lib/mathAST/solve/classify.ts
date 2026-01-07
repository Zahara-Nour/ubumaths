/**
 * Equation Classification
 *
 * Classifies equations to determine solving strategy.
 *
 * @module mathAST/solve/classify
 */

import type { MathNode, RelationNode } from '../types';
import type { ClassificationResult } from './types';
import { isFunction, isNumber } from '../guards';
import { subtract } from '../factory';
import { getVariables } from '../eval/substitute';
import { mapNode } from '../transforms';

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
const TRIG_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan']);

/**
 * Set of exponential/logarithmic function names.
 */
const _EXP_LOG_FUNCTIONS = new Set(['ln', 'log', 'exp']);

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
			if (TRIG_FUNCTIONS.has(n.name)) {
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
			return 0;

		case 'variable':
			return node.name === variable ? 1 : 0;

		case 'greekLetter':
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
// Standard Form Conversion
// =============================================================================

/**
 * Convert equation to standard form: f(x) = 0.
 * Moves all terms to the left side.
 *
 * @param equation - The equation to standardize
 * @returns The left side f(x) where f(x) = 0
 */
export function toStandardForm(equation: RelationNode): MathNode {
	// For equality, move right side to left: lhs - rhs = 0
	return subtract(equation.left, equation.right);
}

// =============================================================================
// Main Classification Function
// =============================================================================

/**
 * Classify an equation to determine solving strategy.
 *
 * @param equation - The equation to classify (RelationNode with '=')
 * @param variable - The variable to solve for
 * @returns Classification result with equation type
 */
export function classifyEquation(equation: RelationNode, variable: string): ClassificationResult {
	// Get all variables in the equation
	const variables = Array.from(getVariables(equation.left)).concat(
		Array.from(getVariables(equation.right))
	);
	const uniqueVars = [...new Set(variables)];

	// Convert to standard form for analysis
	const standardForm = toStandardForm(equation);

	// Check if it's a polynomial
	const degree = getPolynomialDegree(standardForm, variable);

	if (degree !== null) {
		// It's a polynomial
		if (degree === 0) {
			// No variable - either identity (0=0) or contradiction (1=0)
			return {
				type: 'unknown',
				variables: uniqueVars,
				degree: 0,
				confidence: 'certain'
			};
		}

		if (degree === 1) {
			return {
				type: 'linear',
				variables: uniqueVars,
				degree: 1,
				confidence: 'certain'
			};
		}

		if (degree === 2) {
			return {
				type: 'quadratic',
				variables: uniqueVars,
				degree: 2,
				confidence: 'certain'
			};
		}

		return {
			type: 'polynomial',
			variables: uniqueVars,
			degree,
			confidence: 'certain'
		};
	}

	// Not a polynomial - check for transcendental
	const transcType = getTranscendentalType(standardForm);

	if (transcType === 'trigonometric') {
		return {
			type: 'trigonometric',
			variables: uniqueVars,
			confidence: 'certain'
		};
	}

	if (transcType === 'exponential') {
		return {
			type: 'exponential',
			variables: uniqueVars,
			confidence: 'certain'
		};
	}

	if (transcType === 'logarithmic') {
		return {
			type: 'logarithmic',
			variables: uniqueVars,
			confidence: 'certain'
		};
	}

	// Mixed or unknown type
	if (containsTranscendental(standardForm)) {
		return {
			type: 'mixed',
			variables: uniqueVars,
			confidence: 'uncertain'
		};
	}

	return {
		type: 'unknown',
		variables: uniqueVars,
		confidence: 'uncertain'
	};
}

/**
 * Detect the variable to solve for.
 * Returns the single variable if exactly one exists, null otherwise.
 */
export function detectVariable(equation: RelationNode): string | null {
	const leftVars = getVariables(equation.left);
	const rightVars = getVariables(equation.right);

	const allVars = new Set([...leftVars, ...rightVars]);

	if (allVars.size === 1) {
		return [...allVars][0];
	}

	return null;
}
