/**
 * Quadratic Combination Analysis
 *
 * Extracts the 6 coefficients of a degree ≤ 2 polynomial in two variables:
 *   A·x² + B·x·y + C·y² + D·x + E·y + F = 0
 *
 * Used by geometry-core to classify conics from courbe() equations.
 *
 * @module mathAST/analysis/quadratic-combination
 */

import type { MathNode } from '../types';
import { flattenSumShallow, type SignedTerm } from '../flatten';
import {
	isOpposite,
	isMultiplication,
	isDivision,
	isDelimiter,
	isSuperscript,
	isNumber
} from '../guards';
import {
	ZERO,
	isTargetVariableIn,
	containsAnyVariable,
	applySign,
	addCoefficients
} from './coefficient-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of quadratic combination extraction.
 *
 * For variables ['x', 'y'], the coefficient keys are:
 * 'x^2', 'xy', 'y^2', 'x', 'y'
 * Plus a separate `constant` field for the degree-0 term.
 */
export interface QuadraticCombinationResult {
	/** Coefficients for each monomial (keys: 'x^2', 'xy', 'y^2', 'x', 'y'). */
	readonly coefficients: ReadonlyMap<string, MathNode>;
	/** Constant term (degree 0). */
	readonly constant: MathNode;
	/** The variables analyzed. */
	readonly variables: readonly [string, string];
	/** Whether the expression is a valid polynomial of degree ≤ 2 in the given variables. */
	readonly isQuadratic: boolean;
	/** Error message if isQuadratic is false. */
	readonly error?: string;
}

// =============================================================================
// Monomial key helpers
// =============================================================================

/** Build the 5 monomial keys for two variables: x², xy, y², x, y */
function monomialKeys(v1: string, v2: string): string[] {
	return [`${v1}^2`, `${v1}${v2}`, `${v2}^2`, v1, v2];
}

// =============================================================================
// Quadratic monomial extraction from a single product term
// =============================================================================

interface ExtractedQuadraticTerm {
	/** The monomial key ('x^2', 'xy', 'y^2', 'x', 'y') or null for constant. */
	readonly monomialKey: string | null;
	/** The coefficient (everything that isn't a target variable). */
	readonly coefficient: MathNode;
}

/**
 * Flatten a multiplication tree into factors.
 */
function flattenProduct(node: MathNode): MathNode[] {
	if (isMultiplication(node)) {
		return [...flattenProduct(node.left), ...flattenProduct(node.right)];
	}
	return [node];
}

/**
 * Count variable occurrences in a list of factors.
 * Returns a map { varName → exponent } and the non-variable factors.
 *
 * Handles: x, x^2, x*x, 3*x^2*y
 */
function countVariablesInFactors(
	factors: MathNode[],
	variables: readonly string[]
): { varDegrees: Map<string, number>; coeffFactors: MathNode[] } | null {
	const varDegrees = new Map<string, number>();
	const coeffFactors: MathNode[] = [];

	for (const factor of factors) {
		// Case: bare variable (x, y)
		const varName = isTargetVariableIn(factor, variables);
		if (varName !== null) {
			varDegrees.set(varName, (varDegrees.get(varName) ?? 0) + 1);
			continue;
		}

		// Case: variable with exponent (x^2)
		if (isSuperscript(factor)) {
			const baseVar = isTargetVariableIn(factor.base, variables);
			if (baseVar !== null) {
				if (!isNumber(factor.superscript)) return null; // non-numeric exponent
				const exp = parseFloat(factor.superscript.value);
				if (!Number.isInteger(exp) || exp < 0) return null;
				varDegrees.set(baseVar, (varDegrees.get(baseVar) ?? 0) + exp);
				continue;
			}
		}

		// Case: contains target variable inside complex expression → reject
		if (containsAnyVariable(factor, variables)) {
			return null;
		}

		// Otherwise: coefficient factor
		coeffFactors.push(factor);
	}

	return { varDegrees, coeffFactors };
}

/**
 * Build a product MathNode from factors, returning number('1') if empty.
 */
function buildProduct(factors: readonly MathNode[]): MathNode {
	if (factors.length === 0) return { type: 'number', value: '1' } as MathNode;
	if (factors.length === 1) return factors[0];
	let result = factors[0];
	for (let i = 1; i < factors.length; i++) {
		result = {
			type: 'multiplication',
			left: result,
			right: factors[i],
			variant: 'implicit'
		} as MathNode;
	}
	return result;
}

/**
 * Get the monomial key from variable degrees.
 * Returns null for constant (no variables), the key string, or undefined if degree > 2.
 */
function monomialKeyFromDegrees(
	varDegrees: Map<string, number>,
	v1: string,
	v2: string
): string | null | undefined {
	const d1 = varDegrees.get(v1) ?? 0;
	const d2 = varDegrees.get(v2) ?? 0;
	const totalDegree = d1 + d2;

	if (totalDegree > 2) return undefined; // too high
	if (totalDegree === 0) return null; // constant

	if (d1 === 2 && d2 === 0) return `${v1}^2`;
	if (d1 === 0 && d2 === 2) return `${v2}^2`;
	if (d1 === 1 && d2 === 1) return `${v1}${v2}`;
	if (d1 === 1 && d2 === 0) return v1;
	if (d1 === 0 && d2 === 1) return v2;

	return undefined; // shouldn't happen
}

/**
 * Extract quadratic monomial info from a single term (no sign handling).
 *
 * Returns the monomial key and coefficient, or null if invalid (degree > 2 or non-polynomial).
 */
function extractQuadraticMonomial(
	term: MathNode,
	variables: readonly [string, string]
): ExtractedQuadraticTerm | null {
	const [v1, v2] = variables;

	// Unwrap parentheses
	if (isDelimiter(term)) {
		return extractQuadraticMonomial(term.content, variables);
	}

	// Case: bare variable (x or y)
	const varName = isTargetVariableIn(term, variables);
	if (varName !== null) {
		return { monomialKey: varName, coefficient: { type: 'number', value: '1' } as MathNode };
	}

	// Case: x^n
	if (isSuperscript(term)) {
		const baseVar = isTargetVariableIn(term.base, variables);
		if (baseVar !== null) {
			if (!isNumber(term.superscript)) return null;
			const exp = parseFloat(term.superscript.value);
			if (!Number.isInteger(exp) || exp < 0 || exp > 2) return null;
			if (exp === 0)
				return { monomialKey: null, coefficient: { type: 'number', value: '1' } as MathNode };
			if (exp === 1)
				return { monomialKey: baseVar, coefficient: { type: 'number', value: '1' } as MathNode };
			// exp === 2
			return {
				monomialKey: `${baseVar}^2`,
				coefficient: { type: 'number', value: '1' } as MathNode
			};
		}
		// base contains variable in complex way → check via product path below
		if (containsAnyVariable(term, variables)) return null;
		// Constant like 2^3
		return { monomialKey: null, coefficient: term };
	}

	// Case: multiplication (3*x^2, x*y, 2*x*y, etc.)
	if (isMultiplication(term)) {
		const factors = flattenProduct(term);
		const result = countVariablesInFactors(factors, variables);
		if (result === null) return null;

		const { varDegrees, coeffFactors } = result;
		const key = monomialKeyFromDegrees(varDegrees, v1, v2);
		if (key === undefined) return null; // degree > 2

		return { monomialKey: key, coefficient: buildProduct(coeffFactors) };
	}

	// Case: division (x²/4, etc.)
	if (isDivision(term)) {
		// Denominator must not contain target variables
		if (containsAnyVariable(term.denominator, variables)) return null;

		const numResult = extractQuadraticMonomial(term.numerator, variables);
		if (numResult === null) return null;

		return {
			monomialKey: numResult.monomialKey,
			coefficient: {
				type: 'division',
				numerator: numResult.coefficient,
				denominator: term.denominator,
				variant: 'fraction'
			} as MathNode
		};
	}

	// Case: no target variables → constant
	if (!containsAnyVariable(term, variables)) {
		return { monomialKey: null, coefficient: term };
	}

	// Contains variables in unrecognizable form
	return null;
}

// =============================================================================
// Main export
// =============================================================================

/**
 * Extract the 6 coefficients of a degree ≤ 2 polynomial in two variables.
 *
 * @param node - The expression to analyze (already in form F where F = 0)
 * @param variables - Exactly two variable names, e.g. ['x', 'y']
 * @returns QuadraticCombinationResult with monomial coefficients
 *
 * @example
 * const result = extractQuadraticCombination(parse('x^2 + y^2 - 9'), ['x', 'y']);
 * result.coefficients.get('x^2') // → number('1')
 * result.coefficients.get('y^2') // → number('1')
 * result.constant                // → number('-9')
 */
export function extractQuadraticCombination(
	node: MathNode,
	variables: readonly [string, string]
): QuadraticCombinationResult {
	const [v1, v2] = variables;
	const keys = monomialKeys(v1, v2);
	const coefficients = new Map<string, MathNode>(keys.map((k) => [k, ZERO]));
	let constant: MathNode = ZERO;

	const terms: readonly SignedTerm[] = flattenSumShallow(node);

	for (const { sign, term } of terms) {
		let actualTerm = term;
		let actualSign = sign;

		if (isOpposite(term)) {
			actualTerm = term.operand;
			actualSign = actualSign === '+' ? '-' : '+';
		}

		const extracted = extractQuadraticMonomial(actualTerm, variables);

		if (extracted === null) {
			return {
				coefficients,
				constant,
				variables,
				isQuadratic: false,
				error: 'Non-polynomial or degree > 2 term detected'
			};
		}

		const signedCoeff = applySign(extracted.coefficient, actualSign);

		if (extracted.monomialKey === null) {
			// Constant term
			constant = addCoefficients(constant, signedCoeff);
		} else {
			const existing = coefficients.get(extracted.monomialKey)!;
			coefficients.set(extracted.monomialKey, addCoefficients(existing, signedCoeff));
		}
	}

	return {
		coefficients,
		constant,
		variables,
		isQuadratic: true
	};
}
