/**
 * MathAST Normal Form - Univariate Polynomial GCD
 *
 * Implements polynomial GCD computation for univariate polynomials
 * using the Euclidean algorithm with content extraction.
 *
 * Key algorithms:
 * - checkUnivariate: detect if polynomial is univariate
 * - toUnivariateView / fromUnivariateView: convert between representations
 * - divideUnivariate: polynomial long division
 * - gcdUnivariate: Euclidean algorithm for polynomial GCD
 * - extractContent: extract numeric GCD of coefficients
 */

import type { MathNode } from '../types';
import type { AlgebraicCoefficient, NormalTerm, SymbolicFactor } from './types';
import {
	ALGEBRAIC_ZERO,
	ALGEBRAIC_ONE,
	addAlgebraic,
	subAlgebraic,
	mulAlgebraic,
	divAlgebraic,
	gcdAlgebraic,
	isZeroAlgebraic,
	isOneAlgebraic,
	algebraicEquals
} from './algebraic';
import { hashNode, nodesEqual } from './monomial';
import { normalTerm, constantTerm } from './term';
import { collectLikeTerms, isZeroPolynomial, isOnePolynomial } from './polynomial';
import { isInteger } from './rational';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of checking if a polynomial is univariate.
 */
export interface UnivariateCheckResult {
	/** Whether the polynomial is univariate */
	isUnivariate: boolean;
	/** The single variable if univariate */
	variable?: MathNode;
	/** Reason for rejection if not univariate */
	reason?: 'multivariate' | 'non-integer-exponent' | 'negative-exponent' | 'empty';
}

/**
 * Dense representation of a univariate polynomial.
 *
 * coefficients[i] is the coefficient of x^i.
 * coefficients[degree] is the leading coefficient (non-zero).
 *
 * @example
 * // 3x^2 + 2x + 1
 * { variable: x, coefficients: [1, 2, 3], degree: 2 }
 */
export interface UnivariateView {
	/** The polynomial variable */
	readonly variable: MathNode;
	/** Coefficients indexed by degree (coefficients[i] = coefficient of x^i) */
	readonly coefficients: AlgebraicCoefficient[];
	/** Highest degree with non-zero coefficient */
	readonly degree: number;
}

/**
 * Result of polynomial division.
 */
export interface DivisionResult {
	/** Quotient polynomial */
	quotient: UnivariateView;
	/** Remainder polynomial */
	remainder: UnivariateView;
	/** Whether division was exact (remainder = 0) */
	exact: boolean;
}

/**
 * Result of content extraction.
 */
export interface ContentResult {
	/** The content (GCD of all coefficients) */
	content: AlgebraicCoefficient;
	/** The primitive part (polynomial divided by content) */
	primitive: UnivariateView;
}

// =============================================================================
// Detection: Is the polynomial univariate?
// =============================================================================

/**
 * Checks if a polynomial (list of NormalTerms) is univariate.
 *
 * A polynomial is univariate if:
 * 1. All non-constant terms have exactly one symbolic variable
 * 2. All terms use the same variable
 * 3. All exponents are positive integers
 *
 * @param terms - The polynomial as array of NormalTerms
 * @returns Result indicating if univariate and the variable used
 */
export function checkUnivariate(terms: readonly NormalTerm[]): UnivariateCheckResult {
	if (terms.length === 0) {
		return { isUnivariate: true, variable: undefined };
	}

	let foundVariable: MathNode | undefined;

	for (const term of terms) {
		// Skip constant terms (empty monomial)
		if (term.monomial.length === 0) {
			continue;
		}

		// Check each factor in the monomial
		for (const factor of term.monomial) {
			// Check exponent is a positive integer
			if (!isInteger(factor.exponent)) {
				return { isUnivariate: false, reason: 'non-integer-exponent' };
			}
			if (factor.exponent.n <= 0n) {
				return { isUnivariate: false, reason: 'negative-exponent' };
			}

			// Check variable consistency
			if (foundVariable === undefined) {
				foundVariable = factor.base;
			} else if (!nodesEqual(foundVariable, factor.base)) {
				return { isUnivariate: false, reason: 'multivariate' };
			}
		}

		// Multivariate check: term has multiple different factors
		if (term.monomial.length > 1) {
			// Check if all factors have the same base (just different powers combined)
			const firstBase = term.monomial[0].base;
			for (let i = 1; i < term.monomial.length; i++) {
				if (!nodesEqual(firstBase, term.monomial[i].base)) {
					return { isUnivariate: false, reason: 'multivariate' };
				}
			}
		}
	}

	return {
		isUnivariate: true,
		variable: foundVariable
	};
}

// =============================================================================
// Conversion: NormalTerm[] <-> UnivariateView
// =============================================================================

/**
 * Converts a list of NormalTerms to a dense univariate view.
 *
 * @param terms - The polynomial terms
 * @param variable - The polynomial variable
 * @returns Dense coefficient array representation
 */
export function toUnivariateView(terms: readonly NormalTerm[], variable: MathNode): UnivariateView {
	if (terms.length === 0) {
		return {
			variable,
			coefficients: [ALGEBRAIC_ZERO],
			degree: 0
		};
	}

	// Find maximum degree
	let maxDegree = 0;
	for (const term of terms) {
		const deg = getTermDegree(term, variable);
		if (deg > maxDegree) maxDegree = deg;
	}

	// Initialize dense array with zeros (using Array.from to avoid shared references)
	const coefficients: AlgebraicCoefficient[] = Array.from(
		{ length: maxDegree + 1 },
		() => ALGEBRAIC_ZERO
	);

	// Populate coefficients
	for (const term of terms) {
		const deg = getTermDegree(term, variable);
		coefficients[deg] = addAlgebraic(coefficients[deg], term.coefficient);
	}

	// Find actual degree (highest non-zero coefficient)
	let actualDegree = maxDegree;
	while (actualDegree > 0 && isZeroAlgebraic(coefficients[actualDegree])) {
		actualDegree--;
	}

	// Trim trailing zeros (except keep at least one coefficient)
	if (actualDegree < maxDegree) {
		coefficients.length = actualDegree + 1;
	}

	return {
		variable,
		coefficients,
		degree: actualDegree
	};
}

/**
 * Gets the degree of a term with respect to a variable.
 *
 * @param term - The normal term
 * @param variable - The variable to check
 * @returns The degree (exponent) of the variable in this term
 */
function getTermDegree(term: NormalTerm, variable: MathNode): number {
	if (term.monomial.length === 0) return 0;

	let totalDegree = 0;
	for (const factor of term.monomial) {
		if (nodesEqual(factor.base, variable)) {
			// Accumulate exponents (for terms like x * x = x^2)
			totalDegree += Number(factor.exponent.n);
		}
	}
	return totalDegree;
}

/**
 * Converts a univariate view back to NormalTerm array.
 *
 * @param view - The univariate polynomial view
 * @returns Array of NormalTerms
 */
export function fromUnivariateView(view: UnivariateView): NormalTerm[] {
	const terms: NormalTerm[] = [];

	for (let deg = 0; deg <= view.degree; deg++) {
		const coeff = view.coefficients[deg];
		if (!isZeroAlgebraic(coeff)) {
			if (deg === 0) {
				// Constant term
				terms.push(constantTerm(coeff));
			} else {
				// Term with variable: coeff * x^deg
				const factor: SymbolicFactor = {
					base: view.variable,
					exponent: { n: BigInt(deg), d: 1n }
				};
				terms.push(normalTerm(coeff, [factor]));
			}
		}
	}

	// Return at least zero polynomial if all coefficients are zero
	if (terms.length === 0) {
		return [constantTerm(ALGEBRAIC_ZERO)];
	}

	return collectLikeTerms(terms);
}

// =============================================================================
// Polynomial Arithmetic in UnivariateView
// =============================================================================

/**
 * Creates a zero polynomial.
 */
export function zeroUnivariateView(variable: MathNode): UnivariateView {
	return {
		variable,
		coefficients: [ALGEBRAIC_ZERO],
		degree: 0
	};
}

/**
 * Creates a constant polynomial.
 */
export function constantUnivariateView(
	variable: MathNode,
	value: AlgebraicCoefficient
): UnivariateView {
	return {
		variable,
		coefficients: [value],
		degree: 0
	};
}

/**
 * Checks if a univariate view represents zero.
 */
export function isZeroUnivariate(view: UnivariateView): boolean {
	return view.degree === 0 && isZeroAlgebraic(view.coefficients[0]);
}

/**
 * Checks if a univariate view represents one.
 */
export function isOneUnivariate(view: UnivariateView): boolean {
	return view.degree === 0 && isOneAlgebraic(view.coefficients[0]);
}

/**
 * Multiplies a univariate polynomial by a scalar.
 */
export function scalarMulUnivariate(
	view: UnivariateView,
	scalar: AlgebraicCoefficient
): UnivariateView {
	if (isZeroAlgebraic(scalar)) {
		return zeroUnivariateView(view.variable);
	}
	if (isOneAlgebraic(scalar)) {
		return view;
	}

	const newCoeffs = view.coefficients.map((c) => mulAlgebraic(c, scalar));

	// Recalculate degree
	let newDegree = view.degree;
	while (newDegree > 0 && isZeroAlgebraic(newCoeffs[newDegree])) {
		newDegree--;
	}

	return {
		variable: view.variable,
		coefficients: newCoeffs,
		degree: newDegree
	};
}

/**
 * Subtracts two univariate polynomials: a - b.
 */
export function subUnivariate(a: UnivariateView, b: UnivariateView): UnivariateView {
	const maxDeg = Math.max(a.degree, b.degree);
	const result: AlgebraicCoefficient[] = new Array(maxDeg + 1);

	for (let i = 0; i <= maxDeg; i++) {
		const aCoeff = i <= a.degree ? a.coefficients[i] : ALGEBRAIC_ZERO;
		const bCoeff = i <= b.degree ? b.coefficients[i] : ALGEBRAIC_ZERO;
		result[i] = subAlgebraic(aCoeff, bCoeff);
	}

	// Find actual degree
	let actualDegree = maxDeg;
	while (actualDegree > 0 && isZeroAlgebraic(result[actualDegree])) {
		actualDegree--;
	}

	return {
		variable: a.variable,
		coefficients: result.slice(0, actualDegree + 1),
		degree: actualDegree
	};
}

// =============================================================================
// Polynomial Division
// =============================================================================

/**
 * Performs polynomial long division: dividend / divisor.
 *
 * Returns quotient and remainder such that:
 * dividend = quotient * divisor + remainder
 * with deg(remainder) < deg(divisor)
 *
 * @param dividend - The polynomial to divide
 * @param divisor - The polynomial to divide by
 * @returns Division result with quotient, remainder, and exactness flag
 */
export function divideUnivariate(
	dividend: UnivariateView,
	divisor: UnivariateView
): DivisionResult | null {
	// Cannot divide by zero
	if (isZeroUnivariate(divisor)) {
		throw new Error('Division by zero polynomial');
	}

	// If dividend is zero, result is zero
	if (isZeroUnivariate(dividend)) {
		return {
			quotient: zeroUnivariateView(dividend.variable),
			remainder: zeroUnivariateView(dividend.variable),
			exact: true
		};
	}

	// If divisor degree > dividend degree, quotient is 0, remainder is dividend
	if (divisor.degree > dividend.degree) {
		return {
			quotient: zeroUnivariateView(dividend.variable),
			remainder: dividend,
			exact: false
		};
	}

	// Initialize remainder as copy of dividend
	const remainder = [...dividend.coefficients];
	let remainderDegree = dividend.degree;

	// Initialize quotient with zeros
	const quotientDegree = dividend.degree - divisor.degree;
	const quotient: AlgebraicCoefficient[] = new Array(quotientDegree + 1).fill(ALGEBRAIC_ZERO);

	// Leading coefficient of divisor
	const divisorLead = divisor.coefficients[divisor.degree];

	// Polynomial long division
	while (remainderDegree >= divisor.degree && !isZeroAlgebraic(remainder[remainderDegree])) {
		// Compute quotient coefficient: lead(remainder) / lead(divisor)
		const quotientCoeff = divAlgebraic(remainder[remainderDegree], divisorLead);

		// If division not exact in our domain, fail
		if (quotientCoeff === null) {
			return null;
		}

		const degreeDiff = remainderDegree - divisor.degree;
		quotient[degreeDiff] = quotientCoeff;

		// Subtract quotientCoeff * x^degreeDiff * divisor from remainder
		for (let i = 0; i <= divisor.degree; i++) {
			const subtractTerm = mulAlgebraic(quotientCoeff, divisor.coefficients[i]);
			remainder[i + degreeDiff] = subAlgebraic(remainder[i + degreeDiff], subtractTerm);
		}

		// Update remainder degree
		while (remainderDegree > 0 && isZeroAlgebraic(remainder[remainderDegree])) {
			remainderDegree--;
		}
	}

	// Trim trailing zeros from quotient
	let actualQuotientDeg = quotientDegree;
	while (actualQuotientDeg > 0 && isZeroAlgebraic(quotient[actualQuotientDeg])) {
		actualQuotientDeg--;
	}

	const quotientView: UnivariateView = {
		variable: dividend.variable,
		coefficients: quotient.slice(0, actualQuotientDeg + 1),
		degree: actualQuotientDeg
	};

	const remainderView: UnivariateView = {
		variable: dividend.variable,
		coefficients: remainder.slice(0, remainderDegree + 1),
		degree: remainderDegree
	};

	return {
		quotient: quotientView,
		remainder: remainderView,
		exact: isZeroUnivariate(remainderView)
	};
}

// =============================================================================
// Content Extraction
// =============================================================================

/**
 * Extracts the content (GCD of all coefficients) from a polynomial.
 *
 * Returns the content and the primitive part (polynomial / content).
 *
 * @param view - The univariate polynomial
 * @returns Content and primitive part
 */
export function extractContent(view: UnivariateView): ContentResult {
	if (isZeroUnivariate(view)) {
		return {
			content: ALGEBRAIC_ZERO,
			primitive: view
		};
	}

	// Compute GCD of all non-zero coefficients
	// Initialize to zero; gcd(0, x) = x ensures first non-zero coefficient becomes seed
	let content: AlgebraicCoefficient = ALGEBRAIC_ZERO;

	for (let i = 0; i <= view.degree; i++) {
		if (!isZeroAlgebraic(view.coefficients[i])) {
			content = gcdAlgebraic(content, view.coefficients[i]);
		}
	}

	// If content is zero or one, primitive is the original
	if (isZeroAlgebraic(content) || isOneAlgebraic(content)) {
		return {
			content: ALGEBRAIC_ONE,
			primitive: view
		};
	}

	// Divide each coefficient by content
	const primitiveCoeffs: AlgebraicCoefficient[] = [];
	for (let i = 0; i <= view.degree; i++) {
		const divided = divAlgebraic(view.coefficients[i], content);
		if (divided === null) {
			// Can't divide exactly - return original
			return {
				content: ALGEBRAIC_ONE,
				primitive: view
			};
		}
		primitiveCoeffs.push(divided);
	}

	return {
		content,
		primitive: {
			variable: view.variable,
			coefficients: primitiveCoeffs,
			degree: view.degree
		}
	};
}

// =============================================================================
// GCD Algorithm (Euclidean)
// =============================================================================

/**
 * Computes the GCD of two univariate polynomials using the Euclidean algorithm.
 *
 * Uses pseudo-remainder to avoid coefficient explosion, with content extraction
 * after each step.
 *
 * @param a - First polynomial
 * @param b - Second polynomial
 * @returns GCD polynomial (monic, if possible)
 */
export function gcdUnivariate(a: UnivariateView, b: UnivariateView): UnivariateView {
	// Handle zero cases
	if (isZeroUnivariate(a)) return b;
	if (isZeroUnivariate(b)) return a;

	// Extract content from both
	const { content: contA, primitive: ppA } = extractContent(a);
	const { content: contB, primitive: ppB } = extractContent(b);

	// GCD of contents
	const contentGcd = gcdAlgebraic(contA, contB);

	// Euclidean algorithm on primitive parts
	let r0 = ppA;
	let r1 = ppB;

	// Ensure r0 has higher or equal degree
	if (r0.degree < r1.degree) {
		[r0, r1] = [r1, r0];
	}

	while (!isZeroUnivariate(r1)) {
		const divResult = divideUnivariate(r0, r1);

		if (divResult === null) {
			// Division failed - fall back to returning 1
			return constantUnivariateView(a.variable, contentGcd);
		}

		r0 = r1;
		r1 = divResult.remainder;

		// Extract content from remainder to prevent coefficient growth
		if (!isZeroUnivariate(r1)) {
			const { primitive } = extractContent(r1);
			r1 = primitive;
		}
	}

	// r0 is the GCD of primitive parts
	// Make it monic (leading coefficient = 1) if possible
	const monicGcd = makeMonic(r0);

	// Multiply by content GCD
	if (!isOneAlgebraic(contentGcd)) {
		return scalarMulUnivariate(monicGcd, contentGcd);
	}

	return monicGcd;
}

/**
 * Makes a polynomial monic (leading coefficient = 1).
 *
 * @param view - The polynomial
 * @returns Monic polynomial, or original if can't be made monic
 */
function makeMonic(view: UnivariateView): UnivariateView {
	if (isZeroUnivariate(view)) return view;

	const leadCoeff = view.coefficients[view.degree];
	if (isOneAlgebraic(leadCoeff)) return view;

	// Try to divide all coefficients by leading coefficient
	const newCoeffs: AlgebraicCoefficient[] = [];
	for (let i = 0; i <= view.degree; i++) {
		const divided = divAlgebraic(view.coefficients[i], leadCoeff);
		if (divided === null) {
			// Can't make monic - return original
			return view;
		}
		newCoeffs.push(divided);
	}

	return {
		variable: view.variable,
		coefficients: newCoeffs,
		degree: view.degree
	};
}

// =============================================================================
// Integration with polynomial.ts
// =============================================================================

/**
 * Maximum polynomial degree for GCD computation.
 * Higher degrees fall back to monomial GCD.
 */
export const MAX_GCD_DEGREE = 10;

/**
 * Attempts to compute polynomial GCD using univariate algorithm.
 *
 * Returns null if:
 * - Either polynomial is not univariate
 * - Variables don't match
 * - Degree exceeds limit
 *
 * @param a - First polynomial as NormalTerm[]
 * @param b - Second polynomial as NormalTerm[]
 * @returns GCD as NormalTerm[], or null if not applicable
 */
export function tryUnivariateGcd(
	a: readonly NormalTerm[],
	b: readonly NormalTerm[]
): NormalTerm[] | null {
	// Check both polynomials are univariate
	const checkA = checkUnivariate(a);
	const checkB = checkUnivariate(b);

	if (!checkA.isUnivariate || !checkB.isUnivariate) {
		return null;
	}

	// Handle constant polynomials
	if (checkA.variable === undefined && checkB.variable === undefined) {
		// Both are constants - GCD is numeric GCD
		const aConst = a.length > 0 ? a[0].coefficient : ALGEBRAIC_ZERO;
		const bConst = b.length > 0 ? b[0].coefficient : ALGEBRAIC_ZERO;
		return [constantTerm(gcdAlgebraic(aConst, bConst))];
	}

	// Determine the variable
	const variable = checkA.variable ?? checkB.variable;
	if (!variable) {
		return null;
	}

	// If both have variables, they must match
	if (
		checkA.variable &&
		checkB.variable &&
		hashNode(checkA.variable) !== hashNode(checkB.variable)
	) {
		return null;
	}

	// Convert to univariate views
	const viewA = toUnivariateView(a, variable);
	const viewB = toUnivariateView(b, variable);

	// Check degree limit
	if (viewA.degree > MAX_GCD_DEGREE || viewB.degree > MAX_GCD_DEGREE) {
		return null;
	}

	// Compute GCD
	const gcdView = gcdUnivariate(viewA, viewB);

	// Convert back to NormalTerm[]
	return fromUnivariateView(gcdView);
}

/**
 * Checks if two univariate views are equal (same coefficients).
 */
export function univariateViewsEqual(a: UnivariateView, b: UnivariateView): boolean {
	if (a.degree !== b.degree) return false;

	for (let i = 0; i <= a.degree; i++) {
		if (!algebraicEquals(a.coefficients[i], b.coefficients[i])) {
			return false;
		}
	}

	return true;
}

/**
 * Divides a polynomial by another polynomial (exact division).
 *
 * Returns null if:
 * - Division is not exact (non-zero remainder)
 * - Either polynomial is not univariate
 * - Variables don't match
 *
 * @param dividend - The polynomial to divide (NormalTerm[])
 * @param divisor - The polynomial to divide by (NormalTerm[])
 * @returns Quotient as NormalTerm[], or null if not exact
 */
export function dividePolynomials(
	dividend: readonly NormalTerm[],
	divisor: readonly NormalTerm[]
): NormalTerm[] | null {
	// Handle edge cases
	if (isZeroPolynomial(divisor)) {
		throw new Error('Division by zero polynomial');
	}

	if (isZeroPolynomial(dividend)) {
		return [constantTerm(ALGEBRAIC_ZERO)];
	}

	if (isOnePolynomial(divisor)) {
		return [...dividend];
	}

	// Check both are univariate with same variable
	const checkDiv = checkUnivariate(dividend);
	const checkDvs = checkUnivariate(divisor);

	if (!checkDiv.isUnivariate || !checkDvs.isUnivariate) {
		return null;
	}

	// Determine the variable
	const variable = checkDiv.variable ?? checkDvs.variable;
	if (!variable) {
		// Both are constants - divide coefficients
		const divCoeff = dividend.length > 0 ? dividend[0].coefficient : ALGEBRAIC_ZERO;
		const dvsCoeff = divisor.length > 0 ? divisor[0].coefficient : ALGEBRAIC_ZERO;
		const result = divAlgebraic(divCoeff, dvsCoeff);
		if (result === null) return null;
		return [constantTerm(result)];
	}

	// If both have variables, they must match
	if (
		checkDiv.variable &&
		checkDvs.variable &&
		hashNode(checkDiv.variable) !== hashNode(checkDvs.variable)
	) {
		return null;
	}

	// Convert to univariate views
	const viewDiv = toUnivariateView(dividend, variable);
	const viewDvs = toUnivariateView(divisor, variable);

	// Perform division
	const result = divideUnivariate(viewDiv, viewDvs);

	if (result === null || !result.exact) {
		return null;
	}

	// Convert quotient back to NormalTerm[]
	return fromUnivariateView(result.quotient);
}
