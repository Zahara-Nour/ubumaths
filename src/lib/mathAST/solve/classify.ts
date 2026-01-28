/**
 * Equation Classification
 *
 * Classifies equations to determine solving strategy.
 *
 * @module mathAST/solve/classify
 */

import type { MathNode, RelationNode } from '../types';
import type { ClassificationResult } from './types';
import { subtract } from '../factory';
import { getVariables } from '../eval/substitute';

// Import and re-export from analysis module for backwards compatibility
import {
	containsTranscendental,
	getTranscendentalType,
	getPolynomialDegree,
	isPolynomialIn
} from '../analysis/expression-classify';

export { containsTranscendental, getTranscendentalType, getPolynomialDegree, isPolynomialIn };

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
