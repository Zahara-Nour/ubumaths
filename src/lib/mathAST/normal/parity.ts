/**
 * MathAST Normal Form - Parity Utilities
 *
 * Functions for detecting and handling even/odd function parity.
 * Used during normalization to ensure cos(-x) === cos(x) and sin(-x) === -sin(x).
 */

import type { NormalForm, NormalTerm } from './types.js';
import { negAlgebraic } from './algebraic.js';

// =============================================================================
// Function Parity Lists
// =============================================================================

/**
 * Even functions satisfy f(-x) = f(x).
 * For these, we normalize by removing the negation from the argument.
 */
const EVEN_FUNCTIONS = new Set(['cos', 'cosh', 'abs', 'sec', 'sech']);

/**
 * Odd functions satisfy f(-x) = -f(x).
 * For these, we normalize by removing the negation from the argument
 * and negating the entire result.
 */
const ODD_FUNCTIONS = new Set([
	'sin',
	'sinh',
	'tan',
	'tanh',
	'cot',
	'coth',
	'csc',
	'csch',
	'arcsin',
	'arctan',
	'arcsinh',
	'arctanh'
]);

// =============================================================================
// Parity Detection
// =============================================================================

/**
 * Checks if a function is even (f(-x) = f(x)).
 *
 * @param name - The function name
 * @returns true if the function is even
 */
export function isEvenFunction(name: string): boolean {
	return EVEN_FUNCTIONS.has(name);
}

/**
 * Checks if a function is odd (f(-x) = -f(x)).
 *
 * @param name - The function name
 * @returns true if the function is odd
 */
export function isOddFunction(name: string): boolean {
	return ODD_FUNCTIONS.has(name);
}

// =============================================================================
// Negative Factoring
// =============================================================================

/**
 * Checks if ALL terms of a polynomial have coefficients where all algebraic terms
 * have negative rational coefficients.
 *
 * @param poly - The polynomial (array of NormalTerm)
 * @returns true if -1 can be factored out
 */
function allTermsNegative(poly: readonly NormalTerm[]): boolean {
	if (poly.length === 0) {
		return false;
	}

	return poly.every((term) => {
		// Each term's coefficient must have all negative rational parts
		return (
			term.coefficient.terms.length > 0 && term.coefficient.terms.every((at) => at.rational.n < 0n)
		);
	});
}

/**
 * Negates a polynomial by negating each term's coefficient.
 *
 * @param poly - The polynomial to negate
 * @returns The negated polynomial
 */
function negatePolynomial(poly: readonly NormalTerm[]): NormalTerm[] {
	return poly.map((term) => ({
		coefficient: negAlgebraic(term.coefficient),
		monomial: term.monomial
	}));
}

/**
 * Result of trying to factor out -1 from a NormalForm.
 * Contains the positive numerator if factoring is possible.
 */
export interface NegativeFactorResult {
	/** The positive version of the numerator (with -1 factored out) */
	positiveNumerator: readonly NormalTerm[];
	/** Copy of the original denominator */
	denominator: readonly NormalTerm[];
}

/**
 * Detects if a NormalForm can be written as -u where u is "positive".
 * Returns the positive parts if possible, null otherwise.
 *
 * A NormalForm can factor out -1 if ALL numerator terms have ALL negative coefficients.
 *
 * @example
 * - `-x` -> returns positive parts for `x`
 * - `-2x` -> returns positive parts for `2x`
 * - `-x - 2y` -> returns positive parts for `x + 2y`
 * - `x - y` -> returns null (mixed signs)
 * - `-x + 1` -> returns null (mixed signs)
 *
 * @param form - The NormalForm to analyze
 * @returns The positive parts if -1 can be factored out, null otherwise
 */
export function canFactorOutNegative(form: NormalForm): NegativeFactorResult | null {
	// Must have a non-empty numerator
	if (form.numerator.length === 0) {
		return null;
	}

	// Check if all numerator terms are negative
	if (!allTermsNegative(form.numerator)) {
		return null;
	}

	// Create the positive version by negating the numerator
	const positiveNumerator = negatePolynomial(form.numerator);

	return {
		positiveNumerator,
		denominator: [...form.denominator]
	};
}
