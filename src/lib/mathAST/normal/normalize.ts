/**
 * MathAST Normal Form - Normalization Algorithm
 *
 * Main normalization function that converts a MathNode into canonical NormalForm.
 * The algorithm is recursive: we normalize sub-expressions first.
 *
 * The normal form is a fraction of polynomials where:
 * - Each polynomial is a sum of NormalTerms
 * - Each NormalTerm has an AlgebraicCoefficient (handling radicals) and a Monomial (handling variables)
 * - All like terms are combined
 * - Everything is sorted canonically
 */

import type { MathNode } from '../types';
import type { NormalForm, NormalTerm, Rational, NormalizationStep } from './types';
import { type Verbosity, shouldIncludeStep } from '../common/verbosity.js';
import { hashPolynomial, hashNormalForm, hashMathNode } from './hash';
import { StepRecorder, getRuleDescription } from './step-recorder.js';
import {
	ALGEBRAIC_ONE,
	algebraicFromRational,
	mulAlgebraic,
	algebraicFromRadical,
	divAlgebraic,
	isPureRational,
	getRationalValue
} from './algebraic';
import {
	ZERO_POLYNOMIAL,
	ONE_POLYNOMIAL,
	addPolynomials,
	subPolynomials,
	mulPolynomials,
	negPolynomial,
	powPolynomial,
	isZeroPolynomial,
	isOnePolynomial,
	gcdPolynomials,
	divPolynomialByMonomial
} from './polynomial';
import { ZERO_TERM, mulTerms } from './term';
import { EMPTY_MONOMIAL, symbolicFactor, sortSymbolicFactors, hashMonomial } from './monomial';
import { rational, fromInteger, ONE, isOne, gcd as gcdBigInt } from './rational';
import { simplifyRadical, integerNthRoot } from './radical';
import { simplify } from './rules/index.js';
import { denormalize } from './denormalize';
import { tryUnivariateGcd, dividePolynomials } from './univariate-gcd';

// =============================================================================
// Constants
// =============================================================================

/** Normal form representing zero */
export const ZERO_NORMAL_FORM: NormalForm = {
	numerator: ZERO_POLYNOMIAL,
	denominator: ONE_POLYNOMIAL,
	hash: '0'
};

/** Normal form representing one */
export const ONE_NORMAL_FORM: NormalForm = {
	numerator: ONE_POLYNOMIAL,
	denominator: ONE_POLYNOMIAL,
	hash: '1'
};

// =============================================================================
// Normalization Context (Step Recording)
// =============================================================================

/**
 * Context for normalization with optional step recording.
 *
 * Pass this to normalize() to record transformation steps for pedagogical display.
 *
 * @example
 * const recorder = new StepRecorder();
 * const ctx: NormalizeContext = { recorder, verbosity: 'summarized' };
 * const form = normalize(expr, ctx);
 * const steps = recorder.getSteps();
 */
export interface NormalizeContext {
	/** Step recorder instance */
	readonly recorder: StepRecorder;
	/** Verbosity level for filtering */
	readonly verbosity: Verbosity;
}

/**
 * Helper to record a normalization step if conditions are met:
 * - Context exists
 * - Verbosity is not 'result'
 * - before and after are actually different
 *
 * @param ctx - Normalization context (may be undefined)
 * @param rule - Rule name (e.g., 'combine-like-terms')
 * @param originalNode - The original MathNode before transformation
 * @param result - The NormalForm result after transformation
 * @param stepVerbosity - Minimum verbosity level for this step
 */
function recordNormalizationStep(
	ctx: NormalizeContext | undefined,
	rule: string,
	originalNode: MathNode,
	result: NormalForm,
	stepVerbosity: Verbosity
): void {
	// Fast path: no recording needed
	if (!ctx || ctx.verbosity === 'result') return;

	// Skip if this step's verbosity is higher than requested
	// (detailed steps not shown when 'summarized' is requested)
	if (!shouldIncludeStep(stepVerbosity, ctx.verbosity)) return;

	// Denormalize result for the "after" display
	const resultNode = denormalize(result);

	// Use hash comparison to check if transformation actually occurred
	const beforeHash = hashMathNode(originalNode);
	const afterHash = hashMathNode(resultNode);

	if (beforeHash !== afterHash) {
		ctx.recorder.recordStep(
			rule,
			getRuleDescription(rule),
			originalNode,
			resultNode,
			stepVerbosity
		);
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

// =============================================================================
// Rationalization - Clearing fractional exponents from denominator
// =============================================================================

/**
 * Computes the exponent needed to rationalize a fractional exponent.
 *
 * For p/q where p mod q != 0, returns (q - (p mod q)) / q
 * which when added to p/q gives an integer.
 *
 * @param exp - A rational exponent (possibly fractional)
 * @returns The complement exponent to add to get an integer, or null if already integer
 *
 * @example
 * getRationalizingExponent(1/2) = 1/2  // 1/2 + 1/2 = 1
 * getRationalizingExponent(2/3) = 1/3  // 2/3 + 1/3 = 1
 * getRationalizingExponent(5/2) = 1/2  // 5/2 + 1/2 = 3
 * getRationalizingExponent(2/1) = null // already integer
 */
function getRationalizingExponent(exp: Rational): Rational | null {
	// If denominator is 1, exponent is already integer
	if (exp.d === 1n) return null;

	// p mod q (remainder)
	// Handle negative numerators by taking absolute value for mod
	const absN = exp.n < 0n ? -exp.n : exp.n;
	const remainder = absN % exp.d;

	// If no remainder, exponent is already integer
	if (remainder === 0n) return null;

	// Complement: (q - remainder) / q
	const complementN = exp.d - remainder;
	return rational(complementN, exp.d);
}

/**
 * Computes the rationalizing monomial for a given denominator monomial.
 *
 * Returns a monomial that, when multiplied with the denominator monomial,
 * produces a monomial with all integer exponents.
 *
 * @param monomial - The denominator monomial to rationalize
 * @returns The rationalizing monomial, or null if no rationalization needed
 *
 * @example
 * // For x^{1/2}, returns x^{1/2} (multiply both by sqrt(x) to get x)
 * // For x^{1/2}y^{2/3}, returns x^{1/2}y^{1/3}
 */
function getRationalizingMonomial(
	monomial: readonly import('./types').SymbolicFactor[]
): import('./types').SymbolicFactor[] | null {
	const factors: import('./types').SymbolicFactor[] = [];
	let needsRationalization = false;

	for (const factor of monomial) {
		const complement = getRationalizingExponent(factor.exponent);
		if (complement !== null) {
			needsRationalization = true;
			factors.push(symbolicFactor(factor.base, complement));
		}
	}

	if (!needsRationalization) return null;
	return factors.length > 0 ? sortSymbolicFactors(factors) : null;
}

/**
 * Rationalizes a fraction by clearing fractional exponents from the denominator.
 *
 * For single-term denominators with fractional exponents like x^{1/2},
 * multiplies both numerator and denominator by the appropriate factor
 * to clear the fractional exponents.
 *
 * @example
 * 1 / sqrt(x) = 1 / x^{1/2}
 * Multiply by x^{1/2} / x^{1/2}:
 * = x^{1/2} / x = sqrt(x) / x
 *
 * @param numerator - The numerator polynomial
 * @param denominator - The denominator polynomial
 * @returns Object with rationalized numerator and denominator, or originals if no change
 */
function rationalizeDenominator(
	numerator: NormalTerm[],
	denominator: NormalTerm[]
): { numerator: NormalTerm[]; denominator: NormalTerm[] } {
	// Only handle single-term denominators for now
	// Multi-term denominators (like 1/(1+√2)) require conjugate multiplication
	// which is more complex and not implemented here
	if (denominator.length !== 1) {
		return { numerator, denominator };
	}

	const denTerm = denominator[0];

	// Skip if denominator has no symbolic factors (constant denominator)
	if (denTerm.monomial.length === 0) {
		return { numerator, denominator };
	}

	// Get the rationalizing monomial
	const rationalizingMon = getRationalizingMonomial(denTerm.monomial);
	if (rationalizingMon === null) {
		return { numerator, denominator };
	}

	// Create the rationalizing term (coefficient = 1)
	const rationalizingTerm: NormalTerm = {
		coefficient: ALGEBRAIC_ONE,
		monomial: rationalizingMon
	};

	// Multiply numerator and denominator by the rationalizing term
	const newNumerator = mulPolynomials(numerator, [rationalizingTerm]);
	const newDenominator = mulPolynomials(denominator, [rationalizingTerm]);

	return { numerator: newNumerator, denominator: newDenominator };
}

/**
 * Creates a NormalForm from a polynomial (denominator = 1).
 */
function normalFormFromPolynomial(terms: NormalTerm[]): NormalForm {
	if (terms.length === 0) {
		return ZERO_NORMAL_FORM;
	}

	const numerator = terms;
	const denominator = ONE_POLYNOMIAL;

	return {
		numerator,
		denominator: [...denominator],
		hash: hashPolynomial(numerator)
	};
}

/**
 * Creates a NormalForm from numerator and denominator polynomials.
 * Automatically reduces common monomial factors and numeric coefficients.
 */
function normalFormFromFraction(numerator: NormalTerm[], denominator: NormalTerm[]): NormalForm {
	// Handle zero numerator
	if (numerator.length === 0) {
		return ZERO_NORMAL_FORM;
	}

	// Handle denominator = 1
	if (isOnePolynomial(denominator)) {
		return normalFormFromPolynomial(numerator);
	}

	// Combine exp factors across numerator/denominator: exp(a)/exp(b) → exp(a-b)
	const combined = combineExpAcrossFraction(numerator, denominator);
	numerator = combined.numerator;
	denominator = combined.denominator;

	// Re-check if denominator became 1 after exp combination
	if (isOnePolynomial(denominator)) {
		return normalFormFromPolynomial(numerator);
	}

	let reducedNumerator = numerator;
	let reducedDenominator = denominator;

	// Try univariate polynomial GCD first (for expressions like (x^2-1)/(x-1) = x+1)
	const univariateGcd = tryUnivariateGcd(numerator, denominator);
	if (univariateGcd !== null && !isOnePolynomial(univariateGcd)) {
		// Divide both by the GCD
		const newNumerator = dividePolynomials(numerator, univariateGcd);
		const newDenominator = dividePolynomials(denominator, univariateGcd);

		if (newNumerator !== null && newDenominator !== null) {
			reducedNumerator = newNumerator;
			reducedDenominator = newDenominator;
		}
	} else {
		// Fall back to monomial GCD only
		const gcd = gcdPolynomials(numerator, denominator);

		// If GCD is not 1, divide both by it
		if (!isOnePolynomial(gcd) && gcd.length === 1) {
			const gcdMonomial = gcd[0].monomial;
			reducedNumerator = divPolynomialByMonomial(numerator, gcdMonomial);
			reducedDenominator = divPolynomialByMonomial(denominator, gcdMonomial);
		}
	}

	// After reduction, check if denominator became 1
	if (isOnePolynomial(reducedDenominator)) {
		return normalFormFromPolynomial(reducedNumerator);
	}

	// Handle constant denominator: polynomial / constant → divide each term by constant
	// This handles cases like (4x-6)/2 → 2x-3 or (x+1)/(-1) → -x-1
	if (reducedDenominator.length === 1 && reducedDenominator[0].monomial.length === 0) {
		const denCoeff = reducedDenominator[0].coefficient;
		const denRational = getPureRationalCoeff(denCoeff);

		if (denRational) {
			// Try to divide all numerator terms by the constant denominator
			const dividedTerms: NormalTerm[] = [];
			let canDivideAll = true;

			for (const term of reducedNumerator) {
				const numRational = getPureRationalCoeff(term.coefficient);
				if (numRational) {
					// Pure rational coefficient: divide the rationals
					const resultN = numRational.n * denRational.d;
					const resultD = numRational.d * denRational.n;
					const newCoeff = algebraicFromRational(rational(resultN, resultD));
					dividedTerms.push({
						coefficient: newCoeff,
						monomial: term.monomial
					});
				} else {
					// Has radicals - try divAlgebraic
					const divided = divAlgebraic(term.coefficient, denCoeff);
					if (divided !== null) {
						dividedTerms.push({
							coefficient: divided,
							monomial: term.monomial
						});
					} else {
						canDivideAll = false;
						break;
					}
				}
			}

			if (canDivideAll) {
				return normalFormFromPolynomial(dividedTerms);
			}
		}
	}

	// Special case: single term numerator and single term constant denominator
	// e.g., 6x / 2 → 3x / 1 = 3x
	if (
		reducedNumerator.length === 1 &&
		reducedDenominator.length === 1 &&
		reducedDenominator[0].monomial.length === 0
	) {
		const numTerm = reducedNumerator[0];
		const denTerm = reducedDenominator[0];

		// Both must have pure rational coefficients for simplification
		const numCoeff = getPureRationalCoeff(numTerm.coefficient);
		const denCoeff = getPureRationalCoeff(denTerm.coefficient);

		if (numCoeff && denCoeff) {
			// Divide rational coefficients: (n1/d1) / (n2/d2) = (n1*d2) / (d1*n2)
			const resultN = numCoeff.n * denCoeff.d;
			const resultD = numCoeff.d * denCoeff.n;

			// Create the simplified result
			const newCoeff = algebraicFromRational(rational(resultN, resultD));
			const simplifiedTerm: NormalTerm = {
				coefficient: newCoeff,
				monomial: numTerm.monomial
			};
			return normalFormFromPolynomial([simplifiedTerm]);
		}
	}

	// Rationalize denominator: clear fractional exponents
	// e.g., 1/sqrt(x) = 1/x^{1/2} → sqrt(x)/x = x^{1/2}/x
	const rationalized = rationalizeDenominator(reducedNumerator, reducedDenominator);
	reducedNumerator = rationalized.numerator;
	reducedDenominator = rationalized.denominator;

	// After rationalization, check if denominator became 1
	if (isOnePolynomial(reducedDenominator)) {
		return normalFormFromPolynomial(reducedNumerator);
	}

	const form: NormalForm = {
		numerator: reducedNumerator,
		denominator: reducedDenominator,
		hash: '' // Will be computed below
	};

	// Compute hash
	return {
		...form,
		hash: hashNormalForm(form)
	};
}

/**
 * Extracts a pure rational coefficient from an AlgebraicCoefficient.
 * Returns null if the coefficient contains radicals or multiple terms.
 */
function getPureRationalCoeff(coeff: import('./types').AlgebraicCoefficient): Rational | null {
	if (coeff.terms.length !== 1) return null;
	const term = coeff.terms[0];
	if (term.radicals.length !== 0) return null;
	return term.rational;
}

/**
 * Creates a NormalTerm with a single symbolic factor.
 */
function termFromVariable(name: string): NormalTerm {
	return {
		coefficient: ALGEBRAIC_ONE,
		monomial: [symbolicFactor({ type: 'variable', name }, ONE)]
	};
}

/**
 * Creates a NormalTerm from a symbolic factor with exponent.
 */
function termFromSymbolicFactor(base: MathNode, exponent: Rational): NormalTerm {
	return {
		coefficient: ALGEBRAIC_ONE,
		monomial: [symbolicFactor(base, exponent)]
	};
}

/**
 * Creates a NormalTerm from a rational number.
 */
function termFromRational(r: Rational): NormalTerm {
	if (r.n === 0n) {
		return ZERO_TERM;
	}
	return {
		coefficient: algebraicFromRational(r),
		monomial: EMPTY_MONOMIAL
	};
}

/**
 * Creates a polynomial from a single term.
 */
function polynomialFromTerm(term: NormalTerm): NormalTerm[] {
	if (term.coefficient.terms.length === 0) {
		return [];
	}
	return [term];
}

/**
 * Parses a number string to a Rational.
 */
function parseNumberToRational(value: string): Rational {
	// Handle integers
	if (!value.includes('.')) {
		return fromInteger(BigInt(value));
	}

	// Handle decimals by converting to fraction
	const [intPart, decPart] = value.split('.');
	const decPlaces = decPart.length;
	const numerator = BigInt(intPart + decPart);
	const denominator = 10n ** BigInt(decPlaces);
	return rational(numerator, denominator);
}

/**
 * Checks if an exponent is a non-negative integer (0, 1, 2, ...).
 * Returns the integer value or null if not a non-negative integer.
 */
function getNonNegativeIntExponent(node: MathNode): number | null {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		if (Number.isInteger(val) && val >= 0) {
			return val;
		}
	}
	return null;
}

/**
 * Checks if an exponent is a rational number.
 */
function getRationalExponent(node: MathNode): Rational | null {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		if (Number.isInteger(val)) {
			return fromInteger(val);
		}
	}

	// Handle opposite nodes (e.g., -1, -2)
	if (node.type === 'opposite' && node.operand.type === 'number') {
		const val = parseFloat(node.operand.value);
		if (Number.isInteger(val)) {
			return fromInteger(-val);
		}
	}

	// Handle fraction nodes (e.g., 1/2, 2/3)
	if (node.type === 'division') {
		if (node.numerator.type === 'number' && node.denominator.type === 'number') {
			const num = parseInt(node.numerator.value, 10);
			const den = parseInt(node.denominator.value, 10);
			if (Number.isInteger(num) && Number.isInteger(den) && den !== 0) {
				return rational(BigInt(num), BigInt(den));
			}
		}
	}

	return null;
}

// =============================================================================
// Perfect Square Trinomial Helpers
// =============================================================================

/**
 * Checks if a rational number is a perfect square (both n and d are perfect squares).
 * Returns the square root if yes, null otherwise.
 */
function sqrtPerfectSquareRational(r: Rational): Rational | null {
	if (r.n < 0n) return null; // Negative numbers don't have real square roots

	const sqrtN = integerNthRoot(r.n, 2n);
	const sqrtD = integerNthRoot(r.d, 2n);

	if (sqrtN !== null && sqrtD !== null) {
		return { n: sqrtN, d: sqrtD };
	}
	return null;
}

/**
 * Checks if a NormalTerm is a perfect square.
 * A term is a perfect square if:
 * - Its coefficient is a pure rational that's a perfect square
 * - All exponents in the monomial are even integers
 */
function isPerfectSquareTermForTrinomial(term: NormalTerm): boolean {
	const { coefficient, monomial } = term;

	// Check coefficient is a pure positive rational perfect square
	if (!isPureRational(coefficient)) return false;
	const ratValue = getRationalValue(coefficient);
	if (ratValue === null || ratValue.n <= 0n) return false;
	if (sqrtPerfectSquareRational(ratValue) === null) return false;

	// Check all exponents are even integers
	for (const factor of monomial) {
		if (factor.exponent.d !== 1n) return false; // Must be integer exponent
		if (factor.exponent.n % 2n !== 0n) return false; // Must be even
	}

	return true;
}

/**
 * Takes the square root of a perfect square term.
 * Returns null if the term is not a perfect square.
 */
function sqrtPerfectSquareTerm(term: NormalTerm): NormalTerm | null {
	const { coefficient, monomial } = term;

	// Get the rational coefficient
	if (!isPureRational(coefficient)) return null;
	const ratValue = getRationalValue(coefficient);
	if (ratValue === null || ratValue.n <= 0n) return null;

	// Take sqrt of coefficient
	const sqrtRat = sqrtPerfectSquareRational(ratValue);
	if (sqrtRat === null) return null;

	// Halve all exponents in monomial
	const newMonomial: typeof monomial = [];
	for (const factor of monomial) {
		if (factor.exponent.d !== 1n || factor.exponent.n % 2n !== 0n) return null;
		newMonomial.push(symbolicFactor(factor.base, { n: factor.exponent.n / 2n, d: 1n }));
	}

	return {
		coefficient: algebraicFromRational(sqrtRat),
		monomial: sortSymbolicFactors(newMonomial)
	};
}

/**
 * Tries to factor a 3-term polynomial as a perfect square trinomial.
 * Returns (a + b) or (a - b) if the polynomial equals (a ± b)², null otherwise.
 *
 * Pattern: a² ± 2ab + b² = (a ± b)²
 *
 * @param terms - Array of 3 NormalTerms (the polynomial)
 * @returns The factored form as a NormalForm, or null
 */
function tryFactorPerfectSquareTrinomial(
	terms: readonly NormalTerm[],
	_ctx?: NormalizeContext
): NormalForm | null {
	if (terms.length !== 3) return null;

	// Find the two "square" terms and the "middle" term
	// In a perfect square trinomial a² ± 2ab + b²:
	// - Two terms should be perfect squares (a² and b²)
	// - The middle term should be ±2ab

	const squareTermIndices: number[] = [];
	for (let i = 0; i < 3; i++) {
		if (isPerfectSquareTermForTrinomial(terms[i])) {
			squareTermIndices.push(i);
		}
	}

	// We need exactly 2 perfect square terms
	if (squareTermIndices.length !== 2) return null;

	const middleIndex = [0, 1, 2].find((i) => !squareTermIndices.includes(i))!;
	const [sqIdx1, sqIdx2] = squareTermIndices;

	const term1 = terms[sqIdx1]; // a²
	const term2 = terms[sqIdx2]; // b²
	const middleTerm = terms[middleIndex]; // ±2ab

	// Take square roots
	const a = sqrtPerfectSquareTerm(term1);
	const b = sqrtPerfectSquareTerm(term2);
	if (a === null || b === null) return null;

	// Compute 2ab
	// First multiply a and b
	const twoAB = mulTerms(
		{ coefficient: algebraicFromRational({ n: 2n, d: 1n }), monomial: EMPTY_MONOMIAL },
		mulTerms(a, b)
	);

	// Check if middleTerm equals 2ab or -2ab
	// Compare by checking if they have the same monomial and coefficients match
	const middleCoeff = getRationalValue(middleTerm.coefficient);
	const twoABCoeff = getRationalValue(twoAB.coefficient);

	if (middleCoeff === null || twoABCoeff === null) return null;
	if (!isPureRational(middleTerm.coefficient) || !isPureRational(twoAB.coefficient)) return null;

	// Check monomials are equal
	if (hashMonomial(middleTerm.monomial) !== hashMonomial(twoAB.monomial)) return null;

	// Check coefficients: middle should be +2ab or -2ab
	const isPositive = middleCoeff.n * twoABCoeff.d === twoABCoeff.n * middleCoeff.d;
	const isNegative = middleCoeff.n * twoABCoeff.d === -twoABCoeff.n * middleCoeff.d;

	if (!isPositive && !isNegative) return null;

	// Success! Build the result: (a + b) or (a - b)
	// As a NormalForm, this is the polynomial [a, b] or [a, -b]
	if (isPositive) {
		// (a + b)
		const resultPoly = addPolynomials([a], [b]);
		return normalFormFromPolynomial(resultPoly);
	} else {
		// (a - b)
		const resultPoly = subPolynomials([a], [b]);
		return normalFormFromPolynomial(resultPoly);
	}
}

// =============================================================================
// Logarithm Expansion Helpers
// =============================================================================

/** Maximum integer to factorize for performance (10^6) */
const FACTORIZATION_LIMIT = 1_000_000n;

/**
 * Factorizes an integer into prime factors.
 * Returns array of [prime, exponent] pairs sorted by prime.
 * Example: 12 → [[2, 2], [3, 1]]
 */
function primeFactorization(n: bigint): [bigint, bigint][] {
	if (n <= 1n) return [];

	const factors: [bigint, bigint][] = [];
	let remaining = n;
	let d = 2n;

	while (d * d <= remaining) {
		let count = 0n;
		while (remaining % d === 0n) {
			remaining = remaining / d;
			count++;
		}
		if (count > 0n) factors.push([d, count]);
		d++;
	}

	if (remaining > 1n) factors.push([remaining, 1n]);

	return factors;
}

/**
 * Extracts a pure positive integer from a NormalForm.
 * Returns the integer value or null if not a pure positive integer.
 */
function extractPositiveInteger(form: NormalForm): bigint | null {
	// Must be: single term, no denominator, no monomial
	if (form.numerator.length !== 1) return null;
	if (!isOnePolynomial(form.denominator)) return null;

	const term = form.numerator[0];
	if (term.monomial.length !== 0) return null;
	if (term.coefficient.terms.length !== 1) return null;

	const coeff = term.coefficient.terms[0];
	if (coeff.radicals.length !== 0) return null;

	// Must be a positive integer (n > 0, d = 1)
	if (coeff.rational.d !== 1n) return null;
	if (coeff.rational.n <= 0n) return null;

	return coeff.rational.n;
}

/**
 * Extracts a positive rational (non-integer) from a NormalForm.
 * Returns { n: bigint, d: bigint } or null if not a pure positive rational or if it's an integer.
 */
function extractPositiveRational(form: NormalForm): { n: bigint; d: bigint } | null {
	// Must be: single term, no denominator polynomial, no monomial
	if (form.numerator.length !== 1) return null;
	if (!isOnePolynomial(form.denominator)) return null;

	const term = form.numerator[0];
	if (term.monomial.length !== 0) return null;
	if (term.coefficient.terms.length !== 1) return null;

	const coeff = term.coefficient.terms[0];
	if (coeff.radicals.length !== 0) return null;

	// Must be positive and non-integer (d > 1)
	if (coeff.rational.d === 1n) return null; // It's an integer
	if (coeff.rational.n <= 0n) return null;

	return { n: coeff.rational.n, d: coeff.rational.d };
}

/**
 * Extracts power info from a NormalForm if it's a simple x^n pattern.
 * Returns { base: MathNode, exponent: Rational } or null.
 *
 * Detects patterns like:
 * - x^2 → { base: x, exponent: 2 }
 * - (x^3) → { base: x, exponent: 3 }
 */
function extractSimplePower(form: NormalForm): { base: MathNode; exponent: Rational } | null {
	// Must be: single term, no denominator, coefficient = 1
	if (form.numerator.length !== 1) return null;
	if (!isOnePolynomial(form.denominator)) return null;

	const term = form.numerator[0];

	// Coefficient must be 1
	if (term.coefficient.terms.length !== 1) return null;
	const coeff = term.coefficient.terms[0];
	if (coeff.radicals.length !== 0) return null;
	if (coeff.rational.n !== 1n || coeff.rational.d !== 1n) return null;

	// Monomial must have exactly one factor
	if (term.monomial.length !== 1) return null;

	const factor = term.monomial[0];
	return {
		base: factor.base,
		exponent: factor.exponent
	};
}

/**
 * Extracts all factors from a product NormalForm.
 * Returns array of MathNodes representing each factor.
 *
 * For example, x*y*z returns [x, y, z]
 */
function extractProductFactors(form: NormalForm): MathNode[] {
	// Must be: single term, no denominator
	if (form.numerator.length !== 1) return [];
	if (!isOnePolynomial(form.denominator)) return [];

	const term = form.numerator[0];

	// Coefficient must be 1
	if (term.coefficient.terms.length !== 1) return [];
	const coeff = term.coefficient.terms[0];
	if (coeff.radicals.length !== 0) return [];
	if (coeff.rational.n !== 1n || coeff.rational.d !== 1n) return [];

	// Extract each factor from the monomial
	const factors: MathNode[] = [];
	for (const factor of term.monomial) {
		// Convert back to MathNode with exponent
		if (factor.exponent.n === 1n && factor.exponent.d === 1n) {
			factors.push(factor.base);
		} else {
			// x^n → superscript node
			factors.push({
				type: 'superscript',
				base: factor.base,
				superscript: {
					type: 'number',
					value:
						factor.exponent.d === 1n
							? factor.exponent.n.toString()
							: `${factor.exponent.n}/${factor.exponent.d}`
				}
			});
		}
	}

	return factors;
}

// =============================================================================
// Exponential of Linear Combination of Logarithms
// =============================================================================

/**
 * Tries to extract a single ln term from a NormalTerm.
 * Returns { base, coeff } if the term is of the form: rational * ln(something)^1
 * Returns null if the term is not a valid ln term.
 */
function tryExtractLnTerm(term: NormalTerm): { base: MathNode; coeff: Rational } | null {
	// Coefficient must be pure rational (no radicals, no imaginary)
	if (term.coefficient.terms.length !== 1) return null;
	const coeffTerm = term.coefficient.terms[0];
	if (coeffTerm.radicals.length !== 0) return null;
	if (coeffTerm.hasImaginaryUnit) return null;

	// Monomial must have exactly one factor with exponent 1
	if (term.monomial.length !== 1) return null;
	const factor = term.monomial[0];
	if (factor.exponent.n !== 1n || factor.exponent.d !== 1n) return null;

	// The base must be a ln function
	const base = factor.base;
	if (base.type !== 'function') return null;
	if ((base as { name?: string }).name !== 'ln') return null;
	const args = (base as { args?: MathNode[] }).args;
	if (!args || args.length !== 1) return null;

	// Extract the argument of ln and the coefficient
	return {
		base: args[0],
		coeff: coeffTerm.rational
	};
}

/**
 * Extracts ln terms from a NormalForm, separating them from non-ln terms.
 * Returns both the extracted ln terms and the remainder.
 *
 * For example, 2·ln(x) + y → { lnTerms: [{ base: x, coeff: 2 }], remainder: y }
 *
 * This enables partial extraction for exp: exp(2·ln(x) + y) = x² · exp(y)
 */
function extractPartialLinearCombinationOfLn(form: NormalForm): {
	lnTerms: { base: MathNode; coeff: Rational }[];
	remainder: NormalForm;
} {
	// If there's a denominator, we can't extract ln terms
	if (!isOnePolynomial(form.denominator)) {
		return { lnTerms: [], remainder: form };
	}

	// Empty numerator = 0
	if (form.numerator.length === 0) {
		return { lnTerms: [], remainder: ZERO_NORMAL_FORM };
	}

	const lnTerms: { base: MathNode; coeff: Rational }[] = [];
	const remainderTerms: NormalTerm[] = [];

	for (const term of form.numerator) {
		const extracted = tryExtractLnTerm(term);
		if (extracted !== null) {
			lnTerms.push(extracted);
		} else {
			remainderTerms.push(term);
		}
	}

	const remainder = normalFormFromPolynomial(remainderTerms);
	return { lnTerms, remainder };
}

/**
 * Builds a MathNode representing base^(n/d).
 * For negative exponents, creates 1/base^|n/d| to ensure proper normalization.
 */
function buildPowerNode(base: MathNode, exponent: Rational): MathNode {
	// x^0 = 1
	if (exponent.n === 0n) {
		return { type: 'number', value: '1' };
	}

	// x^1 = x
	if (exponent.n === 1n && exponent.d === 1n) {
		return base;
	}

	// x^(-1) = 1/x
	if (exponent.n === -1n && exponent.d === 1n) {
		return {
			type: 'division',
			numerator: { type: 'number', value: '1' },
			denominator: base
		};
	}

	// For negative exponents: x^(-n/d) = 1 / x^(n/d)
	if (exponent.n < 0n) {
		const positiveExp: Rational = { n: -exponent.n, d: exponent.d };
		const positivePower = buildPowerNode(base, positiveExp);
		return {
			type: 'division',
			numerator: { type: 'number', value: '1' },
			denominator: positivePower
		};
	}

	// Build exponent node for positive exponents
	const expNode: MathNode =
		exponent.d === 1n
			? { type: 'number', value: exponent.n.toString() }
			: {
					type: 'division',
					numerator: { type: 'number', value: exponent.n.toString() },
					denominator: { type: 'number', value: exponent.d.toString() }
				};

	return {
		type: 'superscript',
		base: base,
		superscript: expNode
	};
}

// =============================================================================
// Main Normalization Algorithm
// =============================================================================

/**
 * Normalizes a MathNode into canonical NormalForm.
 *
 * The algorithm recursively normalizes sub-expressions and combines them
 * according to the algebraic structure.
 *
 * @param node - The MathNode to normalize
 * @param ctx - Optional context for step recording
 * @returns The canonical NormalForm
 */
export function normalize(node: MathNode, ctx?: NormalizeContext): NormalForm {
	// First, apply simplification rules (Phase 1)
	const simplified = simplify(node);

	// Record pre-simplification step if anything changed
	if (ctx && ctx.verbosity !== 'result') {
		const beforeHash = hashMathNode(node);
		const afterHash = hashMathNode(simplified);
		if (beforeHash !== afterHash) {
			ctx.recorder.recordStep(
				'pre-simplify',
				getRuleDescription('pre-simplify'),
				node,
				simplified,
				'detailed'
			);
		}
	}

	// Then normalize (Phase 2)
	return normalizeNode(simplified, ctx);
}

/**
 * Internal normalization of a simplified node.
 */
function normalizeNode(node: MathNode, ctx?: NormalizeContext): NormalForm {
	switch (node.type) {
		case 'number': {
			const r = parseNumberToRational(node.value);
			if (r.n === 0n) {
				return ZERO_NORMAL_FORM;
			}
			const term = termFromRational(r);
			return normalFormFromPolynomial(polynomialFromTerm(term));
		}

		case 'variable': {
			const term = termFromVariable(node.name);
			return normalFormFromPolynomial(polynomialFromTerm(term));
		}

		case 'greek': {
			// Greek letters like pi, alpha are treated as symbolic constants
			const term: NormalTerm = {
				coefficient: ALGEBRAIC_ONE,
				monomial: [symbolicFactor(node, ONE)]
			};
			return normalFormFromPolynomial(polynomialFromTerm(term));
		}

		case 'symbol': {
			// Symbols treated as opaque symbolic factors
			const term: NormalTerm = {
				coefficient: ALGEBRAIC_ONE,
				monomial: [symbolicFactor(node, ONE)]
			};
			return normalFormFromPolynomial(polynomialFromTerm(term));
		}

		case 'hole': {
			// Holes treated as symbolic placeholders
			const term: NormalTerm = {
				coefficient: ALGEBRAIC_ONE,
				monomial: [symbolicFactor(node, ONE)]
			};
			return normalFormFromPolynomial(polynomialFromTerm(term));
		}

		case 'addition': {
			const leftForm = normalizeNode(node.left, ctx);
			const rightForm = normalizeNode(node.right, ctx);
			const result = addNormalForms(leftForm, rightForm);
			// Record combine-like-terms step
			recordNormalizationStep(ctx, 'combine-like-terms', node, result, 'detailed');
			return result;
		}

		case 'subtraction': {
			const leftForm = normalizeNode(node.left, ctx);
			const rightForm = normalizeNode(node.right, ctx);
			const result = subNormalForms(leftForm, rightForm);
			// Record combine-like-terms step
			recordNormalizationStep(ctx, 'combine-like-terms', node, result, 'detailed');
			return result;
		}

		case 'positive': {
			// Positive sign is identity
			return normalizeNode(node.operand, ctx);
		}

		case 'opposite': {
			const form = normalizeNode(node.operand, ctx);
			return negNormalForm(form);
		}

		case 'multiplication': {
			const leftForm = normalizeNode(node.left, ctx);
			const rightForm = normalizeNode(node.right, ctx);
			const result = mulNormalForms(leftForm, rightForm);
			// Record combine-like-terms step (for coefficient multiplication)
			recordNormalizationStep(ctx, 'combine-like-terms', node, result, 'detailed');
			return result;
		}

		case 'division': {
			const numForm = normalizeNode(node.numerator, ctx);
			const denForm = normalizeNode(node.denominator, ctx);
			const result = divNormalForms(numForm, denForm);
			// Record simplify-fraction step
			recordNormalizationStep(ctx, 'simplify-fraction', node, result, 'summarized');
			return result;
		}

		case 'superscript': {
			// Special case: exp(arg)^n → exp(n*arg) (combination approach)
			const ratExp = getRationalExponent(node.superscript);
			if (ratExp !== null && isExpFunction(node.base)) {
				// exp(arg)^(n/d) → exp((n/d)*arg)
				const expArg = getExpArg(node.base);
				const scaledArg = scaleNodeByRational(expArg, ratExp);
				const newExpNode: MathNode = { type: 'function', name: 'exp', args: [scaledArg] };
				return normalizeNode(newExpNode, ctx);
			}

			// Special case: (√a)^n → a^{n/2}
			if (ratExp !== null && isSqrtFunction(node.base)) {
				const sqrtArg = (node.base as MathNode & { type: 'function' }).args[0];
				// New exponent is n/2 (multiply by 1/2)
				const newExp: Rational = { n: ratExp.n, d: ratExp.d * 2n };
				// Simplify the rational
				const g = gcdBigInt(newExp.n < 0n ? -newExp.n : newExp.n, newExp.d);
				const simplifiedExp: Rational = { n: newExp.n / g, d: newExp.d / g };

				// If exponent becomes integer, use the standard power path
				if (simplifiedExp.d === 1n) {
					if (simplifiedExp.n >= 0n) {
						const baseForm = normalizeNode(sqrtArg, ctx);
						const result = powNormalForm(baseForm, Number(simplifiedExp.n));
						recordNormalizationStep(ctx, 'power-of-sqrt', node, result, 'summarized');
						return result;
					}
					// Negative integer: handled by normalizeSymbolicPower
				}

				// Fractional exponent
				const result = normalizeSymbolicPower(sqrtArg, simplifiedExp, ctx);
				recordNormalizationStep(ctx, 'power-of-sqrt', node, result, 'summarized');
				return result;
			}

			const baseForm = normalizeNode(node.base, ctx);

			// Check for non-negative integer exponent (handles x^0 = 1, x^1 = x, x^n)
			const intExp = getNonNegativeIntExponent(node.superscript);
			if (intExp !== null) {
				const result = powNormalForm(baseForm, intExp);
				// Record power step based on exponent value
				if (intExp === 0) {
					recordNormalizationStep(ctx, 'power-zero', node, result, 'summarized');
				} else if (intExp === 1) {
					recordNormalizationStep(ctx, 'power-one', node, result, 'detailed');
				} else {
					recordNormalizationStep(ctx, 'expand-power', node, result, 'summarized');
				}
				return result;
			}

			// Check for rational exponent (already checked above for exp case)
			if (ratExp !== null) {
				// For non-integer rational exponent, treat as symbolic
				return normalizeSymbolicPower(node.base, ratExp, ctx);
			}

			// General case: treat as opaque term
			return normalizeOpaqueNode(node);
		}

		case 'function': {
			return normalizeFunction(node, ctx);
		}

		case 'delimiter': {
			// Delimiters (parentheses) just normalize their content
			return normalizeNode(node.content, ctx);
		}

		case 'subscript': {
			// Subscripted expressions are treated as opaque symbolic factors
			return normalizeOpaqueNode(node);
		}

		case 'relation': {
			// Relations are not algebraic expressions - treat as opaque
			return normalizeOpaqueNode(node);
		}

		case 'unit': {
			// Unit nodes: normalize the expression part
			// The unit is not part of algebraic normalization
			return normalizeNode(node.expression, ctx);
		}

		case 'composition':
			// Composition (f composed with g) is treated as an opaque symbolic factor
			// since the composition itself represents a new function
			return normalizeOpaqueNode(node);

		default:
			return normalizeOpaqueNode(node);
	}
}

// =============================================================================
// Transcendental Function Simplification (Phase 2)
// =============================================================================

/**
 * Checks if a NormalForm represents a multiple of π.
 * Returns the coefficient k such that value = k*π, or null if not a multiple of π.
 */
function getPiCoefficient(form: NormalForm): Rational | null {
	// Must be: single term, coefficient rational only, monomial = [π^1]
	if (form.numerator.length !== 1) return null;
	if (!isOnePolynomial(form.denominator)) return null;

	const term = form.numerator[0];
	// Coefficient must be pure rational (no radicals)
	if (term.coefficient.terms.length !== 1) return null;
	if (term.coefficient.terms[0].radicals.length !== 0) return null;

	// Monomial must be exactly π^1
	if (term.monomial.length !== 1) return null;
	const factor = term.monomial[0];
	if (factor.base.type !== 'greek' || factor.base.letter !== 'pi') return null;
	if (factor.exponent.n !== 1n || factor.exponent.d !== 1n) return null;

	return term.coefficient.terms[0].rational;
}

/**
 * Checks if a NormalForm represents 'e' (Euler's number).
 */
function isEulerNumber(form: NormalForm): boolean {
	if (form.numerator.length !== 1) return false;
	if (!isOnePolynomial(form.denominator)) return false;

	const term = form.numerator[0];
	// Coefficient must be 1
	if (term.coefficient.terms.length !== 1) return false;
	const coeff = term.coefficient.terms[0];
	if (coeff.radicals.length !== 0) return false;
	if (coeff.rational.n !== 1n || coeff.rational.d !== 1n) return false;

	// Monomial must be exactly e^1
	if (term.monomial.length !== 1) return false;
	const factor = term.monomial[0];
	if (factor.base.type !== 'variable' || factor.base.name !== 'e') return false;
	if (factor.exponent.n !== 1n || factor.exponent.d !== 1n) return false;

	return true;
}

/**
 * Checks if a NormalForm represents a specific integer.
 */
function isIntegerValue(form: NormalForm, value: bigint): boolean {
	if (form.numerator.length !== 1) return false;
	if (!isOnePolynomial(form.denominator)) return false;

	const term = form.numerator[0];
	if (term.monomial.length !== 0) return false;
	if (term.coefficient.terms.length !== 1) return false;

	const coeff = term.coefficient.terms[0];
	if (coeff.radicals.length !== 0) return false;

	return coeff.rational.n === value && coeff.rational.d === 1n;
}

/**
 * Creates a NormalForm from a Rational value.
 */
function normalFormFromRational(r: Rational): NormalForm {
	const term = termFromRational(r);
	return normalFormFromPolynomial(polynomialFromTerm(term));
}

/**
 * Creates NormalForm for √2/2
 * Uses fraction form: √2 / 2 (to match canonical representation)
 */
function normalFormSqrt2Over2(): NormalForm {
	// Numerator: 1*√2
	const numTerm: NormalTerm = {
		coefficient: {
			terms: [
				{
					rational: rational(1n, 1n),
					radicals: [{ radicand: 2n, index: 2n }]
				}
			]
		},
		monomial: EMPTY_MONOMIAL
	};
	// Denominator: 2
	const denTerm: NormalTerm = {
		coefficient: algebraicFromRational(rational(2n, 1n)),
		monomial: EMPTY_MONOMIAL
	};
	return normalFormFromFraction([numTerm], [denTerm]);
}

/**
 * Creates NormalForm for √3/2
 * Uses fraction form: √3 / 2 (to match canonical representation)
 */
function normalFormSqrt3Over2(): NormalForm {
	// Numerator: 1*√3
	const numTerm: NormalTerm = {
		coefficient: {
			terms: [
				{
					rational: rational(1n, 1n),
					radicals: [{ radicand: 3n, index: 2n }]
				}
			]
		},
		monomial: EMPTY_MONOMIAL
	};
	// Denominator: 2
	const denTerm: NormalTerm = {
		coefficient: algebraicFromRational(rational(2n, 1n)),
		monomial: EMPTY_MONOMIAL
	};
	return normalFormFromFraction([numTerm], [denTerm]);
}

/**
 * Normalizes a Rational to canonical form (reduced, positive denominator).
 */
function normalizeRational(r: Rational): Rational {
	return rational(r.n, r.d);
}

/**
 * Reduces angle coefficient to [0, 2) range for periodic functions.
 * Returns the reduced coefficient.
 */
function reduceAngleCoefficient(coeff: Rational): Rational {
	// Reduce n/d mod 2 (since sin/cos have period 2π)
	// Result should be in [0, 2)
	let n = coeff.n;
	const d = coeff.d;

	// Handle negative coefficients
	if (n < 0n) {
		// Add multiples of 2d to make positive
		const periods = -n / (2n * d) + 1n;
		n = n + periods * 2n * d;
	}

	// Reduce to [0, 2d)
	n = n % (2n * d);

	return normalizeRational(rational(n, d));
}

/**
 * Gets sine value for angle = coeff * π
 * Returns null if not a known remarkable value.
 */
function getSineValue(coeff: Rational): NormalForm | null {
	const reduced = reduceAngleCoefficient(coeff);
	const n = reduced.n;
	const d = reduced.d;

	// sin(0) = 0
	if (n === 0n) return ZERO_NORMAL_FORM;

	// sin(π/6) = 1/2
	if (n === 1n && d === 6n) return normalFormFromRational(rational(1n, 2n));

	// sin(π/4) = √2/2
	if (n === 1n && d === 4n) return normalFormSqrt2Over2();

	// sin(π/3) = √3/2
	if (n === 1n && d === 3n) return normalFormSqrt3Over2();

	// sin(π/2) = 1
	if (n === 1n && d === 2n) return ONE_NORMAL_FORM;

	// sin(2π/3) = √3/2
	if (n === 2n && d === 3n) return normalFormSqrt3Over2();

	// sin(3π/4) = √2/2
	if (n === 3n && d === 4n) return normalFormSqrt2Over2();

	// sin(5π/6) = 1/2
	if (n === 5n && d === 6n) return normalFormFromRational(rational(1n, 2n));

	// sin(π) = 0
	if (n === 1n && d === 1n) return ZERO_NORMAL_FORM;

	// sin(7π/6) = -1/2
	if (n === 7n && d === 6n) return normalFormFromRational(rational(-1n, 2n));

	// sin(5π/4) = -√2/2
	if (n === 5n && d === 4n) return negNormalForm(normalFormSqrt2Over2());

	// sin(4π/3) = -√3/2
	if (n === 4n && d === 3n) return negNormalForm(normalFormSqrt3Over2());

	// sin(3π/2) = -1
	if (n === 3n && d === 2n) return negNormalForm(ONE_NORMAL_FORM);

	// sin(5π/3) = -√3/2
	if (n === 5n && d === 3n) return negNormalForm(normalFormSqrt3Over2());

	// sin(7π/4) = -√2/2
	if (n === 7n && d === 4n) return negNormalForm(normalFormSqrt2Over2());

	// sin(11π/6) = -1/2
	if (n === 11n && d === 6n) return normalFormFromRational(rational(-1n, 2n));

	// sin(2π) = 0
	if (n === 2n && d === 1n) return ZERO_NORMAL_FORM;

	return null;
}

/**
 * Gets cosine value for angle = coeff * π
 * Returns null if not a known remarkable value.
 */
function getCosineValue(coeff: Rational): NormalForm | null {
	const reduced = reduceAngleCoefficient(coeff);
	const n = reduced.n;
	const d = reduced.d;

	// cos(0) = 1
	if (n === 0n) return ONE_NORMAL_FORM;

	// cos(π/6) = √3/2
	if (n === 1n && d === 6n) return normalFormSqrt3Over2();

	// cos(π/4) = √2/2
	if (n === 1n && d === 4n) return normalFormSqrt2Over2();

	// cos(π/3) = 1/2
	if (n === 1n && d === 3n) return normalFormFromRational(rational(1n, 2n));

	// cos(π/2) = 0
	if (n === 1n && d === 2n) return ZERO_NORMAL_FORM;

	// cos(2π/3) = -1/2
	if (n === 2n && d === 3n) return normalFormFromRational(rational(-1n, 2n));

	// cos(3π/4) = -√2/2
	if (n === 3n && d === 4n) return negNormalForm(normalFormSqrt2Over2());

	// cos(5π/6) = -√3/2
	if (n === 5n && d === 6n) return negNormalForm(normalFormSqrt3Over2());

	// cos(π) = -1
	if (n === 1n && d === 1n) return negNormalForm(ONE_NORMAL_FORM);

	// cos(7π/6) = -√3/2
	if (n === 7n && d === 6n) return negNormalForm(normalFormSqrt3Over2());

	// cos(5π/4) = -√2/2
	if (n === 5n && d === 4n) return negNormalForm(normalFormSqrt2Over2());

	// cos(4π/3) = -1/2
	if (n === 4n && d === 3n) return normalFormFromRational(rational(-1n, 2n));

	// cos(3π/2) = 0
	if (n === 3n && d === 2n) return ZERO_NORMAL_FORM;

	// cos(5π/3) = 1/2
	if (n === 5n && d === 3n) return normalFormFromRational(rational(1n, 2n));

	// cos(7π/4) = √2/2
	if (n === 7n && d === 4n) return normalFormSqrt2Over2();

	// cos(11π/6) = √3/2
	if (n === 11n && d === 6n) return normalFormSqrt3Over2();

	// cos(2π) = 1
	if (n === 2n && d === 1n) return ONE_NORMAL_FORM;

	return null;
}

/**
 * Gets tangent value for angle = coeff * π
 * Returns null if not a known remarkable value or if undefined (π/2, 3π/2).
 */
function getTangentValue(coeff: Rational): NormalForm | null {
	const reduced = reduceAngleCoefficient(coeff);
	const n = reduced.n;
	const d = reduced.d;

	// tan(0) = 0
	if (n === 0n) return ZERO_NORMAL_FORM;

	// tan(π/6) = √3/3 = 1/√3
	if (n === 1n && d === 6n) {
		// √3/3
		const term: NormalTerm = {
			coefficient: {
				terms: [
					{
						rational: rational(1n, 3n),
						radicals: [{ radicand: 3n, index: 2n }]
					}
				]
			},
			monomial: EMPTY_MONOMIAL
		};
		return normalFormFromPolynomial([term]);
	}

	// tan(π/4) = 1
	if (n === 1n && d === 4n) return ONE_NORMAL_FORM;

	// tan(π/3) = √3
	if (n === 1n && d === 3n) {
		const term: NormalTerm = {
			coefficient: {
				terms: [
					{
						rational: rational(1n, 1n),
						radicals: [{ radicand: 3n, index: 2n }]
					}
				]
			},
			monomial: EMPTY_MONOMIAL
		};
		return normalFormFromPolynomial([term]);
	}

	// tan(π/2) = undefined (return null)
	if (n === 1n && d === 2n) return null;

	// tan(π) = 0
	if (n === 1n && d === 1n) return ZERO_NORMAL_FORM;

	// tan(3π/2) = undefined (return null)
	if (n === 3n && d === 2n) return null;

	// tan(2π) = 0
	if (n === 2n && d === 1n) return ZERO_NORMAL_FORM;

	return null;
}

// =============================================================================
// Logarithm Expansion Functions
// =============================================================================

/** Type for logarithm function names */
type LogFunctionName = 'ln' | 'log';

/**
 * Checks if n is a perfect power of base (n = base^k).
 * Returns k if found, null otherwise.
 * Example: isPerfectPowerOf(100n, 10n) → 2n (because 100 = 10²)
 */
function isPerfectPowerOf(n: bigint, base: bigint): bigint | null {
	if (base <= 1n || n <= 0n) return null;
	if (n === 1n) return 0n; // base^0 = 1
	if (n === base) return 1n; // base^1 = base

	let power = 0n;
	let current = 1n;
	while (current < n) {
		current *= base;
		power++;
		if (current === n) return power;
	}
	return null;
}

/**
 * Gets the numeric base value from a MathNode, or 10 if not specified.
 * Returns null for non-numeric bases (they need special handling).
 */
function getNumericBase(base: MathNode | undefined): bigint | null {
	if (!base) return 10n; // Default base 10
	if (base.type === 'number') {
		const val = parseInt(base.value, 10);
		if (Number.isInteger(val) && val > 1) return BigInt(val);
	}
	return null; // Non-numeric base
}

/**
 * Creates an opaque logarithm function NormalForm.
 * Works for both ln and log (with optional base).
 */
function createOpaqueLogFunction(
	arg: MathNode,
	logName: LogFunctionName,
	base?: MathNode
): NormalForm {
	const node: MathNode & { type: 'function' } = { type: 'function', name: logName, args: [arg] };
	if (base) {
		(node as MathNode & { type: 'function'; base?: MathNode }).base = base;
	}
	return normalizeOpaqueNode(node);
}

/**
 * Creates a NormalForm from a bigint integer.
 */
function normalFormFromInteger(n: bigint): NormalForm {
	return normalFormFromRational(fromInteger(n));
}

/**
 * Checks if a Rational equals 1.
 */
function isOneRational(r: Rational): boolean {
	return r.n === 1n && r.d === 1n;
}

/**
 * Expands log(n) where n is a positive integer > 1.
 * Uses prime factorization: log(12) = log(2²·3) = 2·log(2) + log(3)
 *
 * For log with numeric base, first checks if n is a perfect power of the base.
 * E.g., log_2(8) = 3 because 8 = 2³
 */
function expandLogInteger(n: bigint, logName: LogFunctionName, base?: MathNode): NormalForm {
	// For log (not ln), check if n is a perfect power of the base first
	if (logName === 'log') {
		const numericBase = getNumericBase(base);
		if (numericBase !== null) {
			const power = isPerfectPowerOf(n, numericBase);
			if (power !== null) {
				return normalFormFromInteger(power);
			}
		}
	}

	const factors = primeFactorization(n);

	// If no factors (n=1), this shouldn't happen but return 0
	if (factors.length === 0) return ZERO_NORMAL_FORM;

	// If single prime with exponent 1, just return log(prime) opaque
	if (factors.length === 1 && factors[0][1] === 1n) {
		const prime = factors[0][0];
		return createOpaqueLogFunction({ type: 'number', value: prime.toString() }, logName, base);
	}

	// Build: sum of (exp * log(prime))
	let result = ZERO_NORMAL_FORM;

	for (const [prime, exp] of factors) {
		// Use recursive normalization to handle log_b(b) = 1
		const logPrimeNode: MathNode & { type: 'function'; base?: MathNode } = {
			type: 'function',
			name: logName,
			args: [{ type: 'number', value: prime.toString() }]
		};
		if (base) logPrimeNode.base = base;

		const logPrime = normalizeNode(logPrimeNode);

		if (exp === 1n) {
			result = addNormalForms(result, logPrime);
		} else {
			const expForm = normalFormFromInteger(exp);
			const term = mulNormalForms(expForm, logPrime);
			result = addNormalForms(result, term);
		}
	}

	return result;
}

/**
 * Expands log(x^n) = n·log(x)
 * Uses recursive normalization to handle composition (e.g., ln(exp(x)) = x)
 */
function expandLogPower(
	info: { base: MathNode; exponent: Rational },
	logName: LogFunctionName,
	logBase?: MathNode
): NormalForm {
	// Use normalizeNode to allow ln(exp(x)) = x composition rule
	const logNode: MathNode & { type: 'function'; base?: MathNode } = {
		type: 'function',
		name: logName,
		args: [info.base]
	};
	if (logBase) logNode.base = logBase;

	const logBaseForm = normalizeNode(logNode);
	const expForm = normalFormFromRational(info.exponent);
	return mulNormalForms(expForm, logBaseForm);
}

/**
 * Expands log(a·b·c) = log(a) + log(b) + log(c)
 * Uses recursive normalization to handle nested expansions (e.g., log(x^2) in log(x^2·y))
 */
function expandLogProduct(
	factors: MathNode[],
	logName: LogFunctionName,
	base?: MathNode
): NormalForm {
	if (factors.length === 0) return ZERO_NORMAL_FORM;

	// Use recursive normalization to handle nested expansions
	const normalizeLogFactor = (f: MathNode): NormalForm => {
		const logNode: MathNode & { type: 'function'; base?: MathNode } = {
			type: 'function',
			name: logName,
			args: [f]
		};
		if (base) logNode.base = base;
		return normalizeNode(logNode);
	};

	if (factors.length === 1) return normalizeLogFactor(factors[0]);

	let result = normalizeLogFactor(factors[0]);
	for (let i = 1; i < factors.length; i++) {
		result = addNormalForms(result, normalizeLogFactor(factors[i]));
	}
	return result;
}

/**
 * Expands log(n/d) where n and d are positive integers.
 * Uses: log(n/d) = log(n) - log(d)
 */
function expandLogRational(
	n: bigint,
	d: bigint,
	logName: LogFunctionName,
	base?: MathNode
): NormalForm {
	// Recursively normalize log(n) and log(d) to handle prime factorization
	const logNNode: MathNode & { type: 'function'; base?: MathNode } = {
		type: 'function',
		name: logName,
		args: [{ type: 'number', value: n.toString() }]
	};
	if (base) logNNode.base = base;

	const logDNode: MathNode & { type: 'function'; base?: MathNode } = {
		type: 'function',
		name: logName,
		args: [{ type: 'number', value: d.toString() }]
	};
	if (base) logDNode.base = base;

	const logN: NormalForm = normalizeNode(logNNode);
	const logD: NormalForm = normalizeNode(logDNode);
	return subNormalForms(logN, logD);
}

/**
 * Expands log(a/b) = log(a) - log(b)
 */
function expandLogDivision(
	form: NormalForm,
	logName: LogFunctionName,
	base?: MathNode
): NormalForm {
	const numNode = denormalize(normalFormFromFraction(form.numerator, ONE_POLYNOMIAL));
	const denNode = denormalize(normalFormFromFraction(form.denominator, ONE_POLYNOMIAL));

	// Recursively normalize log(numerator) and log(denominator)
	// This handles cases like log(12/9) = log(12) - log(9) = (2log2 + log3) - 2log3
	const logNumNode: MathNode & { type: 'function'; base?: MathNode } = {
		type: 'function',
		name: logName,
		args: [numNode]
	};
	if (base) logNumNode.base = base;

	const logDenNode: MathNode & { type: 'function'; base?: MathNode } = {
		type: 'function',
		name: logName,
		args: [denNode]
	};
	if (base) logDenNode.base = base;

	const logNum: NormalForm = normalizeNode(logNumNode);
	const logDen: NormalForm = normalizeNode(logDenNode);

	return subNormalForms(logNum, logDen);
}

// NOTE: Exp expansion functions (expandExpSum, extractExpCoefficient, expandExpCoefficient)
// have been removed in favor of the combination approach.
// Canonical form for exp is now exp(polynomial), not product of exp terms.
// See combineExpInMonomial, combineExpInPolynomial, combineExpAcrossFraction.

// =============================================================================
// Function Node Canonicalization
// =============================================================================

/**
 * Creates a canonical FunctionNode with normalized arguments.
 * This ensures that sin(x+x) and sin(2x) produce the same hash.
 */
function canonicalizeFunctionNode(
	node: MathNode & { type: 'function' },
	ctx?: NormalizeContext
): MathNode & { type: 'function' } {
	const normalizedArgs = node.args.map((arg) => denormalize(normalizeNode(arg, ctx)));

	return {
		type: 'function' as const,
		name: node.name,
		args: normalizedArgs,
		...(node.power && { power: denormalize(normalizeNode(node.power, ctx)) }),
		...(node.base && { base: denormalize(normalizeNode(node.base, ctx)) }),
		...(node.derivativeOrder !== undefined && { derivativeOrder: node.derivativeOrder }),
		...(node.isInverse !== undefined && { isInverse: node.isInverse })
	};
}

/**
 * Normalizes a sqrt function call.
 *
 * Handles several cases:
 * - √(a × a) = a (before canonicalization, to avoid expanding a²)
 * - √(a^{2n}) = a^n (before canonicalization)
 * - √n for positive integer n (simplify radical)
 * - √(variable) = variable^{1/2} (fractional exponent in monomial)
 * - √(expression) = (expression)^{1/2} (for arbitrary expressions)
 */
function normalizeSqrt(node: MathNode & { type: 'function' }, ctx?: NormalizeContext): NormalForm {
	const originalArg = node.args[0];

	// ════════ PHASE A: Check BEFORE canonicalization ════════
	// These checks must happen before canonicalization to avoid
	// expanding squares like (x+1)² into x² + 2x + 1

	// A1. √(a × a) = a — detect identical factors in multiplication
	if (originalArg.type === 'multiplication') {
		const leftHash = hashMathNode(originalArg.left);
		const rightHash = hashMathNode(originalArg.right);
		if (leftHash === rightHash) {
			const result = normalizeNode(originalArg.left, ctx);
			recordNormalizationStep(ctx, 'sqrt-of-square', node, result, 'summarized');
			return result;
		}
	}

	// A2. √(a^{2n}) = a^n — detect even power exponent
	if (originalArg.type === 'superscript') {
		const exp = getRationalExponent(originalArg.superscript);
		if (exp && exp.d === 1n && exp.n >= 2n && exp.n % 2n === 0n) {
			// Even integer exponent: √(a^{2k}) = a^k
			const halfExp: Rational = { n: exp.n / 2n, d: 1n };
			if (halfExp.n === 1n) {
				// √(a²) = a
				const result = normalizeNode(originalArg.base, ctx);
				recordNormalizationStep(ctx, 'sqrt-of-square', node, result, 'summarized');
				return result;
			} else {
				// √(a^{2k}) = a^k where k > 1
				const result = normalizeSymbolicPower(originalArg.base, halfExp, ctx);
				recordNormalizationStep(ctx, 'sqrt-of-even-power', node, result, 'summarized');
				return result;
			}
		}
	}

	// ════════ PHASE B: Canonicalize and process ════════
	const canonicalNode = canonicalizeFunctionNode(node, ctx);
	const arg = canonicalNode.args[0];

	// B1. √n for positive integer — use AlgebraicCoefficient (existing logic)
	if (arg.type === 'number') {
		const val = parseFloat(arg.value);
		if (Number.isInteger(val) && val >= 0) {
			const n = BigInt(Math.floor(val));

			// √0 = 0
			if (n === 0n) {
				recordNormalizationStep(ctx, 'radical-simplify', node, ZERO_NORMAL_FORM, 'summarized');
				return ZERO_NORMAL_FORM;
			}

			const simplified = simplifyRadical(n, 2n);

			if (simplified.radicand === 1n) {
				// Perfect square: √n = coefficient
				const term = termFromRational(fromInteger(simplified.coefficient));
				const result = normalFormFromPolynomial(polynomialFromTerm(term));
				recordNormalizationStep(ctx, 'radical-simplify', node, result, 'summarized');
				return result;
			}

			// Not a perfect square: coefficient × √(radicand)
			const coeffTerm = algebraicFromRational(fromInteger(simplified.coefficient));
			const radicalCoeff = algebraicFromRadical({
				radicand: simplified.radicand,
				index: 2n
			});
			const combined = mulAlgebraic(coeffTerm, radicalCoeff);

			const term: NormalTerm = {
				coefficient: combined,
				monomial: EMPTY_MONOMIAL
			};

			const result = normalFormFromPolynomial(polynomialFromTerm(term));
			if (simplified.coefficient !== 1n) {
				recordNormalizationStep(ctx, 'radical-simplify', node, result, 'summarized');
			}
			return result;
		}
	}

	// B2. √(variable) = variable^{1/2}
	if (arg.type === 'variable') {
		const term = termFromSymbolicFactor(arg, { n: 1n, d: 2n });
		const result = normalFormFromPolynomial(polynomialFromTerm(term));
		recordNormalizationStep(ctx, 'sqrt-to-half-power', node, result, 'detailed');
		return result;
	}

	// B3. √(greek like π, e) = symbol^{1/2}
	if (arg.type === 'greek') {
		const term = termFromSymbolicFactor(arg, { n: 1n, d: 2n });
		const result = normalFormFromPolynomial(polynomialFromTerm(term));
		recordNormalizationStep(ctx, 'sqrt-to-half-power', node, result, 'detailed');
		return result;
	}

	// B4. √(n·monomial) — extract perfect square factors
	// For expressions like √(4x) → 2√x, √(9x²) → 3x, √(4x²y) → 2x√y
	{
		const argForm = normalizeNode(arg, ctx);

		// Check if it's a single-term polynomial (not a sum, not a fraction)
		if (
			argForm.denominator.length === 1 &&
			isOnePolynomial(argForm.denominator) &&
			argForm.numerator.length === 1
		) {
			const singleTerm = argForm.numerator[0];
			const { coefficient, monomial } = singleTerm;

			// Check if coefficient is a pure positive rational
			if (isPureRational(coefficient)) {
				const ratValue = getRationalValue(coefficient);
				if (ratValue !== null && ratValue.n > 0n && ratValue.d > 0n) {
					// Extract perfect square from numerator and denominator
					const numSimplified = simplifyRadical(ratValue.n, 2n);
					const denSimplified = simplifyRadical(ratValue.d, 2n);

					// Extract even exponents from monomial
					const extractedFactors: typeof monomial = [];
					const remainingFactors: typeof monomial = [];

					for (const factor of monomial) {
						const { base, exponent } = factor;
						// Only process integer exponents >= 2
						if (exponent.d === 1n && exponent.n >= 2n) {
							const halfExp = exponent.n / 2n;
							const remainderExp = exponent.n % 2n;

							if (halfExp >= 1n) {
								// Extract x^halfExp from √(x^exponent)
								extractedFactors.push(symbolicFactor(base, { n: halfExp, d: 1n }));
							}
							if (remainderExp > 0n) {
								// Remaining odd part stays under sqrt
								remainingFactors.push(symbolicFactor(base, { n: remainderExp, d: 1n }));
							}
						} else if (exponent.d === 1n && exponent.n === 1n) {
							// Exponent is 1: stays under sqrt entirely
							remainingFactors.push(factor);
						} else {
							// Fractional exponents: stays under sqrt
							remainingFactors.push(factor);
						}
					}

					// Check if anything was extracted
					const hasExtractedCoeff =
						numSimplified.coefficient !== 1n || denSimplified.coefficient !== 1n;
					const hasExtractedMonomial = extractedFactors.length > 0;

					if (hasExtractedCoeff || hasExtractedMonomial) {
						// Build the extracted coefficient: numCoeff / denCoeff
						const extractedCoeff = algebraicFromRational(
							rational(numSimplified.coefficient, denSimplified.coefficient)
						);

						// Build the extracted monomial term
						const sortedExtracted = sortSymbolicFactors(extractedFactors);
						const extractedTerm: NormalTerm = {
							coefficient: extractedCoeff,
							monomial: sortedExtracted
						};
						const extractedForm = normalFormFromPolynomial(polynomialFromTerm(extractedTerm));

						// Build the remaining part under sqrt
						const hasRemainingCoeff =
							numSimplified.radicand !== 1n || denSimplified.radicand !== 1n;
						const hasRemainingMonomial = remainingFactors.length > 0;

						if (!hasRemainingCoeff && !hasRemainingMonomial) {
							// Perfect square: √(4x²) = 2x
							recordNormalizationStep(
								ctx,
								'sqrt-extract-perfect-square',
								node,
								extractedForm,
								'summarized'
							);
							return extractedForm;
						}

						// Build √(remaining)
						let remainingForm: NormalForm;

						if (hasRemainingCoeff && !hasRemainingMonomial) {
							// Only numeric remaining: √(radicand)
							const radicalCoeff = mulAlgebraic(
								algebraicFromRadical({ radicand: numSimplified.radicand, index: 2n }),
								denSimplified.radicand !== 1n
									? divAlgebraic(
											ALGEBRAIC_ONE,
											algebraicFromRadical({ radicand: denSimplified.radicand, index: 2n })
										)
									: ALGEBRAIC_ONE
							);
							const radicalTerm: NormalTerm = {
								coefficient: radicalCoeff,
								monomial: EMPTY_MONOMIAL
							};
							remainingForm = normalFormFromPolynomial(polynomialFromTerm(radicalTerm));
						} else if (!hasRemainingCoeff && hasRemainingMonomial) {
							// Only symbolic remaining: monomial^{1/2}
							const sortedRemaining = sortSymbolicFactors(remainingFactors);
							// Convert each factor: x^n → x^{n/2}
							const halfPowFactors = sortedRemaining.map((f) =>
								symbolicFactor(f.base, { n: f.exponent.n, d: f.exponent.d * 2n })
							);
							const remainingTerm: NormalTerm = {
								coefficient: ALGEBRAIC_ONE,
								monomial: halfPowFactors
							};
							remainingForm = normalFormFromPolynomial(polynomialFromTerm(remainingTerm));
						} else {
							// Both numeric and symbolic remaining
							// Build √(numRadicand/denRadicand) * monomial^{1/2}
							const radicalCoeff = mulAlgebraic(
								algebraicFromRadical({ radicand: numSimplified.radicand, index: 2n }),
								denSimplified.radicand !== 1n
									? divAlgebraic(
											ALGEBRAIC_ONE,
											algebraicFromRadical({ radicand: denSimplified.radicand, index: 2n })
										)
									: ALGEBRAIC_ONE
							);
							const sortedRemaining = sortSymbolicFactors(remainingFactors);
							const halfPowFactors = sortedRemaining.map((f) =>
								symbolicFactor(f.base, { n: f.exponent.n, d: f.exponent.d * 2n })
							);
							const remainingTerm: NormalTerm = {
								coefficient: radicalCoeff,
								monomial: halfPowFactors
							};
							remainingForm = normalFormFromPolynomial(polynomialFromTerm(remainingTerm));
						}

						// Combine: extracted * √(remaining)
						const result = mulNormalForms(extractedForm, remainingForm);
						recordNormalizationStep(ctx, 'sqrt-extract-perfect-square', node, result, 'summarized');
						return result;
					}
				}
			}
		}
	}

	// B5. √(a² ± 2ab + b²) = |a ± b| — perfect square trinomial
	// For expressions like √(x² + 2x + 1) → x + 1
	{
		const argForm = normalizeNode(arg, ctx);

		// Check if it's a 3-term polynomial (not a fraction)
		if (
			argForm.denominator.length === 1 &&
			isOnePolynomial(argForm.denominator) &&
			argForm.numerator.length === 3
		) {
			const factored = tryFactorPerfectSquareTrinomial(argForm.numerator, ctx);
			if (factored !== null) {
				recordNormalizationStep(ctx, 'sqrt-perfect-square-trinomial', node, factored, 'summarized');
				return factored;
			}
		}
	}

	// B6. √(expression) = (expression)^{1/2}
	// Unwrap delimiter if present, then create fractional power
	const baseExpr = arg.type === 'delimiter' ? arg.content : arg;
	const term = termFromSymbolicFactor(baseExpr, { n: 1n, d: 2n });
	const result = normalFormFromPolynomial(polynomialFromTerm(term));
	recordNormalizationStep(ctx, 'sqrt-to-half-power', node, result, 'detailed');
	return result;
}

/**
 * Normalizes a function call.
 * Arguments are normalized first to ensure canonical representation.
 */
function normalizeFunction(
	node: MathNode & { type: 'function' },
	ctx?: NormalizeContext
): NormalForm {
	const { name } = node;

	// 2. Handle sqrt specially (before canonicalization to detect √(a×a))
	if (name === 'sqrt' && node.args.length === 1) {
		return normalizeSqrt(node, ctx);
	}

	// 3. Canonicalize arguments for other functions
	const canonicalNode = canonicalizeFunctionNode(node, ctx);
	const canonicalArgs = canonicalNode.args;

	// 4. Handle trigonometric functions
	if ((name === 'sin' || name === 'cos' || name === 'tan') && canonicalArgs.length === 1) {
		const argForm = normalizeNode(canonicalArgs[0], ctx);

		// Check for argument = k*π
		const piCoeff = getPiCoefficient(argForm);
		if (piCoeff !== null) {
			const result =
				name === 'sin'
					? getSineValue(piCoeff)
					: name === 'cos'
						? getCosineValue(piCoeff)
						: getTangentValue(piCoeff);
			if (result !== null) {
				// Record trig known value step
				recordNormalizationStep(ctx, 'trig-known-value', node, result, 'summarized');
				return result;
			}
		}

		// Also check for arg = 0 (sin(0) = 0, cos(0) = 1, tan(0) = 0)
		if (isZeroNormalForm(argForm)) {
			if (name === 'sin' || name === 'tan') {
				recordNormalizationStep(ctx, 'trig-known-value', node, ZERO_NORMAL_FORM, 'summarized');
				return ZERO_NORMAL_FORM;
			}
			if (name === 'cos') {
				recordNormalizationStep(ctx, 'trig-known-value', node, ONE_NORMAL_FORM, 'summarized');
				return ONE_NORMAL_FORM;
			}
		}

		return normalizeOpaqueNode(canonicalNode);
	}

	// 4. Handle logarithms
	if ((name === 'ln' || name === 'log') && canonicalArgs.length === 1) {
		const arg = canonicalArgs[0];

		// ln(exp(x)) = x — check BEFORE normalizing to avoid unnecessary work
		if (name === 'ln' && arg.type === 'function' && arg.name === 'exp' && arg.args.length === 1) {
			const result = normalizeNode(arg.args[0], ctx);
			// Record ln-exp-inverse step
			recordNormalizationStep(ctx, 'ln-exp-inverse', node, result, 'summarized');
			return result;
		}

		// log(base^x) = x — inverse rule, check BEFORE normalizing
		if (name === 'log' && arg.type === 'superscript') {
			const expBase = arg.base;
			const logBase = canonicalNode.base;
			const numericLogBase = getNumericBase(logBase);

			// Check if exp base matches log base (numeric case)
			if (numericLogBase !== null && expBase.type === 'number') {
				const expBaseVal = BigInt(expBase.value);
				if (expBaseVal === numericLogBase) {
					const result = normalizeNode(arg.superscript, ctx);
					recordNormalizationStep(ctx, 'log-simplify', node, result, 'summarized');
					return result; // log_b(b^x) = x
				}
			}

			// For symbolic bases: log_b(b^x) = x via hash comparison
			if (logBase && hashMathNode(expBase) === hashMathNode(logBase)) {
				const result = normalizeNode(arg.superscript, ctx);
				recordNormalizationStep(ctx, 'log-simplify', node, result, 'summarized');
				return result;
			}
		}

		const argForm = normalizeNode(arg, ctx);

		// ln(1) = 0, log(1) = 0
		if (isIntegerValue(argForm, 1n)) {
			recordNormalizationStep(ctx, 'ln-one', node, ZERO_NORMAL_FORM, 'detailed');
			return ZERO_NORMAL_FORM;
		}

		// ln(e) = 1
		if (name === 'ln' && isEulerNumber(argForm)) {
			recordNormalizationStep(ctx, 'ln-e', node, ONE_NORMAL_FORM, 'detailed');
			return ONE_NORMAL_FORM;
		}

		// === LN EXPANSION ===
		if (name === 'ln') {
			// ln(n) where n is integer > 1 → expand via prime factorization
			const intVal = extractPositiveInteger(argForm);
			if (intVal !== null && intVal > 1n && intVal <= FACTORIZATION_LIMIT) {
				return expandLogInteger(intVal, 'ln');
			}

			// ln(n/d) where n/d is a positive rational → expand as ln(n) - ln(d)
			const ratVal = extractPositiveRational(argForm);
			if (ratVal !== null && ratVal.n <= FACTORIZATION_LIMIT && ratVal.d <= FACTORIZATION_LIMIT) {
				return expandLogRational(ratVal.n, ratVal.d, 'ln');
			}

			// ln(x^n) = n·ln(x) — but only if exponent != 1
			const powerInfo = extractSimplePower(argForm);
			if (powerInfo && !isOneRational(powerInfo.exponent)) {
				return expandLogPower(powerInfo, 'ln');
			}

			// ln(a·b·c) = ln(a) + ln(b) + ln(c)
			const factors = extractProductFactors(argForm);
			if (factors.length > 1) {
				return expandLogProduct(factors, 'ln');
			}

			// ln(a/b) = ln(a) - ln(b)
			if (!isOnePolynomial(argForm.denominator)) {
				return expandLogDivision(argForm, 'ln');
			}
		}

		// === LOG EXPANSION ===
		if (name === 'log') {
			const logBase = canonicalNode.base;

			// log(10) = 1 (base 10) - check before expansion
			if (isIntegerValue(argForm, 10n)) {
				if (!logBase || (logBase.type === 'number' && logBase.value === '10')) {
					return ONE_NORMAL_FORM;
				}
			}

			// log_b(b) = 1 - check before expansion
			if (logBase) {
				const baseForm = normalizeNode(logBase);
				if (argForm.hash === baseForm.hash) return ONE_NORMAL_FORM;
			}

			// log(n) where n is integer > 1 → check perfect power of base OR expand via prime factorization
			const intVal = extractPositiveInteger(argForm);
			if (intVal !== null && intVal > 1n && intVal <= FACTORIZATION_LIMIT) {
				return expandLogInteger(intVal, 'log', logBase);
			}

			// log(n/d) where n/d is a positive rational → expand as log(n) - log(d)
			const ratVal = extractPositiveRational(argForm);
			if (ratVal !== null && ratVal.n <= FACTORIZATION_LIMIT && ratVal.d <= FACTORIZATION_LIMIT) {
				return expandLogRational(ratVal.n, ratVal.d, 'log', logBase);
			}

			// log(x^n) = n·log(x) — but only if exponent != 1
			const powerInfo = extractSimplePower(argForm);
			if (powerInfo && !isOneRational(powerInfo.exponent)) {
				return expandLogPower(powerInfo, 'log', logBase);
			}

			// log(a·b·c) = log(a) + log(b) + log(c)
			const factors = extractProductFactors(argForm);
			if (factors.length > 1) {
				return expandLogProduct(factors, 'log', logBase);
			}

			// log(a/b) = log(a) - log(b)
			if (!isOnePolynomial(argForm.denominator)) {
				return expandLogDivision(argForm, 'log', logBase);
			}
		}

		return normalizeOpaqueNode(canonicalNode);
	}

	// 5. Handle exponentials
	if (name === 'exp' && node.args.length === 1) {
		// exp(ln(x)) = x — check ORIGINAL arg BEFORE canonicalization to avoid ln expansion
		const originalArg = node.args[0];
		if (
			originalArg.type === 'function' &&
			originalArg.name === 'ln' &&
			originalArg.args.length === 1
		) {
			const result = normalizeNode(originalArg.args[0], ctx);
			// Record exp-ln-inverse step
			recordNormalizationStep(ctx, 'exp-ln-inverse', node, result, 'summarized');
			return result;
		}

		const arg = canonicalArgs[0];
		const argForm = normalizeNode(arg, ctx);

		// exp(0) = 1 (use isZeroNormalForm to handle both ZERO_NORMAL_FORM and explicit 0)
		if (isZeroNormalForm(argForm)) {
			recordNormalizationStep(ctx, 'exp-zero', node, ONE_NORMAL_FORM, 'detailed');
			return ONE_NORMAL_FORM;
		}

		// exp(1) = e
		if (isIntegerValue(argForm, 1n)) {
			const eForm = normalizeNode({ type: 'variable', name: 'e' }, ctx);
			recordNormalizationStep(ctx, 'exp-one', node, eForm, 'detailed');
			return eForm;
		}

		// Partial extraction of ln terms: exp(Σ aᵢ·ln(xᵢ) + remainder) = Π xᵢ^aᵢ · exp(remainder)
		const { lnTerms, remainder } = extractPartialLinearCombinationOfLn(argForm);

		if (lnTerms.length > 0) {
			// Build product: Π xᵢ^aᵢ
			let result = ONE_NORMAL_FORM;
			for (const { base, coeff } of lnTerms) {
				const powerNode = buildPowerNode(base, coeff);
				const powerForm = normalizeNode(powerNode, ctx);
				result = mulNormalForms(result, powerForm);
			}

			// If there's a non-zero remainder, multiply by exp(remainder)
			if (!isZeroNormalForm(remainder)) {
				const remainderNode = denormalize(remainder);
				const expRemainderNode: MathNode = { type: 'function', name: 'exp', args: [remainderNode] };
				// Recursively normalize exp(remainder) - this handles exp(0)=1, exp(1)=e, etc.
				const expRemainderForm = normalizeNode(expRemainderNode, ctx);
				result = mulNormalForms(result, expRemainderForm);
			}

			// Record exp-ln-inverse for partial extraction
			recordNormalizationStep(ctx, 'exp-ln-inverse', node, result, 'summarized');
			return result;
		}

		// === EXP COMBINATION APPROACH ===
		// No ln terms to extract - treat exp as opaque.
		// Canonical form: exp(polynomial)
		// Combination happens in:
		// - mulNormalForms: exp(a)·exp(b) → exp(a+b)
		// - combineExpAcrossFraction: exp(a)/exp(b) → exp(a-b)
		// - powNormalForm: exp(a)^n → exp(n·a)

		return normalizeOpaqueNode(canonicalNode);
	}

	// 6. Other functions - opaque with normalized args
	return normalizeOpaqueNode(canonicalNode);
}

/**
 * Normalizes a node with a symbolic (non-integer) power.
 */
function normalizeSymbolicPower(
	base: MathNode,
	exponent: Rational,
	ctx?: NormalizeContext
): NormalForm {
	// Handle negative integer exponents: base^(-n) = 1/base^n
	if (exponent.n < 0n && exponent.d === 1n) {
		const posExp: Rational = { n: -exponent.n, d: 1n };
		const baseForm = normalizeNode(base, ctx);

		// Create the positive power in denominator
		if (posExp.n === 1n) {
			// base^(-1) = 1/base
			return normalFormFromFraction(ONE_POLYNOMIAL, baseForm.numerator);
		} else {
			// base^(-n) = 1/base^n
			const posIntExp = Number(posExp.n);
			const poweredBase = powNormalForm(baseForm, posIntExp);
			return normalFormFromFraction(ONE_POLYNOMIAL, poweredBase.numerator);
		}
	}

	// Normalize the base first
	const baseForm = normalizeNode(base, ctx);

	// If base is a single variable, we can create a symbolic factor
	if (
		baseForm.numerator.length === 1 &&
		isOnePolynomial(baseForm.denominator) &&
		baseForm.numerator[0].coefficient.terms.length === 1 &&
		baseForm.numerator[0].coefficient.terms[0].radicals.length === 0 &&
		baseForm.numerator[0].coefficient.terms[0].rational.n === 1n &&
		baseForm.numerator[0].coefficient.terms[0].rational.d === 1n &&
		baseForm.numerator[0].monomial.length === 1 &&
		baseForm.numerator[0].monomial[0].exponent.n === 1n &&
		baseForm.numerator[0].monomial[0].exponent.d === 1n
	) {
		// Base is a simple variable: x^(a/b)
		const baseVar = baseForm.numerator[0].monomial[0].base;
		const term = termFromSymbolicFactor(baseVar, exponent);
		return normalFormFromPolynomial(polynomialFromTerm(term));
	}

	// Complex base with rational exponent - treat as opaque
	const powerNode: MathNode = {
		type: 'superscript',
		base,
		superscript: {
			type: 'number',
			value: exponent.d === 1n ? exponent.n.toString() : `${exponent.n}/${exponent.d}`
		}
	};

	return normalizeOpaqueNode(powerNode);
}

/**
 * Normalizes an opaque node (treated as a single symbolic factor).
 */
function normalizeOpaqueNode(node: MathNode): NormalForm {
	const term: NormalTerm = {
		coefficient: ALGEBRAIC_ONE,
		monomial: [symbolicFactor(node, ONE)]
	};
	return normalFormFromPolynomial(polynomialFromTerm(term));
}

// =============================================================================
// Normal Form Arithmetic
// =============================================================================

/**
 * Adds two normal forms.
 *
 * (a/b) + (c/d) = (ad + bc) / bd
 */
function addNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	// If denominators are the same (both = 1), just add numerators
	if (isOnePolynomial(a.denominator) && isOnePolynomial(b.denominator)) {
		const sum = addPolynomials(a.numerator, b.numerator);
		return normalFormFromPolynomial(sum);
	}

	// General case: (a/b) + (c/d) = (ad + bc) / bd
	const ad = mulPolynomials(a.numerator, b.denominator);
	const bc = mulPolynomials(b.numerator, a.denominator);
	const numerator = addPolynomials(ad, bc);
	const denominator = mulPolynomials(a.denominator, b.denominator);

	return normalFormFromFraction(numerator, denominator);
}

/**
 * Subtracts two normal forms.
 *
 * (a/b) - (c/d) = (ad - bc) / bd
 */
function subNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	// If denominators are the same (both = 1), just subtract numerators
	if (isOnePolynomial(a.denominator) && isOnePolynomial(b.denominator)) {
		const diff = subPolynomials(a.numerator, b.numerator);
		return normalFormFromPolynomial(diff);
	}

	// General case: (a/b) - (c/d) = (ad - bc) / bd
	const ad = mulPolynomials(a.numerator, b.denominator);
	const bc = mulPolynomials(b.numerator, a.denominator);
	const numerator = subPolynomials(ad, bc);
	const denominator = mulPolynomials(a.denominator, b.denominator);

	return normalFormFromFraction(numerator, denominator);
}

// =============================================================================
// Exp Combination
// =============================================================================

/**
 * Checks if a MathNode is an exp function call.
 */
function isExpFunction(node: MathNode): node is MathNode & { type: 'function'; name: 'exp' } {
	return node.type === 'function' && node.name === 'exp';
}

/**
 * Checks if a MathNode is a sqrt function call.
 */
function isSqrtFunction(node: MathNode): node is MathNode & { type: 'function'; name: 'sqrt' } {
	return node.type === 'function' && node.name === 'sqrt' && node.args.length === 1;
}

/**
 * Gets the argument of an exp function.
 */
function getExpArg(node: MathNode & { type: 'function'; name: 'exp' }): MathNode {
	return node.args[0];
}

/**
 * Scales a MathNode by a rational exponent.
 * Returns exp * node where exp is represented as a MathNode.
 */
function scaleNodeByRational(node: MathNode, exp: Rational): MathNode {
	// exp = 1 → just return node
	if (exp.n === 1n && exp.d === 1n) {
		return node;
	}

	// exp = -1 → return -node
	if (exp.n === -1n && exp.d === 1n) {
		return { type: 'opposite', operand: node };
	}

	// exp = 0 → return 0
	if (exp.n === 0n) {
		return { type: 'number', value: '0' };
	}

	// General case: create exp * node
	const expNode: MathNode =
		exp.d === 1n
			? { type: 'number', value: exp.n.toString() }
			: {
					type: 'division',
					numerator: { type: 'number', value: exp.n.toString() },
					denominator: { type: 'number', value: exp.d.toString() },
					displayStyle: 'fraction'
				};

	return { type: 'multiplication', left: expNode, right: node, displayStyle: 'implicit' };
}

/**
 * Combines multiple exp factors in a monomial into a single exp(sum).
 * exp(a)^m * exp(b)^n → exp(m*a + n*b)
 *
 * This ensures canonical form for exponentials:
 * - exp(2) * exp(3) → exp(5)
 * - exp(x) * exp(y) → exp(x+y)
 */
function combineExpInMonomial(
	monomial: readonly import('./types').SymbolicFactor[]
): import('./types').SymbolicFactor[] {
	const expFactors: Array<{ arg: MathNode; exp: Rational }> = [];
	const otherFactors: import('./types').SymbolicFactor[] = [];

	// Separate exp factors from other factors
	for (const factor of monomial) {
		if (isExpFunction(factor.base)) {
			expFactors.push({ arg: getExpArg(factor.base), exp: factor.exponent });
		} else {
			otherFactors.push(factor);
		}
	}

	// Nothing to do if no exp factors
	if (expFactors.length === 0) {
		return [...monomial];
	}

	// Single exp factor with exponent 1: nothing to transform
	// But exp(x)^n with n ≠ 1 should become exp(n*x)
	if (expFactors.length === 1 && isOne(expFactors[0].exp)) {
		return [...monomial];
	}

	// Combine exp factors: sum of (exponent * argument)
	// Build the sum AST node
	let sumNode: MathNode = scaleNodeByRational(expFactors[0].arg, expFactors[0].exp);

	for (let i = 1; i < expFactors.length; i++) {
		const scaledArg = scaleNodeByRational(expFactors[i].arg, expFactors[i].exp);
		sumNode = { type: 'addition', left: sumNode, right: scaledArg };
	}

	// Normalize the sum to get canonical form (e.g., 2+3 → 5)
	const sumForm = normalizeNode(sumNode);

	// Check if result is zero: exp(0) = 1, so no factor needed
	if (isZeroNormalForm(sumForm)) {
		return sortSymbolicFactors(otherFactors);
	}

	// Convert back to MathNode
	const normalizedSum = denormalize(sumForm);

	// Create the combined exp factor
	const combinedExpNode: MathNode = { type: 'function', name: 'exp', args: [normalizedSum] };
	otherFactors.push(symbolicFactor(combinedExpNode, ONE));

	return sortSymbolicFactors(otherFactors);
}

/**
 * Checks if a NormalForm represents zero.
 */
function isZeroNormalForm(form: NormalForm): boolean {
	return form.numerator.length === 0 || form.hash === '0';
}

/**
 * Combines exp factors in all terms of a polynomial.
 */
function combineExpInPolynomial(terms: NormalTerm[]): NormalTerm[] {
	let changed = false;
	const result: NormalTerm[] = [];

	for (const term of terms) {
		// Check if monomial needs exp combination:
		// - 2+ exp factors: exp(a) * exp(b) → exp(a+b)
		// - 1 exp factor with exponent ≠ 1: exp(x)^n → exp(n*x)
		const expFactors = term.monomial.filter((f) => isExpFunction(f.base));
		const needsCombination =
			expFactors.length >= 2 || (expFactors.length === 1 && !isOne(expFactors[0].exponent));

		if (needsCombination) {
			const newMonomial = combineExpInMonomial(term.monomial);
			result.push({ coefficient: term.coefficient, monomial: newMonomial });
			changed = true;
		} else {
			result.push(term);
		}
	}

	return changed ? result : terms;
}

/**
 * Combines exp factors across numerator and denominator.
 * exp(a)/exp(b) → exp(a-b)/1
 *
 * This handles cases like exp(5)/exp(2) → exp(3).
 * Works when both numerator and denominator are single terms with exp factors.
 */
function combineExpAcrossFraction(
	numerator: NormalTerm[],
	denominator: NormalTerm[]
): { numerator: NormalTerm[]; denominator: NormalTerm[] } {
	// Only handle single-term cases for simplicity
	if (numerator.length !== 1 || denominator.length !== 1) {
		return { numerator, denominator };
	}

	const numTerm = numerator[0];
	const denTerm = denominator[0];

	// Collect exp factors from numerator
	const numExpFactors: Array<{ arg: MathNode; exp: Rational }> = [];
	const numOtherFactors: import('./types').SymbolicFactor[] = [];

	for (const factor of numTerm.monomial) {
		if (isExpFunction(factor.base)) {
			numExpFactors.push({ arg: getExpArg(factor.base), exp: factor.exponent });
		} else {
			numOtherFactors.push(factor);
		}
	}

	// Collect exp factors from denominator
	const denExpFactors: Array<{ arg: MathNode; exp: Rational }> = [];
	const denOtherFactors: import('./types').SymbolicFactor[] = [];

	for (const factor of denTerm.monomial) {
		if (isExpFunction(factor.base)) {
			denExpFactors.push({ arg: getExpArg(factor.base), exp: factor.exponent });
		} else {
			denOtherFactors.push(factor);
		}
	}

	// No combination needed if no exp factors at all
	if (numExpFactors.length === 0 && denExpFactors.length === 0) {
		return { numerator, denominator };
	}

	// If only denominator has exp factors (e.g., 1/exp(x) → exp(-x))
	// we still want to combine - this is handled below by the sumNode logic

	// Build combined argument: sum of (num_exp * arg) - sum of (den_exp * arg)
	// Start with numerator exp factors
	let sumNode: MathNode | null = null;

	for (const { arg, exp } of numExpFactors) {
		const scaledArg = scaleNodeByRational(arg, exp);
		if (sumNode === null) {
			sumNode = scaledArg;
		} else {
			sumNode = { type: 'addition', left: sumNode, right: scaledArg };
		}
	}

	// Subtract denominator exp factors (negate the exponents)
	for (const { arg, exp } of denExpFactors) {
		const negExp: Rational = { n: -exp.n, d: exp.d };
		const scaledArg = scaleNodeByRational(arg, negExp);
		if (sumNode === null) {
			sumNode = scaledArg;
		} else {
			sumNode = { type: 'addition', left: sumNode, right: scaledArg };
		}
	}

	if (sumNode === null) {
		return { numerator, denominator };
	}

	// Normalize the combined argument
	const sumForm = normalizeNode(sumNode);

	// Check if result is zero: exp(0) = 1
	if (isZeroNormalForm(sumForm)) {
		// exp factors cancel out completely
		const newNumTerm: NormalTerm = {
			coefficient: numTerm.coefficient,
			monomial: sortSymbolicFactors(numOtherFactors)
		};
		const newDenTerm: NormalTerm = {
			coefficient: denTerm.coefficient,
			monomial: sortSymbolicFactors(denOtherFactors)
		};
		return {
			numerator: [newNumTerm],
			denominator: [newDenTerm]
		};
	}

	// Create combined exp(sum) and put it in numerator
	const normalizedSum = denormalize(sumForm);
	const combinedExpNode: MathNode = { type: 'function', name: 'exp', args: [normalizedSum] };

	const newNumMonomial = [...numOtherFactors, symbolicFactor(combinedExpNode, ONE)];
	const newNumTerm: NormalTerm = {
		coefficient: numTerm.coefficient,
		monomial: sortSymbolicFactors(newNumMonomial)
	};

	const newDenTerm: NormalTerm = {
		coefficient: denTerm.coefficient,
		monomial: sortSymbolicFactors(denOtherFactors)
	};

	return {
		numerator: [newNumTerm],
		denominator: [newDenTerm]
	};
}

/**
 * Negates a normal form.
 */
function negNormalForm(a: NormalForm): NormalForm {
	const numerator = negPolynomial(a.numerator);
	return normalFormFromFraction(numerator, [...a.denominator]);
}

/**
 * Multiplies two normal forms.
 *
 * (a/b) * (c/d) = ac / bd
 *
 * Also combines exp factors: exp(a) * exp(b) → exp(a+b)
 */
function mulNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	let numerator = mulPolynomials(a.numerator, b.numerator);
	let denominator = mulPolynomials(a.denominator, b.denominator);

	// Combine exp factors in the result
	numerator = combineExpInPolynomial(numerator);
	denominator = combineExpInPolynomial(denominator);

	return normalFormFromFraction(numerator, denominator);
}

/**
 * Divides two normal forms.
 *
 * (a/b) / (c/d) = ad / bc
 *
 * Also combines exp factors: exp(a) / exp(b) → exp(a-b)
 */
function divNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	// Division by zero check
	if (isZeroPolynomial(b.numerator)) {
		throw new Error('normalize: division by zero');
	}

	let numerator = mulPolynomials(a.numerator, b.denominator);
	let denominator = mulPolynomials(a.denominator, b.numerator);

	// Combine exp factors in the result
	numerator = combineExpInPolynomial(numerator);
	denominator = combineExpInPolynomial(denominator);

	return normalFormFromFraction(numerator, denominator);
}

/**
 * Raises a normal form to a non-negative integer power.
 */
function powNormalForm(a: NormalForm, n: number): NormalForm {
	if (n === 0) {
		return ONE_NORMAL_FORM;
	}

	if (n === 1) {
		return a;
	}

	let numerator = powPolynomial(a.numerator, n);
	let denominator = powPolynomial(a.denominator, n);

	// Combine exp factors: exp(x)^n → exp(n*x)
	numerator = combineExpInPolynomial(numerator);
	denominator = combineExpInPolynomial(denominator);

	return normalFormFromFraction(numerator, denominator);
}

// =============================================================================
// Semantic Expression Checks
// =============================================================================

/**
 * Checks if a MathNode expression evaluates to zero.
 * Uses full normalization for mathematical correctness.
 *
 * @example
 * isZeroExpression(parse("0"))     // true
 * isZeroExpression(parse("x-x"))   // true
 * isZeroExpression(parse("0*x"))   // true
 * isZeroExpression(parse("1"))     // false
 */
export function isZeroExpression(node: MathNode): boolean {
	const form = normalize(node);
	return form.numerator.length === 0;
}

/**
 * Checks if a MathNode expression evaluates to one.
 * Uses full normalization for mathematical correctness.
 *
 * @example
 * isOneExpression(parse("1"))      // true
 * isOneExpression(parse("x/x"))    // true (assuming x ≠ 0)
 * isOneExpression(parse("2/2"))    // true
 * isOneExpression(parse("0"))      // false
 */
export function isOneExpression(node: MathNode): boolean {
	const form = normalize(node);
	return isOnePolynomial(form.numerator) && isOnePolynomial(form.denominator);
}

// =============================================================================
// Normalization with Step Recording (Public API)
// =============================================================================

/**
 * Normalizes a MathNode and records all transformation steps.
 *
 * This is the main API for pedagogical display of normalization.
 *
 * @param node - The MathNode to normalize
 * @param verbosity - Verbosity level for step filtering (default: 'summarized')
 * @returns Object with normalized form and recorded steps
 *
 * @example
 * const { result, steps } = normalizeWithSteps(parseLatex('x + x'), 'summarized');
 * // result: NormalForm for 2x
 * // steps: [{ rule: 'combine-like-terms', before: x+x, after: 2x, ... }]
 */
export function normalizeWithSteps(
	node: MathNode,
	verbosity: Verbosity = 'summarized'
): { result: NormalForm; steps: readonly NormalizationStep[] } {
	const recorder = new StepRecorder();
	const ctx: NormalizeContext = { recorder, verbosity };

	const result = normalize(node, ctx);

	return {
		result,
		steps: recorder.getStepsFiltered(verbosity)
	};
}

/**
 * Simplifies a MathNode and records all transformation steps.
 *
 * Returns a MathNode (via denormalize) instead of NormalForm,
 * convenient for display purposes.
 *
 * @param node - The MathNode to simplify
 * @param verbosity - Verbosity level for step filtering (default: 'summarized')
 * @returns Object with simplified MathNode and recorded steps
 *
 * @example
 * const { result, steps } = simplifyExpressionWithSteps(parseLatex('x + x'));
 * // result: MathNode for 2x
 * // steps: [{ rule: 'combine-like-terms', ... }]
 */
export function simplifyExpressionWithSteps(
	node: MathNode,
	verbosity: Verbosity = 'summarized'
): { result: MathNode; steps: readonly NormalizationStep[] } {
	const { result: form, steps } = normalizeWithSteps(node, verbosity);
	return {
		result: denormalize(form),
		steps
	};
}
