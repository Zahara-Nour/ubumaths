/**
 * MathAST Normal Form - Structural Hash Functions
 *
 * Hash functions for all normal form types.
 * These hashes uniquely identify mathematical expressions up to equivalence.
 */

import type {
	AlgebraicTerm,
	AlgebraicCoefficient,
	SymbolicFactor,
	NormalTerm,
	NormalForm,
	SimplifiedRadical,
	Rational
} from './types';
import type { MathNode } from '../types';

// =============================================================================
// Primitive Hashes
// =============================================================================

/**
 * Creates a hash for a Rational number.
 *
 * @param r - A rational number
 * @returns A deterministic hash string
 */
export function hashRational(r: Rational): string {
	if (r.d === 1n) return r.n.toString();
	return `${r.n}/${r.d}`;
}

/**
 * Creates a hash for a SimplifiedRadical.
 *
 * @param r - A simplified radical
 * @returns A deterministic hash string
 */
export function hashRadical(r: SimplifiedRadical): string {
	return `R${r.index}:${r.radicand}`;
}

/**
 * Creates a hash for an array of radicals.
 *
 * @param radicals - Array of simplified radicals
 * @returns A deterministic hash string
 */
export function hashRadicalArray(radicals: readonly SimplifiedRadical[]): string {
	if (radicals.length === 0) return '';
	return radicals.map(hashRadical).join('*');
}

// =============================================================================
// MathNode Hash
// =============================================================================

/**
 * Creates a hash for a MathNode.
 *
 * This hash uniquely identifies the structure of a node.
 *
 * @param node - A MathNode
 * @returns A deterministic hash string
 */
export function hashMathNode(node: MathNode): string {
	switch (node.type) {
		case 'number':
			return `N(${node.value})`;

		case 'variable':
			return `V(${node.name})`;

		case 'greek':
			return `G(${node.letter})`;

		case 'symbol':
			return `S(${node.symbol})`;

		case 'hole':
			return `H(${node.index})`;

		case 'addition':
			return `+(${hashMathNode(node.left)},${hashMathNode(node.right)})`;

		case 'subtraction':
			return `-(${hashMathNode(node.left)},${hashMathNode(node.right)})`;

		case 'multiplication':
			return `*(${hashMathNode(node.left)},${hashMathNode(node.right)})`;

		case 'division':
			return `/(${hashMathNode(node.numerator)},${hashMathNode(node.denominator)})`;

		case 'opposite':
			return `~(${hashMathNode(node.operand)})`;

		case 'positive':
			return `+(${hashMathNode(node.operand)})`;

		case 'function': {
			const argsHash = node.args.map(hashMathNode).join(',');
			let hash = `F:${node.name}(${argsHash})`;
			if (node.power) hash += `^${hashMathNode(node.power)}`;
			if (node.base) hash += `_${hashMathNode(node.base)}`;
			return hash;
		}

		case 'delimiter':
			return `D(${hashMathNode(node.content)})`;

		case 'subscript':
			return `_(${hashMathNode(node.base)},${hashMathNode(node.subscript)})`;

		case 'superscript':
			return `^(${hashMathNode(node.base)},${hashMathNode(node.superscript)})`;

		case 'relation':
			return `R:${node.relation}(${hashMathNode(node.left)},${hashMathNode(node.right)})`;

		case 'unit':
			return `U(${hashMathNode(node.expression)})`;

		default:
			// Exhaustive check - should never reach
			return 'UNKNOWN';
	}
}

// =============================================================================
// Algebraic Hashes
// =============================================================================

/**
 * Creates a hash for an AlgebraicTerm.
 *
 * @param term - An algebraic term
 * @returns A deterministic hash string
 */
export function hashAlgebraicTerm(term: AlgebraicTerm): string {
	const rationalHash = hashRational(term.rational);
	const radicalHash = hashRadicalArray(term.radicals);

	if (radicalHash === '') {
		return rationalHash;
	}

	return `${rationalHash}*${radicalHash}`;
}

/**
 * Creates a hash for an AlgebraicCoefficient.
 *
 * @param coef - An algebraic coefficient
 * @returns A deterministic hash string
 */
export function hashAlgebraicCoefficient(coef: AlgebraicCoefficient): string {
	if (coef.terms.length === 0) return '0';
	if (coef.terms.length === 1) return hashAlgebraicTerm(coef.terms[0]);

	// Multiple terms: wrap in parentheses
	return `(${coef.terms.map(hashAlgebraicTerm).join('+')})`;
}

// =============================================================================
// Monomial Hashes
// =============================================================================

/**
 * Creates a hash for a SymbolicFactor.
 *
 * @param factor - A symbolic factor
 * @returns A deterministic hash string
 */
export function hashSymbolicFactor(factor: SymbolicFactor): string {
	const baseHash = hashMathNode(factor.base);
	const expHash = hashRational(factor.exponent);

	// Optimize for common case: exponent = 1
	if (factor.exponent.n === 1n && factor.exponent.d === 1n) {
		return baseHash;
	}

	return `${baseHash}^${expHash}`;
}

/**
 * Creates a hash for a monomial (array of symbolic factors).
 *
 * @param monomial - Array of symbolic factors
 * @returns A deterministic hash string
 */
export function hashMonomial(monomial: readonly SymbolicFactor[]): string {
	if (monomial.length === 0) return '1';
	return monomial.map(hashSymbolicFactor).join('*');
}

// =============================================================================
// Term and Polynomial Hashes
// =============================================================================

/**
 * Creates a hash for a NormalTerm.
 *
 * @param term - A normal term
 * @returns A deterministic hash string
 */
export function hashNormalTerm(term: NormalTerm): string {
	const coeffHash = hashAlgebraicCoefficient(term.coefficient);
	const monomialHash = hashMonomial(term.monomial);

	// Coefficient is 1 and we have monomial
	if (
		term.coefficient.terms.length === 1 &&
		term.coefficient.terms[0].radicals.length === 0 &&
		term.coefficient.terms[0].rational.n === 1n &&
		term.coefficient.terms[0].rational.d === 1n &&
		term.monomial.length > 0
	) {
		return monomialHash;
	}

	// No monomial
	if (term.monomial.length === 0) {
		return coeffHash;
	}

	return `${coeffHash}*${monomialHash}`;
}

/**
 * Creates a hash for a polynomial (array of normal terms).
 *
 * @param terms - Array of normal terms
 * @returns A deterministic hash string
 */
export function hashPolynomial(terms: readonly NormalTerm[]): string {
	if (terms.length === 0) return '0';
	if (terms.length === 1) return hashNormalTerm(terms[0]);

	return terms.map(hashNormalTerm).join('+');
}

/**
 * Creates a hash for a NormalForm (numerator/denominator).
 *
 * @param form - A normal form
 * @returns A deterministic hash string
 */
export function hashNormalForm(form: NormalForm): string {
	const numHash = hashPolynomial(form.numerator);
	const denHash = hashPolynomial(form.denominator);

	// Denominator is 1
	if (
		form.denominator.length === 1 &&
		form.denominator[0].monomial.length === 0 &&
		form.denominator[0].coefficient.terms.length === 1 &&
		form.denominator[0].coefficient.terms[0].radicals.length === 0 &&
		form.denominator[0].coefficient.terms[0].rational.n === 1n &&
		form.denominator[0].coefficient.terms[0].rational.d === 1n
	) {
		return numHash;
	}

	return `(${numHash})/(${denHash})`;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Creates a canonical hash that can be used for equality checking.
 *
 * Two mathematically equivalent expressions in normal form
 * will produce identical hashes.
 *
 * @param form - A normal form
 * @returns A deterministic canonical hash
 */
export function canonicalHash(form: NormalForm): string {
	return hashNormalForm(form);
}

/**
 * Checks if two normal forms are equivalent by comparing hashes.
 *
 * @param a - First normal form
 * @param b - Second normal form
 * @returns true if forms are mathematically equivalent
 */
export function normalFormsEquivalent(a: NormalForm, b: NormalForm): boolean {
	return hashNormalForm(a) === hashNormalForm(b);
}
