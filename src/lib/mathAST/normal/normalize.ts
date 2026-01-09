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
import type { NormalForm, NormalTerm, Rational } from './types';
import { hashPolynomial, hashNormalForm } from './hash';
import {
	ALGEBRAIC_ONE,
	algebraicFromRational,
	mulAlgebraic,
	algebraicFromRadical
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
import { ZERO_TERM } from './term';
import { EMPTY_MONOMIAL, symbolicFactor } from './monomial';
import { rational, fromInteger, ONE } from './rational';
import { simplifyRadical } from './radical';
import { simplify } from './rules/index.js';
import { denormalize } from './denormalize';

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
// Helper Functions
// =============================================================================

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

	// Reduce common monomial factors between numerator and denominator
	const gcd = gcdPolynomials(numerator, denominator);

	let reducedNumerator = numerator;
	let reducedDenominator = denominator;

	// If GCD is not 1, divide both by it
	if (!isOnePolynomial(gcd) && gcd.length === 1) {
		const gcdMonomial = gcd[0].monomial;
		reducedNumerator = divPolynomialByMonomial(numerator, gcdMonomial);
		reducedDenominator = divPolynomialByMonomial(denominator, gcdMonomial);
	}

	// After reduction, check if denominator became 1
	if (isOnePolynomial(reducedDenominator)) {
		return normalFormFromPolynomial(reducedNumerator);
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
 * Checks if an exponent is a positive integer.
 */
function getPositiveIntExponent(node: MathNode): number | null {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		if (Number.isInteger(val) && val > 0) {
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

	// TODO: Handle fraction nodes for rational exponents
	return null;
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
 * Extracts a linear combination of logarithms from a NormalForm.
 * Returns array of { base: MathNode, coeff: Rational } or null if not a pure linear combination.
 *
 * For example, 2·ln(x) + 3·ln(y) → [{ base: x, coeff: 2 }, { base: y, coeff: 3 }]
 *
 * This is used for the rule: exp(Σ aᵢ·ln(xᵢ)) = Π xᵢ^aᵢ
 */
function extractLinearCombinationOfLn(
	form: NormalForm
): { base: MathNode; coeff: Rational }[] | null {
	// Denominator must be 1
	if (!isOnePolynomial(form.denominator)) return null;

	// Empty numerator = 0, which is valid (exp(0) = 1)
	if (form.numerator.length === 0) return [];

	const result: { base: MathNode; coeff: Rational }[] = [];

	for (const term of form.numerator) {
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
		result.push({
			base: args[0],
			coeff: coeffTerm.rational
		});
	}

	return result;
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
 * @returns The canonical NormalForm
 */
export function normalize(node: MathNode): NormalForm {
	// First, apply simplification rules
	const simplified = simplify(node);

	// Then normalize
	return normalizeNode(simplified);
}

/**
 * Internal normalization of a simplified node.
 */
function normalizeNode(node: MathNode): NormalForm {
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
			const leftForm = normalizeNode(node.left);
			const rightForm = normalizeNode(node.right);
			return addNormalForms(leftForm, rightForm);
		}

		case 'subtraction': {
			const leftForm = normalizeNode(node.left);
			const rightForm = normalizeNode(node.right);
			return subNormalForms(leftForm, rightForm);
		}

		case 'positive': {
			// Positive sign is identity
			return normalizeNode(node.operand);
		}

		case 'opposite': {
			const form = normalizeNode(node.operand);
			return negNormalForm(form);
		}

		case 'multiplication': {
			const leftForm = normalizeNode(node.left);
			const rightForm = normalizeNode(node.right);
			return mulNormalForms(leftForm, rightForm);
		}

		case 'division': {
			const numForm = normalizeNode(node.numerator);
			const denForm = normalizeNode(node.denominator);
			return divNormalForms(numForm, denForm);
		}

		case 'superscript': {
			const baseForm = normalizeNode(node.base);

			// Check for positive integer exponent
			const intExp = getPositiveIntExponent(node.superscript);
			if (intExp !== null) {
				return powNormalForm(baseForm, intExp);
			}

			// Check for rational exponent
			const ratExp = getRationalExponent(node.superscript);
			if (ratExp !== null) {
				// For non-integer rational exponent, treat as symbolic
				return normalizeSymbolicPower(node.base, ratExp);
			}

			// General case: treat as opaque term
			return normalizeOpaqueNode(node);
		}

		case 'function': {
			return normalizeFunction(node);
		}

		case 'delimiter': {
			// Delimiters (parentheses) just normalize their content
			return normalizeNode(node.content);
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
			return normalizeNode(node.expression);
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

/**
 * Creates an opaque ln(arg) NormalForm.
 */
function createOpaqueLn(arg: MathNode): NormalForm {
	return normalizeOpaqueNode({ type: 'function', name: 'ln', args: [arg] });
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
 * Expands ln(n) where n is a positive integer > 1.
 * Uses prime factorization: ln(12) = ln(2²·3) = 2·ln(2) + ln(3)
 */
function expandLnInteger(n: bigint): NormalForm {
	const factors = primeFactorization(n);

	// If no factors (n=1), this shouldn't happen but return 0
	if (factors.length === 0) return ZERO_NORMAL_FORM;

	// If single prime with exponent 1, just return ln(prime) opaque
	if (factors.length === 1 && factors[0][1] === 1n) {
		const prime = factors[0][0];
		return createOpaqueLn({ type: 'number', value: prime.toString() });
	}

	// Build: sum of (exp * ln(prime))
	let result = ZERO_NORMAL_FORM;

	for (const [prime, exp] of factors) {
		const lnPrime = createOpaqueLn({ type: 'number', value: prime.toString() });

		if (exp === 1n) {
			result = addNormalForms(result, lnPrime);
		} else {
			const expForm = normalFormFromInteger(exp);
			const term = mulNormalForms(expForm, lnPrime);
			result = addNormalForms(result, term);
		}
	}

	return result;
}

/**
 * Expands ln(x^n) = n·ln(x)
 */
function expandLnPower(info: { base: MathNode; exponent: Rational }): NormalForm {
	const lnBase = createOpaqueLn(info.base);
	const expForm = normalFormFromRational(info.exponent);
	return mulNormalForms(expForm, lnBase);
}

/**
 * Expands ln(a·b·c) = ln(a) + ln(b) + ln(c)
 * Uses recursive normalization to handle nested expansions (e.g., ln(x^2) in ln(x^2·y))
 */
function expandLnProduct(factors: MathNode[]): NormalForm {
	if (factors.length === 0) return ZERO_NORMAL_FORM;

	// Use recursive normalization to handle nested expansions
	const normalizeLnFactor = (f: MathNode): NormalForm =>
		normalizeNode({ type: 'function', name: 'ln', args: [f] });

	if (factors.length === 1) return normalizeLnFactor(factors[0]);

	let result = normalizeLnFactor(factors[0]);
	for (let i = 1; i < factors.length; i++) {
		result = addNormalForms(result, normalizeLnFactor(factors[i]));
	}
	return result;
}

/**
 * Expands ln(n/d) where n and d are positive integers.
 * Uses: ln(n/d) = ln(n) - ln(d)
 */
function expandLnRational(n: bigint, d: bigint): NormalForm {
	// Recursively normalize ln(n) and ln(d) to handle prime factorization
	const lnN: NormalForm = normalizeNode({
		type: 'function',
		name: 'ln',
		args: [{ type: 'number', value: n.toString() }]
	});
	const lnD: NormalForm = normalizeNode({
		type: 'function',
		name: 'ln',
		args: [{ type: 'number', value: d.toString() }]
	});
	return subNormalForms(lnN, lnD);
}

/**
 * Expands ln(a/b) = ln(a) - ln(b)
 */
function expandLnDivision(form: NormalForm): NormalForm {
	const numNode = denormalize(normalFormFromFraction(form.numerator, ONE_POLYNOMIAL));
	const denNode = denormalize(normalFormFromFraction(form.denominator, ONE_POLYNOMIAL));

	// Recursively normalize ln(numerator) and ln(denominator)
	// This handles cases like ln(12/9) = ln(12) - ln(9) = (2ln2 + ln3) - 2ln3
	const lnNum: NormalForm = normalizeNode({ type: 'function', name: 'ln', args: [numNode] });
	const lnDen: NormalForm = normalizeNode({ type: 'function', name: 'ln', args: [denNode] });

	return subNormalForms(lnNum, lnDen);
}

// =============================================================================
// Function Node Canonicalization
// =============================================================================

/**
 * Creates a canonical FunctionNode with normalized arguments.
 * This ensures that sin(x+x) and sin(2x) produce the same hash.
 */
function canonicalizeFunctionNode(
	node: MathNode & { type: 'function' }
): MathNode & { type: 'function' } {
	const normalizedArgs = node.args.map((arg) => denormalize(normalizeNode(arg)));

	return {
		type: 'function' as const,
		name: node.name,
		args: normalizedArgs,
		...(node.power && { power: denormalize(normalizeNode(node.power)) }),
		...(node.base && { base: denormalize(normalizeNode(node.base)) }),
		...(node.derivativeOrder !== undefined && { derivativeOrder: node.derivativeOrder }),
		...(node.isInverse !== undefined && { isInverse: node.isInverse })
	};
}

/**
 * Normalizes a function call.
 * Arguments are normalized first to ensure canonical representation.
 */
function normalizeFunction(node: MathNode & { type: 'function' }): NormalForm {
	const { name } = node;

	// 1. Canonicalize arguments first
	const canonicalNode = canonicalizeFunctionNode(node);
	const canonicalArgs = canonicalNode.args;

	// 2. Handle sqrt specially (with already normalized argument)
	if (name === 'sqrt' && canonicalArgs.length === 1) {
		const arg = canonicalArgs[0];

		// sqrt of a positive integer - simplify the radical
		if (arg.type === 'number') {
			const val = parseFloat(arg.value);
			if (Number.isInteger(val) && val >= 0) {
				const n = BigInt(Math.floor(val));
				const simplified = simplifyRadical(n, 2n);

				if (simplified.radicand === 1n) {
					// Perfect square: sqrt(n) = coefficient
					const term = termFromRational(fromInteger(simplified.coefficient));
					return normalFormFromPolynomial(polynomialFromTerm(term));
				}

				// Not a perfect square: coefficient * sqrt(radicand)
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

				return normalFormFromPolynomial(polynomialFromTerm(term));
			}
		}

		// sqrt of expression - opaque with normalized args
		return normalizeOpaqueNode(canonicalNode);
	}

	// 3. Handle trigonometric functions
	if ((name === 'sin' || name === 'cos' || name === 'tan') && canonicalArgs.length === 1) {
		const argForm = normalizeNode(canonicalArgs[0]);

		// Check for argument = k*π
		const piCoeff = getPiCoefficient(argForm);
		if (piCoeff !== null) {
			const result =
				name === 'sin'
					? getSineValue(piCoeff)
					: name === 'cos'
						? getCosineValue(piCoeff)
						: getTangentValue(piCoeff);
			if (result !== null) return result;
		}

		// Also check for arg = 0 (sin(0) = 0, cos(0) = 1, tan(0) = 0)
		if (isIntegerValue(argForm, 0n)) {
			if (name === 'sin' || name === 'tan') return ZERO_NORMAL_FORM;
			if (name === 'cos') return ONE_NORMAL_FORM;
		}

		return normalizeOpaqueNode(canonicalNode);
	}

	// 4. Handle logarithms
	if ((name === 'ln' || name === 'log') && canonicalArgs.length === 1) {
		const arg = canonicalArgs[0];

		// ln(exp(x)) = x — check BEFORE normalizing to avoid unnecessary work
		if (name === 'ln' && arg.type === 'function' && arg.name === 'exp' && arg.args.length === 1) {
			return normalizeNode(arg.args[0]);
		}

		const argForm = normalizeNode(arg);

		// ln(1) = 0, log(1) = 0
		if (isIntegerValue(argForm, 1n)) return ZERO_NORMAL_FORM;

		// ln(e) = 1
		if (name === 'ln' && isEulerNumber(argForm)) return ONE_NORMAL_FORM;

		// === LN EXPANSION (only for ln, not log) ===
		if (name === 'ln') {
			// ln(n) where n is integer > 1 → expand via prime factorization
			const intVal = extractPositiveInteger(argForm);
			if (intVal !== null && intVal > 1n && intVal <= FACTORIZATION_LIMIT) {
				return expandLnInteger(intVal);
			}

			// ln(n/d) where n/d is a positive rational → expand as ln(n) - ln(d)
			const ratVal = extractPositiveRational(argForm);
			if (ratVal !== null && ratVal.n <= FACTORIZATION_LIMIT && ratVal.d <= FACTORIZATION_LIMIT) {
				return expandLnRational(ratVal.n, ratVal.d);
			}

			// ln(x^n) = n·ln(x) — but only if exponent != 1
			const powerInfo = extractSimplePower(argForm);
			if (powerInfo && !isOneRational(powerInfo.exponent)) {
				return expandLnPower(powerInfo);
			}

			// ln(a·b·c) = ln(a) + ln(b) + ln(c)
			const factors = extractProductFactors(argForm);
			if (factors.length > 1) {
				return expandLnProduct(factors);
			}

			// ln(a/b) = ln(a) - ln(b)
			if (!isOnePolynomial(argForm.denominator)) {
				return expandLnDivision(argForm);
			}
		}

		// log(10) = 1 (base 10)
		if (name === 'log' && isIntegerValue(argForm, 10n)) {
			// Check if base is 10 or not specified
			const base = canonicalNode.base;
			if (!base || (base.type === 'number' && base.value === '10')) {
				return ONE_NORMAL_FORM;
			}
		}

		// log_b(b) = 1
		if (name === 'log' && canonicalNode.base) {
			const baseForm = normalizeNode(canonicalNode.base);
			if (argForm.hash === baseForm.hash) return ONE_NORMAL_FORM;
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
			return normalizeNode(originalArg.args[0]);
		}

		const arg = canonicalArgs[0];
		const argForm = normalizeNode(arg);

		// exp(0) = 1
		if (isIntegerValue(argForm, 0n)) return ONE_NORMAL_FORM;

		// exp(1) = e
		if (isIntegerValue(argForm, 1n)) {
			return normalizeNode({ type: 'variable', name: 'e' });
		}

		// exp(linear combination of ln) = product of powers
		// exp(Σ aᵢ·ln(xᵢ)) = Π xᵢ^aᵢ
		const lnTerms = extractLinearCombinationOfLn(argForm);
		if (lnTerms !== null) {
			// All terms cancelled out: exp(0) = 1
			if (lnTerms.length === 0) {
				return ONE_NORMAL_FORM;
			}
			let result = ONE_NORMAL_FORM;
			for (const { base, coeff } of lnTerms) {
				const powerNode = buildPowerNode(base, coeff);
				const powerForm = normalizeNode(powerNode);
				result = mulNormalForms(result, powerForm);
			}
			return result;
		}

		return normalizeOpaqueNode(canonicalNode);
	}

	// 6. Other functions - opaque with normalized args
	return normalizeOpaqueNode(canonicalNode);
}

/**
 * Normalizes a node with a symbolic (non-integer) power.
 */
function normalizeSymbolicPower(base: MathNode, exponent: Rational): NormalForm {
	// Normalize the base first
	const baseForm = normalizeNode(base);

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
 */
function mulNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	const numerator = mulPolynomials(a.numerator, b.numerator);
	const denominator = mulPolynomials(a.denominator, b.denominator);

	return normalFormFromFraction(numerator, denominator);
}

/**
 * Divides two normal forms.
 *
 * (a/b) / (c/d) = ad / bc
 */
function divNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	// Division by zero check
	if (isZeroPolynomial(b.numerator)) {
		throw new Error('normalize: division by zero');
	}

	const numerator = mulPolynomials(a.numerator, b.denominator);
	const denominator = mulPolynomials(a.denominator, b.numerator);

	return normalFormFromFraction(numerator, denominator);
}

/**
 * Raises a normal form to a positive integer power.
 */
function powNormalForm(a: NormalForm, n: number): NormalForm {
	if (n === 0) {
		return ONE_NORMAL_FORM;
	}

	if (n === 1) {
		return a;
	}

	const numerator = powPolynomial(a.numerator, n);
	const denominator = powPolynomial(a.denominator, n);

	return normalFormFromFraction(numerator, denominator);
}
