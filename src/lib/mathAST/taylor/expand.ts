/**
 * Taylor Series Expansion
 *
 * Computes Taylor (or Maclaurin) series expansions of mathematical expressions.
 * Uses repeated differentiation and evaluation to build the polynomial approximation.
 *
 * Taylor series formula:
 *   f(x) = Sum_{n=0}^{N-1} (f^(n)(a) / n!) * (x - a)^n
 *
 * For Maclaurin series (a = 0):
 *   f(x) = f(0) + f'(0)*x + f''(0)*x^2/2! + f'''(0)*x^3/6 + ...
 *
 * @module mathAST/taylor
 */

import type { MathNode } from '../types';
import type { TaylorOptions } from './types';
import type { FunctionBindings } from '../eval/function-bindings';
import type { Rational } from '../normal/types';
import { DEFAULT_TAYLOR_OPTIONS, MAX_TAYLOR_TERMS, TaylorError } from './types';
import { differentiate } from '../differentiation';
import { evaluate } from '../eval/evaluate';
import { substitute } from '../eval/substitute';
import { number, variable, add, multiply, power, opposite, divide } from '../factory';
import { rationalToNumber } from '../normal/rational';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Compute factorial of n.
 * Returns as a number for coefficient computation.
 *
 * @param n - Non-negative integer
 * @returns n!
 */
function factorial(n: number): number {
	if (n < 0 || !Number.isInteger(n)) {
		throw new TaylorError(`Factorial requires non-negative integer, got ${n}`);
	}
	if (n === 0 || n === 1) return 1;

	let result = 1;
	for (let i = 2; i <= n; i++) {
		result *= i;
	}
	return result;
}

/**
 * Check if a value is effectively zero within floating-point tolerance.
 *
 * @param value - Number to check
 * @param tolerance - Tolerance threshold (default: 1e-15)
 * @returns True if value is close to zero
 */
function isEffectivelyZero(value: number, tolerance: number = 1e-15): boolean {
	return Math.abs(value) < tolerance;
}

/**
 * Convert evaluation result to a number.
 * Handles both Rational and number values.
 *
 * @param value - Evaluation result value
 * @returns Numeric value
 */
function valueToNumber(value: Rational | number): number {
	if (typeof value === 'number') {
		return value;
	}
	// Rational type
	return rationalToNumber(value);
}

/**
 * Simplify a coefficient for display.
 * Returns nice fractions when possible.
 *
 * @param value - Coefficient value
 * @returns Simplified coefficient as MathNode
 */
function coefficientToNode(value: number): MathNode {
	// Handle zero
	if (isEffectivelyZero(value)) {
		return number('0');
	}

	// Handle integers
	if (Number.isInteger(value)) {
		return number(value.toString());
	}

	// Try to find a simple fraction representation
	// Check denominators up to 100
	for (let d = 2; d <= 100; d++) {
		const n = value * d;
		if (Number.isInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-10) {
			const numerator = Math.round(n);
			const g = gcd(Math.abs(numerator), d);
			const reducedNum = numerator / g;
			const reducedDen = d / g;
			if (reducedDen === 1) {
				return number(reducedNum.toString());
			}
			return divide(number(reducedNum.toString()), number(reducedDen.toString()), 'fraction');
		}
	}

	// Fall back to decimal representation
	// Use reasonable precision
	const formatted = value.toPrecision(10).replace(/\.?0+$/, '');
	return number(formatted);
}

/**
 * Simple GCD for positive integers.
 */
function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b !== 0) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	return a;
}

/**
 * Build a term of the Taylor series.
 *
 * @param coefficient - The coefficient (f^(n)(a) / n!)
 * @param varNode - The variable node
 * @param center - The center point
 * @param degree - The power (n)
 * @returns The term as a MathNode
 */
function buildTerm(
	coefficient: number,
	varNode: MathNode,
	center: number,
	degree: number
): MathNode | null {
	// Skip zero coefficients
	if (isEffectivelyZero(coefficient)) {
		return null;
	}

	// Build (x - a) term
	let baseTerm: MathNode;
	if (center === 0) {
		baseTerm = varNode;
	} else if (center > 0) {
		// (x - a)
		baseTerm = add(varNode, opposite(number(center.toString())));
	} else {
		// (x - (-a)) = (x + |a|)
		baseTerm = add(varNode, number(Math.abs(center).toString()));
	}

	// Degree 0: just the coefficient
	if (degree === 0) {
		return coefficientToNode(coefficient);
	}

	// Build coefficient node
	const coeffNode = coefficientToNode(Math.abs(coefficient));
	const isNegative = coefficient < 0;

	// Degree 1: coeff * x or coeff * (x - a)
	if (degree === 1) {
		let term: MathNode;
		// Handle coefficient = 1 case
		if (Math.abs(coefficient) === 1) {
			term = baseTerm;
		} else {
			term = multiply(coeffNode, baseTerm, 'implicit');
		}
		return isNegative ? opposite(term) : term;
	}

	// Degree > 1: coeff * (x - a)^n
	const powerTerm = power(baseTerm, number(degree.toString()));

	let term: MathNode;
	// Handle coefficient = 1 case
	if (Math.abs(coefficient) === 1) {
		term = powerTerm;
	} else {
		term = multiply(coeffNode, powerTerm, 'implicit');
	}

	return isNegative ? opposite(term) : term;
}

// =============================================================================
// Main Taylor Expansion Function
// =============================================================================

/**
 * Compute the Taylor series expansion of an expression.
 *
 * The Taylor series is computed by:
 * 1. Repeatedly differentiating the expression
 * 2. Evaluating each derivative at the center point
 * 3. Building the polynomial sum
 *
 * @param expr - The expression to expand
 * @param options - Taylor expansion options
 * @param functions - Optional function bindings for generic functions
 * @returns The Taylor polynomial as a MathNode
 *
 * @throws TaylorError if:
 *   - Number of terms exceeds MAX_TAYLOR_TERMS (20)
 *   - Expression cannot be differentiated
 *   - Derivatives cannot be evaluated at the center
 *
 * @example
 * ```typescript
 * // Maclaurin series of sin(x), 5 terms
 * const sinExpr = func('sin', [variable('x')]);
 * const taylor = taylorExpand(sinExpr, { terms: 5 });
 * // Result: x - x^3/6 + x^5/120
 *
 * // Taylor series of e^x at x=0, 4 terms
 * const expExpr = func('exp', [variable('x')]);
 * const taylor = taylorExpand(expExpr, { terms: 4 });
 * // Result: 1 + x + x^2/2 + x^3/6
 *
 * // Taylor series centered at a=1
 * const lnExpr = func('ln', [variable('x')]);
 * const taylor = taylorExpand(lnExpr, { terms: 4, center: 1 });
 * // Result: (x-1) - (x-1)^2/2 + (x-1)^3/3 - (x-1)^4/4
 * ```
 */
export function taylorExpand(
	expr: MathNode,
	options?: TaylorOptions,
	functions?: FunctionBindings
): MathNode {
	const varName = options?.variable ?? DEFAULT_TAYLOR_OPTIONS.variable;
	const center = options?.center ?? DEFAULT_TAYLOR_OPTIONS.center;
	const numTerms = options?.terms ?? DEFAULT_TAYLOR_OPTIONS.terms;

	// Validate number of terms
	if (numTerms < 1) {
		throw new TaylorError('Number of terms must be at least 1', undefined, `Got ${numTerms}`);
	}
	if (numTerms > MAX_TAYLOR_TERMS) {
		throw new TaylorError(
			`Number of terms exceeds maximum of ${MAX_TAYLOR_TERMS}`,
			undefined,
			`Got ${numTerms}. This limit prevents performance issues.`
		);
	}

	// Variable node for building terms
	const varNode = variable(varName);

	// Collect non-zero terms
	const terms: MathNode[] = [];
	let currentExpr = expr;

	for (let n = 0; n < numTerms; n++) {
		try {
			// Evaluate the nth derivative at the center
			const substituted = substitute(currentExpr, { [varName]: center });
			const evalResult = evaluate(substituted, { mode: 'decimal', functions });
			const derivativeValue = valueToNumber(evalResult.value);

			// Compute coefficient: f^(n)(a) / n!
			const coefficient = derivativeValue / factorial(n);

			// Build the term if coefficient is non-zero
			const term = buildTerm(coefficient, varNode, center, n);
			if (term !== null) {
				terms.push(term);
			}

			// Differentiate for next iteration (except on last iteration)
			if (n < numTerms - 1) {
				currentExpr = differentiate(currentExpr, {
					variable: varName,
					simplify: true,
					functions
				});
			}
		} catch (err) {
			// If evaluation fails (e.g., at a point where function is undefined),
			// we still try to continue with remaining terms
			const message = err instanceof Error ? err.message : 'Unknown error';
			throw new TaylorError(
				`Cannot compute Taylor term ${n} at center=${center}`,
				undefined,
				`Error during ${n === 0 ? 'evaluation' : 'differentiation/evaluation'}: ${message}`
			);
		}
	}

	// If all terms are zero, return 0
	if (terms.length === 0) {
		return number('0');
	}

	// Build the sum
	// Start with the first term
	let result = terms[0];

	// Add remaining terms
	for (let i = 1; i < terms.length; i++) {
		const term = terms[i];
		// Handle negative terms (wrapped in opposite)
		if (term.type === 'opposite') {
			// Use subtraction for negative terms for better formatting
			result = add(result, term);
		} else {
			result = add(result, term);
		}
	}

	return result;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Compute Maclaurin series (Taylor series centered at 0).
 *
 * @param expr - The expression to expand
 * @param numTerms - Number of terms (default: 5)
 * @param varName - Variable name (default: 'x')
 * @param functions - Optional function bindings
 * @returns The Maclaurin polynomial
 *
 * @example
 * ```typescript
 * // sin(x) ~ x - x^3/6 + x^5/120
 * const result = maclaurin(func('sin', [variable('x')]), 3);
 * ```
 */
export function maclaurin(
	expr: MathNode,
	numTerms: number = 5,
	varName: string = 'x',
	functions?: FunctionBindings
): MathNode {
	return taylorExpand(expr, { variable: varName, center: 0, terms: numTerms }, functions);
}
