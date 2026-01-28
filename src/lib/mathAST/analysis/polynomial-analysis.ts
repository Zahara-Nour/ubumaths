/**
 * Polynomial Analysis
 *
 * Provides tools for analyzing polynomials:
 * - Extracting coefficients by degree
 * - Identifying leading/constant terms
 * - Classifying by term count (monomial, binomial, trinomial)
 *
 * Works directly on MathNode ASTs without requiring normalization.
 *
 * @module mathAST/analysis/polynomial-analysis
 */

import type { MathNode } from '../types';
import { flattenSumShallow, type SignedTerm } from '../flatten';
import {
	isNumber,
	isVariable,
	isGreek,
	isMultiplication,
	isDivision,
	isOpposite,
	isDelimiter,
	isSuperscript
} from '../guards';
import { number, opposite, multiply, add } from '../factory';
import { getPolynomialDegree } from './expression-classify';
import { getVariables } from '../eval/substitute';

// =============================================================================
// Types
// =============================================================================

/**
 * Information about a single monomial term
 */
export interface MonomialInfo {
	/** The coefficient (as MathNode) */
	readonly coefficient: MathNode;

	/** The degree of this term in the primary variable */
	readonly degree: number;

	/** The original term node (before coefficient extraction) */
	readonly term: MathNode;

	/** Variables present in this term */
	readonly variables: readonly string[];
}

/**
 * Complete polynomial analysis result
 */
export interface PolynomialAnalysis {
	/** Whether the expression is a valid polynomial in the variable */
	readonly isPolynomial: boolean;

	/** Error message if not a polynomial */
	readonly error?: string;

	/** The variable analyzed */
	readonly variable: string;

	/** Total degree of the polynomial */
	readonly degree: number;

	/** Number of non-zero terms */
	readonly termCount: number;

	/** Leading coefficient (coefficient of highest degree term) */
	readonly leadingCoefficient: MathNode;

	/** Constant term (coefficient of degree 0 term) */
	readonly constantTerm: MathNode;

	/** All monomials, sorted by decreasing degree */
	readonly monomials: readonly MonomialInfo[];

	/** Map from degree to coefficient (MathNode) */
	readonly coefficients: ReadonlyMap<number, MathNode>;
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
 * Checks if a node represents the target variable.
 */
function isTargetVariable(node: MathNode, variable: string): boolean {
	if (isVariable(node)) {
		return node.name === variable;
	}
	if (isGreek(node)) {
		return node.letter === variable;
	}
	return false;
}

/**
 * Get the degree of a single term in a variable.
 */
function getTermDegree(node: MathNode, variable: string): number {
	// Variable to the first power
	if (isTargetVariable(node, variable)) {
		return 1;
	}

	// Power: x^n
	if (isSuperscript(node)) {
		if (isTargetVariable(node.base, variable)) {
			if (isNumber(node.superscript)) {
				const exp = parseFloat(node.superscript.value);
				if (Number.isInteger(exp) && exp >= 0) {
					return exp;
				}
			}
		}
		// Could be (x*y)^n - need to recurse
		const baseDegree = getTermDegree(node.base, variable);
		if (isNumber(node.superscript)) {
			const exp = parseFloat(node.superscript.value);
			if (Number.isInteger(exp) && exp >= 0) {
				return baseDegree * exp;
			}
		}
		return 0;
	}

	// Multiplication: check all factors
	if (isMultiplication(node)) {
		return getTermDegree(node.left, variable) + getTermDegree(node.right, variable);
	}

	// Opposite: -x
	if (isOpposite(node)) {
		return getTermDegree(node.operand, variable);
	}

	// Delimiter: (x)
	if (isDelimiter(node)) {
		return getTermDegree(node.content, variable);
	}

	// Division with variable in denominator: not a monomial
	if (isDivision(node)) {
		// Only valid if variable not in denominator
		if (!containsVariable(node.denominator, variable)) {
			return getTermDegree(node.numerator, variable);
		}
	}

	// Anything else (number, other variable, function): degree 0
	return 0;
}

/**
 * Check if node contains the variable.
 */
function containsVariable(node: MathNode, variable: string): boolean {
	const vars = getVariables(node);
	return vars.has(variable);
}

/**
 * Extracts the coefficient from a term.
 * Returns the coefficient and the degree.
 */
function extractCoefficientFromTerm(
	term: MathNode,
	sign: '+' | '-',
	variable: string
): { coefficient: MathNode; degree: number } | null {
	// Handle opposite
	let actualTerm = term;
	let actualSign = sign;

	if (isOpposite(term)) {
		actualTerm = term.operand;
		actualSign = actualSign === '+' ? '-' : '+';
	}

	// Get the degree first
	const degree = getTermDegree(actualTerm, variable);

	// If degree is 0 and doesn't contain the variable, it's a constant term
	if (degree === 0 && !containsVariable(actualTerm, variable)) {
		// The coefficient is the whole term
		const coefficient = applySign(actualTerm, actualSign);
		return { coefficient, degree: 0 };
	}

	// Extract coefficient from the term
	const coefficient = extractCoefficientFromMonomial(actualTerm, variable);
	if (coefficient === null) {
		return null;
	}

	const signedCoeff = applySign(coefficient, actualSign);
	return { coefficient: signedCoeff, degree };
}

/**
 * Extract just the coefficient part of a monomial.
 */
function extractCoefficientFromMonomial(term: MathNode, variable: string): MathNode | null {
	// Just the variable: coefficient is 1
	if (isTargetVariable(term, variable)) {
		return ONE;
	}

	// Power: x^n - coefficient is 1
	if (isSuperscript(term) && isTargetVariable(term.base, variable)) {
		return ONE;
	}

	// Multiplication: separate coefficient from variable parts
	if (isMultiplication(term)) {
		const coeffFactors: MathNode[] = [];
		const varFactors: MathNode[] = [];

		collectFactors(term, variable, coeffFactors, varFactors);

		if (varFactors.length === 0) {
			// No variable factors - this shouldn't happen for degree > 0
			return null;
		}

		if (coeffFactors.length === 0) {
			return ONE;
		}

		return buildProduct(coeffFactors);
	}

	// Division: coeff/denom where variable is in numerator
	if (isDivision(term)) {
		if (containsVariable(term.denominator, variable)) {
			return null; // Not a polynomial term
		}

		const numCoeff = extractCoefficientFromMonomial(term.numerator, variable);
		if (numCoeff === null) {
			return null;
		}

		return {
			type: 'division',
			numerator: numCoeff,
			denominator: term.denominator,
			displayStyle: 'fraction'
		};
	}

	// Delimiter
	if (isDelimiter(term)) {
		return extractCoefficientFromMonomial(term.content, variable);
	}

	// Constant term (no variable)
	if (!containsVariable(term, variable)) {
		return term;
	}

	// Default: coefficient is 1
	return ONE;
}

/**
 * Collect factors into coefficient and variable parts.
 */
function collectFactors(
	node: MathNode,
	variable: string,
	coeffFactors: MathNode[],
	varFactors: MathNode[]
): void {
	if (isMultiplication(node)) {
		collectFactors(node.left, variable, coeffFactors, varFactors);
		collectFactors(node.right, variable, coeffFactors, varFactors);
	} else if (containsVariable(node, variable)) {
		varFactors.push(node);
	} else {
		coeffFactors.push(node);
	}
}

/**
 * Build a product from factors.
 */
function buildProduct(factors: MathNode[]): MathNode {
	if (factors.length === 0) {
		return ONE;
	}
	if (factors.length === 1) {
		return factors[0];
	}

	let result = factors[0];
	for (let i = 1; i < factors.length; i++) {
		result = multiply(result, factors[i], 'implicit');
	}
	return result;
}

/**
 * Apply a sign to a coefficient.
 */
function applySign(coeff: MathNode, sign: '+' | '-'): MathNode {
	if (sign === '+') {
		return coeff;
	}

	// Optimize for simple cases
	if (isNumber(coeff)) {
		if (coeff.value === '1') {
			return MINUS_ONE;
		}
		if (coeff.value === '-1') {
			return ONE;
		}
		const val = parseFloat(coeff.value);
		return number(String(-val));
	}

	// Double negation
	if (isOpposite(coeff)) {
		return coeff.operand;
	}

	return opposite(coeff);
}

/**
 * Add two coefficients.
 */
function addCoefficients(a: MathNode, b: MathNode): MathNode {
	// 0 + x = x
	if (isNumber(a) && a.value === '0') {
		return b;
	}
	if (isNumber(b) && b.value === '0') {
		return a;
	}

	// Numeric addition
	if (isNumber(a) && isNumber(b)) {
		const sum = parseFloat(a.value) + parseFloat(b.value);
		return number(String(sum));
	}

	return add(a, b);
}

// =============================================================================
// Main Analysis Functions
// =============================================================================

/**
 * Analyze a polynomial expression.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to analyze the polynomial in
 * @returns Complete polynomial analysis
 *
 * @example
 * analyzePolynomial(parse('x^2 + 2x + 1'), 'x')
 * // → { degree: 2, leadingCoefficient: 1, constantTerm: 1, ... }
 */
export function analyzePolynomial(node: MathNode, variable: string): PolynomialAnalysis {
	// Check if it's a polynomial first
	const polyDegree = getPolynomialDegree(node, variable);

	if (polyDegree === null) {
		return {
			isPolynomial: false,
			error: 'Expression is not a polynomial in the given variable',
			variable,
			degree: -1,
			termCount: 0,
			leadingCoefficient: ZERO,
			constantTerm: ZERO,
			monomials: [],
			coefficients: new Map()
		};
	}

	// Flatten the sum to get terms
	const terms: readonly SignedTerm[] = flattenSumShallow(node);

	// Extract coefficient and degree for each term
	const coefficientsByDegree = new Map<number, MathNode>();
	const monomials: MonomialInfo[] = [];

	for (const { sign, term } of terms) {
		const extracted = extractCoefficientFromTerm(term, sign, variable);

		if (extracted === null) {
			return {
				isPolynomial: false,
				error: 'Failed to extract coefficient from term',
				variable,
				degree: -1,
				termCount: 0,
				leadingCoefficient: ZERO,
				constantTerm: ZERO,
				monomials: [],
				coefficients: new Map()
			};
		}

		const { coefficient, degree } = extracted;

		// Add to existing coefficient for this degree
		const existing = coefficientsByDegree.get(degree);
		if (existing) {
			coefficientsByDegree.set(degree, addCoefficients(existing, coefficient));
		} else {
			coefficientsByDegree.set(degree, coefficient);
		}

		// Record monomial info
		const termVars = Array.from(getVariables(term));
		monomials.push({
			coefficient,
			degree,
			term,
			variables: termVars
		});
	}

	// Sort monomials by decreasing degree
	monomials.sort((a, b) => b.degree - a.degree);

	// Get leading and constant terms
	const leadingCoefficient = coefficientsByDegree.get(polyDegree) ?? ZERO;
	const constantTerm = coefficientsByDegree.get(0) ?? ZERO;

	// Remove zero coefficients from the map (don't count them)
	Array.from(coefficientsByDegree.entries()).forEach(([deg, coeff]) => {
		if (isNumber(coeff) && coeff.value === '0') {
			coefficientsByDegree.delete(deg);
		}
	});

	return {
		isPolynomial: true,
		variable,
		degree: polyDegree,
		termCount: coefficientsByDegree.size,
		leadingCoefficient,
		constantTerm,
		monomials,
		coefficients: coefficientsByDegree
	};
}

/**
 * Get polynomial coefficients as a map from degree to MathNode.
 *
 * @param node - The polynomial expression
 * @param variable - The variable to analyze
 * @returns Map from degree to coefficient, or null if not a polynomial
 */
export function getPolynomialCoefficients(
	node: MathNode,
	variable: string
): Map<number, MathNode> | null {
	const analysis = analyzePolynomial(node, variable);

	if (!analysis.isPolynomial) {
		return null;
	}

	return new Map(analysis.coefficients);
}

// =============================================================================
// Term Count Classifiers
// =============================================================================

/**
 * Check if expression is a monomial (single term).
 *
 * @param node - Expression to check
 * @returns true if the expression is a monomial
 *
 * @example
 * isMonomial(parse('3x^2'))  // true
 * isMonomial(parse('x + 1')) // false
 */
export function isMonomial(node: MathNode): boolean {
	// Check if there's only one term when flattened
	const terms = flattenSumShallow(node);

	// Filter out terms that are just signs applied to others
	if (terms.length === 1) {
		return true;
	}

	return false;
}

/**
 * Check if expression is a binomial (two terms).
 *
 * @param node - Expression to check
 * @returns true if the expression is a binomial
 *
 * @example
 * isBinomial(parse('x + 1'))     // true
 * isBinomial(parse('x^2 - 1'))   // true
 * isBinomial(parse('x'))         // false
 * isBinomial(parse('x + y + z')) // false
 */
export function isBinomial(node: MathNode): boolean {
	const terms = flattenSumShallow(node);
	return terms.length === 2;
}

/**
 * Check if expression is a trinomial (three terms).
 *
 * @param node - Expression to check
 * @returns true if the expression is a trinomial
 *
 * @example
 * isTrinomial(parse('x^2 + 2x + 1')) // true
 * isTrinomial(parse('x + y + z'))    // true
 * isTrinomial(parse('x + 1'))        // false
 */
export function isTrinomial(node: MathNode): boolean {
	const terms = flattenSumShallow(node);
	return terms.length === 3;
}

/**
 * Get the number of terms in a polynomial expression.
 *
 * @param node - Expression to count terms in
 * @returns Number of terms
 */
export function getTermCount(node: MathNode): number {
	const terms = flattenSumShallow(node);
	return terms.length;
}
