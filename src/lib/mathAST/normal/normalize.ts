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
	isOnePolynomial
} from './polynomial';
import { ZERO_TERM } from './term';
import { EMPTY_MONOMIAL, symbolicFactor } from './monomial';
import { rational, fromInteger, ONE } from './rational';
import { simplifyRadical } from './radical';
import { simplify } from './rules/index.js';

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

	// TODO: Reduce common factors between numerator and denominator

	const form: NormalForm = {
		numerator,
		denominator,
		hash: '' // Will be computed below
	};

	// Compute hash
	return {
		...form,
		hash: hashNormalForm(form)
	};
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

		default:
			return normalizeOpaqueNode(node);
	}
}

/**
 * Normalizes a function call.
 */
function normalizeFunction(node: MathNode & { type: 'function' }): NormalForm {
	const { name, args } = node;

	// Handle sqrt specially
	if (name === 'sqrt' && args.length === 1) {
		const arg = args[0];

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

		// sqrt of a variable or expression - treat as symbolic
		// TODO: If arg normalizes to a simple polynomial, we might be able to simplify
		// For now, treat sqrt(expr) as opaque
		return normalizeOpaqueNode(node);
	}

	// Other functions are treated as opaque
	return normalizeOpaqueNode(node);
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
